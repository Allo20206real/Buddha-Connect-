// Buddha Connect: push notifications for new messages and incoming calls.
//
// Deploy in Supabase → Edge Functions → "Deploy a new function" → "Via Editor":
//   name it `push`, paste this whole file, and turn OFF "Enforce JWT verification"
//   (the database proves who it is with a secret instead; see setup.sql).
//
// The first time someone turns on notifications, this function creates its own
// keys and tells the database where to find it. No secrets to copy by hand.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Config = { vapid_public: string; vapid_private: string; secret: string; function_url: string };

let cached: Config | null = null;

// Keys are made once and kept in the database (in a table only this function can read).
async function config(): Promise<Config> {
  if (cached) return cached;
  const { data, error } = await db.from('push_config').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  const functionUrl = `${SUPABASE_URL}/functions/v1/push`;
  if (data?.vapid_public && data?.vapid_private && data?.secret && data?.function_url === functionUrl) {
    cached = data as Config;
    return cached;
  }
  const keys = data?.vapid_public ? { publicKey: data.vapid_public, privateKey: data.vapid_private } : webpush.generateVAPIDKeys();
  const row = {
    id: 1,
    vapid_public: keys.publicKey,
    vapid_private: keys.privateKey,
    secret: data?.secret || crypto.randomUUID() + crypto.randomUUID(),
    function_url: functionUrl,
  };
  const { error: upsertError } = await db.from('push_config').upsert(row);
  if (upsertError) throw upsertError;
  cached = row;
  return row;
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

async function send(cfg: Config, userIds: string[], payload: Record<string, unknown>, urgent: boolean) {
  if (!userIds.length) return 0;
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', userIds);
  webpush.setVapidDetails('mailto:hello@buddhaconnect.app', cfg.vapid_public, cfg.vapid_private);
  let sent = 0;
  await Promise.all(
    ((subs || []) as Sub[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: urgent ? 60 : 60 * 60 * 24, urgency: urgent ? 'high' : 'normal', topic: String(payload.tag || '').slice(0, 32) || undefined },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // The phone unsubscribed or the app was removed: forget this subscription.
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
        else console.error('push failed', code, (err as Error).message);
      }
    }),
  );
  return sent;
}

const nameOf = (p?: { display_name?: string } | null) => p?.display_name || 'Someone';

async function forMessage(cfg: Config, id: string) {
  const { data: m } = await db.from('messages').select('id, chat_id, sender_id, type, text').eq('id', id).maybeSingle();
  if (!m || m.type === 'system') return 0;
  const [{ data: chat }, { data: members }, { data: sender }] = await Promise.all([
    db.from('chats').select('id, type, name, icon, settings').eq('id', m.chat_id).single(),
    db.from('chat_members').select('user_id, muted').eq('chat_id', m.chat_id),
    db.from('profiles').select('display_name').eq('id', m.sender_id).maybeSingle(),
  ]);
  if (!chat) return 0;
  const to = (members || []).filter((r) => r.user_id !== m.sender_id && !r.muted).map((r) => r.user_id);
  const who = chat.settings?.nicknames?.[m.sender_id] || nameOf(sender);
  const text = m.type === 'sticker' ? 'sent a sticker ✨' : String(m.text || '').slice(0, 180);
  return send(
    cfg,
    to,
    {
      title: chat.type === 'group' ? `${chat.icon || '🪷'} ${chat.name}` : who,
      body: chat.type === 'group' ? `${who}: ${text}` : text,
      tag: `chat-${chat.id}`,
      url: `#/chat/${chat.id}`,
    },
    false,
  );
}

async function forCall(cfg: Config, id: string) {
  const { data: c } = await db.from('calls').select('*').eq('id', id).maybeSingle();
  if (!c || c.status !== 'ringing') return 0;
  const { data: caller } = await db.from('profiles').select('display_name').eq('id', c.caller_id).maybeSingle();
  return send(
    cfg,
    [c.callee_id],
    {
      title: `${c.video ? '📹' : '📞'} ${nameOf(caller)} is calling`,
      body: `${c.video ? 'Video' : 'Voice'} call. Tap to answer`,
      tag: `call-${c.id}`,
      url: `#/chat/${c.chat_id}`,
      call: true,
    },
    true,
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const cfg = await config();
    const body = await req.json().catch(() => ({}));
    // The app asks for the public key when someone turns notifications on.
    if (body.action === 'vapid') return json({ publicKey: cfg.vapid_public });
    // Everything else comes from the database and must carry the shared secret.
    if (req.headers.get('x-push-secret') !== cfg.secret) return json({ error: 'unauthorized' }, 401);
    if (body.type === 'message') return json({ sent: await forMessage(cfg, body.id) });
    if (body.type === 'call') return json({ sent: await forCall(cfg, body.id) });
    return json({ error: 'unknown request' }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
