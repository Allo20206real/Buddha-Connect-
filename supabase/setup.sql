-- =============================================================================
-- Buddha Connect: database setup for Supabase
--
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- It is safe to run again later (for example after an update).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_emoji text not null default '🐱' check (char_length(avatar_emoji) between 1 and 16),
  avatar_color text not null default '#ff7a3d' check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  bio text not null default '' check (char_length(bio) <= 140),
  prefs jsonb not null default '{}',
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

-- Profile pictures live in the "avatars" storage bucket; this is the file's path there.
alter table public.profiles add column if not exists avatar_path text
  check (avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(png|webp|jpg)$');

-- Kept apart from profiles so people can only ever see their own code.
create table if not exists public.invite_codes (
  user_id uuid primary key references public.profiles on delete cascade,
  code text not null unique
);

-- One row per direction: (me → friend) and (friend → me).
create table if not exists public.friendships (
  user_id uuid not null references public.profiles on delete cascade,
  friend_id uuid not null references public.profiles on delete cascade,
  initiated_by uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  name text not null default '' check (char_length(name) <= 40),
  icon text not null default '' check (char_length(icon) <= 16),
  created_by uuid references public.profiles on delete set null,
  settings jsonb not null default
    '{"theme":"lotus","wallpaper":"dots","bubble":"#ff7a3d","quickReaction":"🙏","disappear":0,"fontSize":"medium","nicknames":{}}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  chat_id uuid not null references public.chats on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  last_read timestamptz not null default now(),
  pinned boolean not null default false,
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index if not exists chat_members_user on public.chat_members (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats on delete cascade,
  sender_id uuid references public.profiles on delete set null,
  type text not null check (type in ('text', 'sticker', 'system')),
  text text check (char_length(text) <= 2000),
  sticker text check (sticker ~ '^(b:[A-Za-z0-9_-]{1,40}|p:[A-Za-z0-9_ .()-]{1,120}\.(png|jpe?g|webp|gif|svg)|c:[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(png|webp|jpg))$'),
  reply_to jsonb,
  reactions jsonb not null default '{}',
  client_id text check (char_length(client_id) <= 40),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint message_has_content check (
    (type = 'sticker' and sticker is not null) or
    (type <> 'sticker' and text is not null and char_length(btrim(text)) > 0)
  )
);
create index if not exists messages_chat_created on public.messages (chat_id, created_at desc);

-- Stickers people made or saved. The images live in the "stickers" storage bucket.
create table if not exists public.user_stickers (
  user_id uuid not null references public.profiles on delete cascade,
  path text not null check (path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,64}\.(png|webp|jpg)$'),
  created_at timestamptz not null default now(),
  primary key (user_id, path)
);

-- Voice and video calls. The call itself goes directly between the two phones;
-- this table only tracks who is calling whom (and lets the other phone ring).
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats on delete cascade,
  caller_id uuid not null references public.profiles on delete cascade,
  callee_id uuid not null references public.profiles on delete cascade,
  video boolean not null default false,
  status text not null default 'ringing' check (status in ('ringing', 'active', 'declined', 'missed', 'ended', 'busy')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);
create index if not exists calls_callee on public.calls (callee_id, status);
create index if not exists calls_caller on public.calls (caller_id, status);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_member(c uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from chat_members where chat_id = c and user_id = auth.uid());
$$;

create or replace function public.profile_json(uid uuid) returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object('id', id, 'username', username, 'display_name', display_name,
    'avatar_emoji', avatar_emoji, 'avatar_color', avatar_color, 'avatar_path', avatar_path,
    'bio', bio, 'last_seen', last_seen)
  from profiles where id = uid;
$$;

create or replace function public.display_name_of(uid uuid) returns text
language sql security definer set search_path = public stable as $$
  select coalesce((select display_name from profiles where id = uid), 'Someone');
$$;

create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    select string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '') into c
    from generate_series(1, 8);
    exit when not exists (select 1 from invite_codes where code = c);
  end loop;
  return c;
end $$;

create or replace function public.require_user() returns uuid
language plpgsql stable as $$
begin
  if auth.uid() is null then
    raise exception 'Please log in';
  end if;
  return auth.uid();
end $$;

create or replace function public.add_system_message(c uuid, body text) returns void
language sql security definer set search_path = public as $$
  insert into messages (chat_id, sender_id, type, text) values (c, auth.uid(), 'system', body);
$$;
revoke execute on function public.add_system_message(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- New accounts get a profile and a friend code automatically
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uname text := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  dname text := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), uname), 40);
  colors constant text[] := array['#ff7a3d','#ffb703','#8338ec','#3a86ff','#06d6a0','#ef476f','#118ab2','#f15bb5'];
