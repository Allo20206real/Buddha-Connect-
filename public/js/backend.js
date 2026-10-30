'use strict';

// Everything that talks to Supabase lives here: accounts, friends, chats,
// messages, stickers and live updates. app.js only uses window.Backend.
(() => {
  const cfg = window.BC_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const sb = configured
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bc.auth' },
      })
    : null;

  // Usernames are turned into a made-up email address behind the scenes, so
  // people only ever deal with a username and password.
  const EMAIL_DOMAIN = 'users.buddhaconnect.app';
  const emailFor = (username) => `${username.toLowerCase()}@${EMAIL_DOMAIN}`;
  const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
  const LABELS = { 0: 'off', 300: '5 minutes', 3600: '1 hour', 86400: '24 hours', 604800: '7 days' };

  let me = null; // my user id
  let meCache = null;
  const online = new Set();
  let channels = [];
  let typingChannel = null;
  let heartbeat = null;
  const listeners = {};

  const on = (event, fn) => (listeners[event] ||= []).push(fn);
  const emit = (event, data) => (listeners[event] || []).forEach((fn) => fn(data));
  const ms = (t) => (t ? new Date(t).getTime() : null);

  function friendly(error) {
    const msg = error?.message || String(error);
    if (/invalid login credentials/i.test(msg)) return new Error('Wrong username or password.');
    if (/already registered|already exists|profiles_username_key|database error saving new user/i.test(msg)) {
      return new Error('That username is taken.');
    }
    if (/email not confirmed/i.test(msg)) {
      return new Error('Almost there: in Supabase, turn off “Confirm email” (Authentication → Sign In / Providers → Email), then try again.');
    }
    if (/failed to fetch|networkerror|load failed/i.test(msg)) return new Error('Can’t reach the server. Check your connection.');
    if (/rate limit/i.test(msg)) return new Error('Too many tries. Take a breath and try again in a minute.');
    return new Error(msg);
  }

  function check({ data, error }) {
    if (error) throw friendly(error);
    return data;
  }

  // ---- Shapes the UI understands ------------------------------------------

  function normUser(p) {
    if (!p) return null;
    return {
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatar: { emoji: p.avatar_emoji, color: p.avatar_color },
      bio: p.bio || '',
      lastSeen: ms(p.last_seen),
      online: online.has(p.id),
    };
  }

  function normMsg(r) {
    return {
      id: r.id,
      chatId: r.chat_id,
      from: r.sender_id,
      type: r.type,
      text: r.text ?? undefined,
      sticker: r.sticker ?? undefined,
      replyTo: r.reply_to || undefined,
      reactions: r.reactions || {},
      clientId: r.client_id || undefined,
      createdAt: ms(r.created_at),
      expiresAt: ms(r.expires_at),
    };
  }

  function normChat(c) {
    const members = (c.members || []).filter(Boolean);
    return {
      id: c.id,
      type: c.type,
      name: c.name || '',
      icon: c.icon || '',
      createdBy: c.created_by,
      members: members.map(normUser),
      settings: { nicknames: {}, ...c.settings },
      lastRead: Object.fromEntries(members.map((m) => [m.id, ms(m.last_read)])),
      lastMessage: c.last_message ? normMsg(c.last_message) : null,
      unread: Number(c.unread) || 0,
      pinned: !!c.pinned,
      muted: !!c.muted,
      createdAt: ms(c.created_at),
      updatedAt: ms(c.updated_at),
    };
  }

  // ---- Account -------------------------------------------------------------

  async function loadMe() {
    const [profile, invite, friends, stickers] = await Promise.all([
      sb.from('profiles').select('*').eq('id', me).single(),
      sb.from('invite_codes').select('code').eq('user_id', me).maybeSingle(),
      sb.from('friendships').select('friend_id').eq('user_id', me),
      sb.from('user_stickers').select('path').eq('user_id', me).order('created_at', { ascending: false }),
    ]);
    const p = check(profile);
    meCache = {
      ...normUser(p),
      online: true,
      inviteCode: check(invite)?.code || '',
      friends: check(friends).map((f) => f.friend_id),
      stickers: check(stickers).map((s) => s.path),
      prefs: p.prefs || {},
    };
    return meCache;
  }

  async function afterLogin(user) {
    me = user.id;
    const profile = await loadMe();
    startLive();
    return profile;
  }

  async function restore() {
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    try {
      return await afterLogin(data.session.user);
    } catch (err) {
      // The account exists in Auth but its profile is gone (e.g. the database was reset).
      if (/0 rows|no rows|PGRST116/i.test(err.message)) {
        await sb.auth.signOut();
        return null;
      }
      throw err;
    }
  }

  async function register({ username, password, displayName }) {
    username = String(username || '').trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      throw new Error('Usernames are 3–20 characters: letters, numbers, dots or underscores.');
    }
    if (String(password || '').length < 6) throw new Error('Password must be at least 6 characters.');
    if (!check(await sb.rpc('username_available', { name: username }))) throw new Error('That username is taken.');
    const data = check(
      await sb.auth.signUp({
        email: emailFor(username),
        password,
        options: { data: { username, display_name: String(displayName || '').trim() || username } },
      }),
    );
    if (data.session) return afterLogin(data.user);
    // Supabase is set to confirm emails; try logging in anyway (gives a helpful error if not).
    return login({ username, password });
  }

  async function login({ username, password }) {
    username = String(username || '').trim().toLowerCase();
    const data = check(await sb.auth.signInWithPassword({ email: emailFor(username), password }));
    return afterLogin(data.user);
  }

  async function logout() {
    stopLive();
    me = null;
    meCache = null;
    await sb.auth.signOut();
  }

  async function updateMe({ displayName, bio, avatar, prefs, password, newPassword }) {
    if (newPassword !== undefined) {
      if (String(newPassword).length < 6) throw new Error('New password must be at least 6 characters.');
      const ok = await sb.auth.signInWithPassword({ email: emailFor(meCache.username), password: String(password || '') });
      if (ok.error) throw new Error('Current password is wrong.');
      check(await sb.auth.updateUser({ password: String(newPassword) }));
    }
    const patch = {};
    if (typeof displayName === 'string') patch.display_name = displayName.trim().slice(0, 40) || meCache.username;
    if (typeof bio === 'string') patch.bio = bio.trim().slice(0, 140);
    if (avatar?.emoji) patch.avatar_emoji = avatar.emoji;
    if (/^#[0-9a-f]{6}$/i.test(avatar?.color || '')) patch.avatar_color = avatar.color;
    if (prefs) patch.prefs = { ...meCache.prefs, ...prefs };
    if (Object.keys(patch).length) check(await sb.from('profiles').update(patch).eq('id', me));
    return loadMe();
  }

  async function resetInvite() {
    check(await sb.rpc('reset_invite_code'));
    return loadMe();
  }

  // ---- Friends -------------------------------------------------------------

  async function lookupInvite(code) {
    const r = check(await sb.rpc('lookup_invite', { invite: code }));
    return { ...r, user: normUser(r.user) };
  }

  async function addFriend(code) {
    const r = check(await sb.rpc('add_friend', { invite: code }));
    return { ...r, friend: normUser(r.friend) };
  }

  async function friends() {
    const ids = check(await sb.from('friendships').select('friend_id').eq('user_id', me)).map((f) => f.friend_id);
    if (!ids.length) return [];
    return check(await sb.from('profiles').select('*').in('id', ids)).map(normUser);
  }

  async function removeFriend(id) {
    check(await sb.rpc('remove_friend', { other: id }));
  }

  // ---- Chats ---------------------------------------------------------------

  async function chats(onlyChat = null) {
    return check(await sb.rpc('my_chats', { only_chat: onlyChat })).map(normChat);
  }

  async function chat(id) {
    return (await chats(id))[0] || null;
  }

  async function createChat({ members, group, name, icon }) {
    const id = check(await sb.rpc('create_chat', { member_ids: members, is_group: !!group, chat_name: name || '', chat_icon: icon || '' }));
    return chat(id);
  }

  async function messages(chatId, before) {
    let q = sb.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: false }).limit(61);
    if (before) q = q.lt('created_at', new Date(before).toISOString());
    const rows = check(await q);
    return { messages: rows.slice(0, 60).reverse().map(normMsg), hasMore: rows.length > 60 };
  }

  const THEMES = ['lotus', 'sunset', 'ocean', 'forest', 'midnight', 'candy', 'aurora', 'mono', 'ember', 'sakura'];
  const WALLPAPERS = ['none', 'dots', 'paws', 'lotus', 'hearts', 'stars', 'waves', 'grid'];

  async function updateChat(chatId, b) {
    if (typeof b.pinned === 'boolean' || typeof b.muted === 'boolean') {
      const patch = {};
      if (typeof b.pinned === 'boolean') patch.pinned = b.pinned;
      if (typeof b.muted === 'boolean') patch.muted = b.muted;
      check(await sb.from('chat_members').update(patch).eq('chat_id', chatId).eq('user_id', me));
    }

    const row = check(await sb.from('chats').select('type, name, icon, settings').eq('id', chatId).single());
    // Work on a deep copy so the comparison below sees every change (nicknames is nested).
    const original = JSON.stringify({ nicknames: {}, ...row.settings });
    const s = JSON.parse(original);
    const patch = {};
    const changes = [];

    if (THEMES.includes(b.theme) && b.theme !== s.theme) {
      s.theme = b.theme;
      changes.push(`changed the chat theme to ${b.theme}`);
    }
    if (WALLPAPERS.includes(b.wallpaper) && b.wallpaper !== s.wallpaper) {
      s.wallpaper = b.wallpaper;
      changes.push('changed the wallpaper');
    }
    if (/^#[0-9a-f]{6}$/i.test(b.bubble || '') && b.bubble !== s.bubble) {
      s.bubble = b.bubble;
      changes.push('changed the bubble colour');
    }
    if (typeof b.quickReaction === 'string' && b.quickReaction.trim() && b.quickReaction !== s.quickReaction) {
      s.quickReaction = b.quickReaction.trim().slice(0, 16);
      changes.push(`set the quick reaction to ${s.quickReaction}`);
    }
    if (['small', 'medium', 'large'].includes(b.fontSize)) s.fontSize = b.fontSize;
    if (b.disappear !== undefined && LABELS[b.disappear] !== undefined && Number(b.disappear) !== s.disappear) {
      s.disappear = Number(b.disappear);
      changes.push(s.disappear ? `turned on disappearing messages (${LABELS[s.disappear]}) 👻` : 'turned off disappearing messages');
    }
    if (b.nickname?.userId) {
      const nick = String(b.nickname.name || '').trim().slice(0, 40);
      const target = b.nickname.userId;
      let who = 'themselves';
      if (target !== me) {
        const p = check(await sb.from('profiles').select('display_name').eq('id', target).maybeSingle());
        who = p?.display_name || 'someone';
      }
      if (nick) s.nicknames[target] = nick;
      else delete s.nicknames[target];
      changes.push(nick ? `set the nickname for ${who} to “${nick}”` : `cleared the nickname for ${who}`);
    }
    if (row.type === 'group') {
      const newName = typeof b.name === 'string' ? b.name.trim().slice(0, 40) : '';
      if (newName && newName !== row.name) {
        patch.name = newName;
        changes.push(`renamed the group to “${newName}”`);
      }
      const newIcon = typeof b.icon === 'string' ? b.icon.trim().slice(0, 16) : '';
      if (newIcon && newIcon !== row.icon) {
        patch.icon = newIcon;
        changes.push(`changed the group icon to ${newIcon}`);
      }
    }
    if (JSON.stringify(s) !== original) patch.settings = s;
    if (Object.keys(patch).length) check(await sb.from('chats').update(patch).eq('id', chatId));
    for (const c of changes) check(await sb.rpc('post_system_message', { cid: chatId, body: c }));
    return chat(chatId);
  }

  async function addMembers(chatId, members) {
    check(await sb.rpc('add_members', { cid: chatId, member_ids: members }));
    return chat(chatId);
  }

  async function leave(chatId) {
    check(await sb.rpc('leave_chat', { cid: chatId }));
  }

  async function clear(chatId) {
    check(await sb.rpc('clear_chat', { cid: chatId }));
    emit('chat:cleared', { id: chatId });
  }

  // ---- Messages ------------------------------------------------------------

  async function send({ chatId, type, text, sticker, replyTo, clientId }) {
    const row = check(
      await sb
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: me,
          type,
          text: type === 'text' ? text : null,
          sticker: type === 'sticker' ? sticker : null,
          reply_to: replyTo || null,
          client_id: clientId,
        })
        .select()
        .single(),
    );
    return normMsg(row);
  }

  async function react(messageId, emoji) {
    check(await sb.rpc('toggle_reaction', { mid: messageId, emoji }));
  }

  async function unsend(messageId) {
    check(await sb.from('messages').delete().eq('id', messageId));
  }

  async function read(chatId) {
    check(await sb.rpc('mark_read', { cid: chatId }));
  }

  function typing(chatId, isTyping) {
    typingChannel?.send({ type: 'broadcast', event: 'typing', payload: { chatId, userId: me, typing: !!isTyping } });
  }

  // ---- Stickers ------------------------------------------------------------

  async function packs() {
    let files = [];
    try {
      const res = await fetch('stickers/cats/index.json', { cache: 'no-cache' });
      if (res.ok) files = await res.json();
    } catch {
      files = [];
    }
    const pretty = (f) =>
      f
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    return [
      {
        id: 'cats',
        name: 'My Cats',
        icon: '🐈',
        stickers: files.map((f) => ({ key: `p:${f}`, src: `stickers/cats/${encodeURIComponent(f)}`, name: pretty(f) })),
      },
    ];
  }

  async function uploadSticker(dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    if (blob.size > 1_500_000) throw new Error('That sticker is too big (max 1.5 MB).');
    const ext = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[blob.type];
    if (!ext) throw new Error('Stickers must be PNG, WebP or JPEG images.');
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const path = `${me}/${id}.${ext}`;
    check(await sb.storage.from('stickers').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' }));
    check(await sb.from('user_stickers').insert({ user_id: me, path }));
    return { sticker: `c:${path}`, user: await loadMe() };
  }

  async function saveSticker(key) {
    const path = key.slice(2);
    check(await sb.from('user_stickers').upsert({ user_id: me, path }, { ignoreDuplicates: true }));
    return loadMe();
  }

  async function deleteSticker(path) {
    check(await sb.from('user_stickers').delete().eq('user_id', me).eq('path', path));
    return loadMe();
  }

  function stickerUrl(path) {
    return `${cfg.supabaseUrl}/storage/v1/object/public/stickers/${path.split('/').map(encodeURIComponent).join('/')}`;
  }

  // ---- Live updates --------------------------------------------------------

  let connected = false;
  function setConnected(v) {
    if (v === connected) return;
    connected = v;
    emit(v ? 'connect' : 'disconnect');
  }

  function startLive() {
    stopLive();
    const db = sb.channel('db-changes');
    const table = (name, fn) => db.on('postgres_changes', { event: '*', schema: 'public', table: name }, fn);

    table('messages', ({ eventType, new: row, old }) => {
      if (eventType === 'INSERT') emit('message', normMsg(row));
      else if (eventType === 'UPDATE') emit('message:update', normMsg(row));
      else if (eventType === 'DELETE') emit('message:delete', { id: old.id, chatId: old.chat_id });
    });
    table('chats', ({ eventType, new: row, old }) => {
      if (eventType === 'UPDATE') {
        emit('chat:patch', { id: row.id, name: row.name, icon: row.icon, settings: { nicknames: {}, ...row.settings }, updatedAt: ms(row.updated_at) });
      } else if (eventType === 'DELETE') emit('chat:remove', { id: old.id });
    });
    table('chat_members', async ({ eventType, new: row, old }) => {
      const r = eventType === 'DELETE' ? old : row;
      if (!r?.chat_id) return;
      if (eventType === 'UPDATE') {
        if (r.user_id === me) emit('chat:patch', { id: r.chat_id, pinned: r.pinned, muted: r.muted });
        else emit('read', { chatId: r.chat_id, userId: r.user_id, ts: ms(r.last_read) });
        return;
      }
      if (eventType === 'DELETE' && r.user_id === me) return emit('chat:remove', { id: r.chat_id });
      // Someone joined or left: refresh that chat.
      try {
        const c = await chat(r.chat_id);
        if (c) emit('chat', c);
      } catch {
        /* not ours */
      }
    });
    table('friendships', async ({ eventType, new: row }) => {
      emit('friends:changed', {});
      if (eventType === 'INSERT' && row.user_id === me && row.initiated_by && row.initiated_by !== me) {
        const p = check(await sb.from('profiles').select('*').eq('id', row.initiated_by).maybeSingle());
        if (p) emit('friend:new', normUser(p));
      }
    });
    table('profiles', ({ eventType, new: row }) => {
      if (eventType === 'UPDATE' && row.id !== me) emit('user', normUser(row));
    });
    db.subscribe((status) => {
      if (status === 'SUBSCRIBED') setConnected(true);
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setConnected(false);
    });

    typingChannel = sb.channel('typing', { config: { broadcast: { self: false } } });
    typingChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload?.userId && payload.userId !== me) emit('typing', payload);
    });
    typingChannel.subscribe();

    const presence = sb.channel('online', { config: { presence: { key: me } } });
    presence.on('presence', { event: 'sync' }, () => {
      const now = new Set(Object.keys(presence.presenceState()));
      for (const id of now) if (!online.has(id) && id !== me) emit('presence', { userId: id, online: true });
      for (const id of online) if (!now.has(id) && id !== me) emit('presence', { userId: id, online: false, lastSeen: Date.now() });
      online.clear();
      now.forEach((id) => online.add(id));
    });
    presence.subscribe((status) => {
      if (status === 'SUBSCRIBED') presence.track({ at: Date.now() });
    });

    channels = [db, typingChannel, presence];
    const beat = () => me && sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', me).then(() => {});
    beat();
    heartbeat = setInterval(beat, 60_000);
    window.addEventListener('pagehide', beat);
  }

  function stopLive() {
    clearInterval(heartbeat);
    channels.forEach((c) => sb.removeChannel(c));
    channels = [];
    typingChannel = null;
    online.clear();
    connected = false;
  }

  if (sb) {
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && me) {
        me = null;
        stopLive();
        emit('signedout');
      }
    });
  }

  window.Backend = {
    configured,
    on,
    restore,
    register,
    login,
    logout,
    updateMe,
    resetInvite,
    lookupInvite,
    addFriend,
    friends,
    removeFriend,
    chats,
    chat,
    createChat,
    messages,
    updateChat,
    addMembers,
    leave,
    clear,
    send,
    react,
    unsend,
    read,
    typing,
    packs,
    uploadSticker,
    saveSticker,
    deleteSticker,
    stickerUrl,
    isOnline: (id) => online.has(id),
  };
})();