begin
  -- Everyone starts as a cat 🐱 (in a random colour) until they pick an emoji or a photo.
  insert into profiles (id, username, display_name, avatar_emoji, avatar_color)
  values (new.id, uname, dname, '🐱', colors[1 + floor(random() * array_length(colors, 1))::int]);
  insert into invite_codes (user_id, code) values (new.id, new_invite_code());
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Messages: timestamps, disappearing messages, unread tracking
-- ---------------------------------------------------------------------------

create or replace function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  d int;
begin
  new.created_at := clock_timestamp();
  new.reactions := '{}';
  select coalesce((settings ->> 'disappear')::int, 0) into d from chats where id = new.chat_id;
  if d > 0 and new.type <> 'system' then
    new.expires_at := new.created_at + make_interval(secs => d);
  else
    new.expires_at := null;
  end if;
  -- Tidy up messages in this chat that have already disappeared.
  delete from messages where chat_id = new.chat_id and expires_at < now();
  return new;
end $$;

create or replace function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update chats set updated_at = new.created_at where id = new.chat_id;
  if new.type <> 'system' then
    update chat_members set last_read = new.created_at
    where chat_id = new.chat_id and user_id = new.sender_id;
  end if;
  return null;
end $$;

drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.messages_before_insert();
drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

-- ---------------------------------------------------------------------------
-- App functions (called from the browser)
-- ---------------------------------------------------------------------------

create or replace function public.username_available(name text) returns boolean
language sql security definer set search_path = public stable as $$
  select not exists (select 1 from profiles where username = lower(btrim(name)));
$$;

create or replace function public.lookup_invite(invite text) returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare
  target uuid;
begin
  perform require_user();
  select user_id into target from invite_codes where code = upper(btrim(invite));
  if target is null then
    raise exception 'That invite link is not valid (it may have been reset).';
  end if;
  return jsonb_build_object(
    'user', profile_json(target),
    'isSelf', target = auth.uid(),
    'alreadyFriends', exists (select 1 from friendships where user_id = auth.uid() and friend_id = target));
end $$;

create or replace function public.find_direct_chat(a uuid, b uuid) returns uuid
language sql security definer set search_path = public stable as $$
  select c.id from chats c
  where c.type = 'direct'
    and exists (select 1 from chat_members m where m.chat_id = c.id and m.user_id = a)
    and exists (select 1 from chat_members m where m.chat_id = c.id and m.user_id = b)
  limit 1;
$$;
revoke execute on function public.find_direct_chat(uuid, uuid) from public, anon, authenticated;

create or replace function public.add_friend(invite text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := require_user();
  target uuid;
  was boolean;
  cid uuid;
begin
  select user_id into target from invite_codes where code = upper(btrim(invite));
  if target is null then
    raise exception 'No one has that friend code.';
  end if;
  if target = me then
    raise exception 'That''s your own code! Share it with a friend instead.';
  end if;
  was := exists (select 1 from friendships where user_id = me and friend_id = target);
  insert into friendships (user_id, friend_id, initiated_by)
  values (me, target, me), (target, me, me)
  on conflict do nothing;

  cid := find_direct_chat(me, target);
  if cid is null then
    insert into chats (type, created_by) values ('direct', me) returning id into cid;
    insert into chat_members (chat_id, user_id) values (cid, me), (cid, target);
    perform add_system_message(cid, display_name_of(me) || ' and ' || display_name_of(target) || ' are now friends 🪷');
  end if;
  return jsonb_build_object('friend', profile_json(target), 'chatId', cid, 'alreadyFriends', was);
end $$;

create or replace function public.remove_friend(other uuid) returns void
language sql security definer set search_path = public as $$
  delete from friendships
  where (user_id = auth.uid() and friend_id = other) or (user_id = other and friend_id = auth.uid());
$$;

create or replace function public.reset_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  c text := new_invite_code();
begin
  update invite_codes set code = c where user_id = require_user();
  return c;
end $$;

create or replace function public.create_chat(member_ids uuid[], is_group boolean, chat_name text, chat_icon text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := require_user();
  others uuid[];
  cid uuid;
begin
  select coalesce(array_agg(distinct m), '{}') into others from unnest(member_ids) m where m <> me;
  if cardinality(others) = 0 then
    raise exception 'Pick at least one friend.';
  end if;
  if exists (select 1 from unnest(others) o
             where not exists (select 1 from friendships f where f.user_id = me and f.friend_id = o)) then
    raise exception 'You can only start chats with friends.';
  end if;
  if cardinality(others) + 1 > 32 then
    raise exception 'Groups can have up to 32 people.';
  end if;

  if cardinality(others) = 1 and not coalesce(is_group, false) then
    cid := find_direct_chat(me, others[1]);
    if cid is null then
      insert into chats (type, created_by) values ('direct', me) returning id into cid;
      insert into chat_members (chat_id, user_id) values (cid, me), (cid, others[1]);
    end if;
    return cid;
  end if;

  insert into chats (type, name, icon, created_by)
  values ('group', coalesce(nullif(left(btrim(chat_name), 40), ''), 'New group'),
          coalesce(nullif(left(btrim(chat_icon), 16), ''), '🪷'), me)
  returning id into cid;
  insert into chat_members (chat_id, user_id) select cid, u from unnest(array_append(others, me)) u;
  perform add_system_message(cid, display_name_of(me) || ' created the group “' || (select name from chats where id = cid) || '”');
  return cid;
end $$;

create or replace function public.add_members(cid uuid, member_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := require_user();
  adding uuid[];
begin
  if not is_member(cid) then raise exception 'Chat not found'; end if;
  if (select type from chats where id = cid) <> 'group' then
    raise exception 'You can only add people to groups.';
  end if;
  select coalesce(array_agg(distinct m), '{}') into adding from unnest(member_ids) m
  where exists (select 1 from friendships f where f.user_id = me and f.friend_id = m)
    and not exists (select 1 from chat_members cm where cm.chat_id = cid and cm.user_id = m);
  if cardinality(adding) = 0 then
    raise exception 'Pick friends who are not in the group yet.';
  end if;
  if (select count(*) from chat_members where chat_id = cid) + cardinality(adding) > 32 then
    raise exception 'That group is full.';
  end if;
  insert into chat_members (chat_id, user_id) select cid, u from unnest(adding) u;
  perform add_system_message(cid, display_name_of(me) || ' added ' ||
    (select string_agg(display_name_of(u), ', ') from unnest(adding) u));
end $$;

create or replace function public.leave_chat(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := require_user();
begin
  if not is_member(cid) then raise exception 'Chat not found'; end if;
  if (select type from chats where id = cid) <> 'group' then
    raise exception 'You can only leave groups.';
  end if;
  delete from chat_members where chat_id = cid and user_id = me;
  if exists (select 1 from chat_members where chat_id = cid) then
    perform add_system_message(cid, display_name_of(me) || ' left the group');
  else
    delete from chats where id = cid;
  end if;
end $$;

create or replace function public.clear_chat(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_user();
  if not is_member(cid) then raise exception 'Chat not found'; end if;
  delete from messages where chat_id = cid;
  perform add_system_message(cid, display_name_of(auth.uid()) || ' cleared the chat 🧹');
end $$;

create or replace function public.mark_read(cid uuid) returns void
language sql security definer set search_path = public as $$
  update chat_members set last_read = clock_timestamp() where chat_id = cid and user_id = auth.uid();
$$;

create or replace function public.post_system_message(cid uuid, body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_user();
  if not is_member(cid) then raise exception 'Chat not found'; end if;
  perform add_system_message(cid, display_name_of(auth.uid()) || ' ' || left(body, 200));
end $$;

-- One reaction per person per message: picking the same emoji again removes it.
create or replace function public.toggle_reaction(mid uuid, emoji text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me text := require_user()::text;
  cid uuid;
  r jsonb;
  had boolean;
  k text;
  v jsonb;
  result jsonb := '{}';
begin
  select chat_id, reactions into cid, r from messages
  where id = mid and type <> 'system' and (expires_at is null or expires_at > now());
  if cid is null or not is_member(cid) then raise exception 'Message not found'; end if;
  emoji := btrim(coalesce(emoji, ''));
  if char_length(emoji) = 0 or char_length(emoji) > 16 then raise exception 'Pick an emoji'; end if;

  had := coalesce((r -> emoji) ? me, false);
  for k, v in select * from jsonb_each(r) loop
    v := (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements(v) x where x <> to_jsonb(me));
    if jsonb_array_length(v) > 0 then result := result || jsonb_build_object(k, v); end if;
  end loop;
  if not had then
    result := result || jsonb_build_object(emoji, coalesce(result -> emoji, '[]') || to_jsonb(me));
  end if;
  update messages set reactions = result where id = mid;
end $$;

-- ---- Calls ----

create or replace function public.call_json(c public.calls) returns jsonb
language sql stable as $$
  select to_jsonb(c);
$$;

create or replace function public.start_call(other uuid, with_video boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := require_user();
  cid uuid;
  c calls;
begin
  if other = me or not exists (select 1 from friendships where user_id = me and friend_id = other) then
    raise exception 'You can only call friends.';
  end if;
  -- Calls nobody answered (e.g. the app was closed while ringing) count as missed.
  update calls set status = 'missed', ended_at = now()
  where status = 'ringing' and created_at < now() - interval '1 minute'
    and (caller_id in (me, other) or callee_id in (me, other));
  cid := find_direct_chat(me, other);
  if cid is null then
    insert into chats (type, created_by) values ('direct', me) returning id into cid;
    insert into chat_members (chat_id, user_id) values (cid, me), (cid, other);
  end if;
  insert into calls (chat_id, caller_id, callee_id, video)
  values (cid, me, other, coalesce(with_video, false))
  returning * into c;
  return call_json(c);
end $$;

create or replace function public.answer_call(call_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c calls;
begin
  update calls set status = 'active', answered_at = now()
  where id = call_id and callee_id = require_user() and status = 'ringing'
  returning * into c;
  if c.id is null then
    raise exception 'This call has already ended.';
  end if;
  return call_json(c);
end $$;

create or replace function public.end_call(call_id uuid, final_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := require_user();
  c calls;
  secs int;
  kind text;
  emoji text;
  note text;
begin
  select * into c from calls where id = call_id and me in (caller_id, callee_id);
  if c.id is null then raise exception 'Call not found'; end if;
  if c.status not in ('ringing', 'active') then return; end if; -- already over
  if final_status not in ('declined', 'missed', 'ended', 'busy') then raise exception 'Unknown call status'; end if;
  if c.status = 'active' then
    final_status := 'ended';
  elsif final_status = 'ended' then
    -- Hanging up before it was answered.
    final_status := case when me = c.caller_id then 'missed' else 'declined' end;
  end if;
  update calls set status = final_status, ended_at = now() where id = call_id;

  kind := case when c.video then 'video call' else 'voice call' end;
  emoji := case when c.video then '📹' else '📞' end;
  if final_status = 'ended' then
    secs := greatest(0, extract(epoch from now() - c.answered_at)::int);
    note := emoji || ' ' || upper(left(kind, 1)) || substr(kind, 2) || ' · ' || (secs / 60) || ':' || lpad((secs % 60)::text, 2, '0');
  elsif final_status = 'missed' then
    note := emoji || ' Missed ' || kind || ' from ' || display_name_of(c.caller_id);
  elsif final_status = 'declined' then
    note := emoji || ' ' || upper(left(kind, 1)) || substr(kind, 2) || ' declined';
  else
    note := emoji || ' ' || display_name_of(c.callee_id) || ' was on another call';
  end if;
  perform add_system_message(c.chat_id, note);
end $$;

-- Everything the chat list needs in one call.
create or replace function public.my_chats(only_chat uuid default null) returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(x), '[]') from (
    select c.id, c.type, c.name, c.icon, c.created_by, c.settings, c.created_at, c.updated_at,
      me.pinned, me.muted,
      (select jsonb_agg(profile_json(m.user_id) || jsonb_build_object('last_read', m.last_read)
                        order by m.joined_at, m.user_id)
         from chat_members m where m.chat_id = c.id) as members,
      (select to_jsonb(msg) from messages msg
         where msg.chat_id = c.id and (msg.expires_at is null or msg.expires_at > now())
         order by msg.created_at desc limit 1) as last_message,
      (select count(*) from messages msg
         where msg.chat_id = c.id and msg.type <> 'system' and msg.sender_id is distinct from auth.uid()
           and msg.created_at > me.last_read and (msg.expires_at is null or msg.expires_at > now())) as unread
    from chats c
    join chat_members me on me.chat_id = c.id and me.user_id = auth.uid()
    where only_chat is null or c.id = only_chat
  ) x;
$$;

-- ---------------------------------------------------------------------------
-- Security: who can read and change what
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.friendships enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.user_stickers enable row level security;
alter table public.calls enable row level security;

revoke all on public.profiles, public.invite_codes, public.friendships, public.chats,
  public.chat_members, public.messages, public.user_stickers, public.calls from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_emoji, avatar_color, avatar_path, bio, prefs, last_seen) on public.profiles to authenticated;
grant select on public.invite_codes, public.friendships to authenticated;
grant select on public.chats to authenticated;
grant update (name, icon, settings) on public.chats to authenticated;
grant select on public.chat_members to authenticated;
grant update (pinned, muted) on public.chat_members to authenticated;
grant select, delete on public.messages to authenticated;
grant insert (chat_id, sender_id, type, text, sticker, reply_to, client_id) on public.messages to authenticated;
grant select, insert, delete on public.user_stickers to authenticated;
grant select on public.calls to authenticated;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own invite code" on public.invite_codes;
create policy "own invite code" on public.invite_codes for select to authenticated using (user_id = auth.uid());

drop policy if exists "own friendships" on public.friendships;
create policy "own friendships" on public.friendships for select to authenticated using (user_id = auth.uid());

drop policy if exists "member reads chat" on public.chats;
create policy "member reads chat" on public.chats for select to authenticated using (is_member(id));
drop policy if exists "member edits chat" on public.chats;
create policy "member edits chat" on public.chats for update to authenticated
  using (is_member(id)) with check (is_member(id));

drop policy if exists "member reads members" on public.chat_members;
create policy "member reads members" on public.chat_members for select to authenticated using (is_member(chat_id));
drop policy if exists "edit own membership" on public.chat_members;
create policy "edit own membership" on public.chat_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "member reads messages" on public.messages;
create policy "member reads messages" on public.messages for select to authenticated
  using (is_member(chat_id) and (expires_at is null or expires_at > now()));
drop policy if exists "member sends messages" on public.messages;
create policy "member sends messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and type in ('text', 'sticker') and is_member(chat_id));
drop policy if exists "unsend own messages" on public.messages;
create policy "unsend own messages" on public.messages for delete to authenticated
  using (sender_id = auth.uid() and type <> 'system');

drop policy if exists "own stickers" on public.user_stickers;
create policy "own stickers" on public.user_stickers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own calls" on public.calls;
create policy "own calls" on public.calls for select to authenticated
  using (auth.uid() in (caller_id, callee_id));

-- Functions only logged-in people should call.
revoke execute on function public.lookup_invite(text), public.add_friend(text), public.remove_friend(uuid),
  public.reset_invite_code(), public.create_chat(uuid[], boolean, text, text), public.add_members(uuid, uuid[]),
  public.leave_chat(uuid), public.clear_chat(uuid), public.mark_read(uuid), public.post_system_message(uuid, text),
  public.toggle_reaction(uuid, text), public.my_chats(uuid),
  public.start_call(uuid, boolean), public.answer_call(uuid), public.end_call(uuid, text) from public, anon;
grant execute on function public.lookup_invite(text), public.add_friend(text), public.remove_friend(uuid),
  public.reset_invite_code(), public.create_chat(uuid[], boolean, text, text), public.add_members(uuid, uuid[]),
  public.leave_chat(uuid), public.clear_chat(uuid), public.mark_read(uuid), public.post_system_message(uuid, text),
  public.toggle_reaction(uuid, text), public.my_chats(uuid),
  public.start_call(uuid, boolean), public.answer_call(uuid), public.end_call(uuid, text) to authenticated;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sticker images (public bucket; people upload into their own folder)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stickers', 'stickers', true, 1572864, array['image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "upload own stickers" on storage.objects;
create policy "upload own stickers" on storage.objects for insert to authenticated
  with check (bucket_id = 'stickers' and (storage.foldername(name))[1] = auth.uid()::text);

-- Profile pictures (public bucket; people upload into their own folder)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "upload own avatar" on storage.objects;
create policy "upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Live updates
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['messages', 'chats', 'chat_members', 'friendships', 'profiles', 'calls'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
