'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const { Server } = require('socket.io');
const db = require('./lib/db');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const CAT_DIR = path.join(PUBLIC_DIR, 'stickers', 'cats');

const MAX_GROUP_SIZE = 32;
const MAX_TEXT = 2000;
const MAX_STICKERS_PER_USER = 120;
const PAGE_SIZE = 60;
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;

fs.mkdirSync(CAT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const id = (bytes = 9) => crypto.randomBytes(bytes).toString('base64url');
const now = () => Date.now();

function newInviteCode() {
  // Short, unambiguous, easy to type by hand.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join('');
  } while (Object.values(db.data.users).some((u) => u.inviteCode === code));
  return code;
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    bio: u.bio || '',
    online: online.has(u.id),
    lastSeen: u.lastSeen || null,
  };
}

function selfUser(u) {
  return {
    ...publicUser(u),
    inviteCode: u.inviteCode,
    friends: u.friends,
    stickers: u.stickers,
    prefs: u.prefs || {},
  };
}

function cleanString(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const THEMES = ['lotus', 'sunset', 'ocean', 'forest', 'midnight', 'candy', 'aurora', 'mono', 'ember', 'sakura'];
const WALLPAPERS = ['none', 'dots', 'paws', 'lotus', 'hearts', 'stars', 'waves', 'grid'];
const BUBBLE_COLOR = /^#[0-9a-f]{6}$/i;
const DISAPPEAR_OPTIONS = [0, 300, 3600, 86400, 604800];
const FONT_SIZES = ['small', 'medium', 'large'];

function defaultChatSettings() {
  return {
    theme: 'lotus',
    wallpaper: 'dots',
    bubble: '#ff7a3d',
    quickReaction: '🙏',
    disappear: 0,
    fontSize: 'medium',
    nicknames: {},
  };
}

function messagesFor(chatId) {
  if (!db.data.messages[chatId]) db.data.messages[chatId] = [];
  return db.data.messages[chatId];
}

function lastVisibleMessage(chatId) {
  const list = messagesFor(chatId);
  return list.length ? list[list.length - 1] : null;
}

function serializeChat(chat, forUserId) {
  const list = messagesFor(chat.id);
  const lastRead = chat.lastRead?.[forUserId] || 0;
  const unread = list.filter((m) => m.from !== forUserId && m.type !== 'system' && m.createdAt > lastRead).length;
  return {
    id: chat.id,
    type: chat.type,
    name: chat.name || '',
    icon: chat.icon || '',
    createdBy: chat.createdBy,
    members: chat.members.map((uid) => publicUser(db.data.users[uid])).filter(Boolean),
    settings: chat.settings,
    lastRead: chat.lastRead || {},
    lastMessage: lastVisibleMessage(chat.id),
    unread,
    pinned: !!chat.pinnedBy?.[forUserId],
    muted: !!chat.mutedBy?.[forUserId],
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

function getChatFor(chatId, userId) {
  const chat = db.data.chats[chatId];
  if (!chat || !chat.members.includes(userId)) throw new HttpError(404, 'Chat not found');
  return chat;
}

function emitToUsers(userIds, event, payloadFn) {
  for (const uid of userIds) {
    io.to(`u:${uid}`).emit(event, typeof payloadFn === 'function' ? payloadFn(uid) : payloadFn);
  }
}

function broadcastChat(chat) {
  emitToUsers(chat.members, 'chat', (uid) => serializeChat(chat, uid));
}

function addSystemMessage(chat, text) {
  const msg = {
    id: id(),
    chatId: chat.id,
    from: null,
    type: 'system',
    text,
    reactions: {},
    createdAt: now(),
  };
  messagesFor(chat.id).push(msg);
  chat.updatedAt = msg.createdAt;
  emitToUsers(chat.members, 'message', msg);
  return msg;
}

function findDirectChat(a, b) {
  return Object.values(db.data.chats).find(
    (c) => c.type === 'direct' && c.members.length === 2 && c.members.includes(a) && c.members.includes(b),
  );
}

function createChat({ type, members, name, icon, createdBy }) {
  const chat = {
    id: id(),
    type,
    name: name || '',
    icon: icon || '',
    members,
    createdBy,
    settings: defaultChatSettings(),
    lastRead: {},
    pinnedBy: {},
    mutedBy: {},
    createdAt: now(),
    updatedAt: now(),
  };
  db.data.chats[chat.id] = chat;
  db.data.messages[chat.id] = [];
  return chat;
}

function makeFriends(a, b) {
  if (!a.friends.includes(b.id)) a.friends.push(b.id);
  if (!b.friends.includes(a.id)) b.friends.push(a.id);
}

function displayName(u) {
  return u?.displayName || u?.username || 'Someone';
}

// ---------------------------------------------------------------------------
// App + auth
// ---------------------------------------------------------------------------

const app = express();
app.disable('x-powered-by');
// Hosts like Render sit behind a proxy; trust it so req.ip (rate limiting) is the real client.
app.set('trust proxy', 1);
app.use(express.json({ limit: '3mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

function auth(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token && db.data.sessions[token]?.userId;
  const user = userId && db.data.users[userId];
  if (!user) return next(new HttpError(401, 'Please log in'));
  req.user = user;
  req.token = token;
  next();
}

function createSession(user) {
  const token = id(32);
  db.data.sessions[token] = { userId: user.id, createdAt: now() };
  db.save();
  return token;
}

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const AVATAR_COLORS = ['#ff7a3d', '#ffb703', '#8338ec', '#3a86ff', '#06d6a0', '#ef476f', '#118ab2', '#f15bb5'];
const AVATAR_EMOJIS = ['🐱', '🪷', '🌸', '🦊', '🐼', '🦄', '🍑', '🐸', '🦋', '🍵', '🐙', '🐯'];

// Tiny in-memory rate limit for login/register to slow down password guessing.
const attempts = new Map();
function rateLimit(req, _res, next) {
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, reset: now() + 60_000 };
  if (entry.reset < now()) Object.assign(entry, { count: 0, reset: now() + 60_000 });
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > 20) return next(new HttpError(429, 'Too many attempts — take a breath and try again in a minute.'));
  next();
}

app.post('/api/register', rateLimit, async (req, res) => {
  const username = cleanString(req.body.username, 40).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const name = cleanString(req.body.displayName, 40) || username;
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, 'Usernames are 3–20 characters: letters, numbers, dots or underscores.');
  }
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
  if (Object.values(db.data.users).some((u) => u.username === username)) {
    throw new HttpError(409, 'That username is taken.');
  }
  const user = {
    id: id(),
    username,
    displayName: name,
    passHash: await bcrypt.hash(password, 10),
    avatar: {
      emoji: AVATAR_EMOJIS[crypto.randomInt(AVATAR_EMOJIS.length)],
      color: AVATAR_COLORS[crypto.randomInt(AVATAR_COLORS.length)],
    },
    bio: '',
    inviteCode: newInviteCode(),
    friends: [],
    stickers: [],
    prefs: {},
    createdAt: now(),
  };
  db.data.users[user.id] = user;
  const token = createSession(user);
  res.json({ token, user: selfUser(user) });
});

app.post('/api/login', rateLimit, async (req, res) => {
  const username = cleanString(req.body.username, 40).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const user = Object.values(db.data.users).find((u) => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.passHash))) {
    throw new HttpError(401, 'Wrong username or password.');
  }
  const token = createSession(user);
  res.json({ token, user: selfUser(user) });
});

app.post('/api/logout', auth, (req, res) => {
  delete db.data.sessions[req.token];
  db.save();
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: selfUser(req.user) });
});

app.patch('/api/me', auth, async (req, res) => {
  const u = req.user;
  const { displayName: dn, bio, avatar, prefs, password, newPassword } = req.body;
  if (typeof dn === 'string') u.displayName = cleanString(dn, 40) || u.username;
  if (typeof bio === 'string') u.bio = cleanString(bio, 140);
  if (avatar && typeof avatar === 'object') {
    const emoji = cleanString(avatar.emoji, 16);
    if (emoji) u.avatar.emoji = emoji;
    if (BUBBLE_COLOR.test(avatar.color || '')) u.avatar.color = avatar.color;
  }
  if (prefs && typeof prefs === 'object') {
    u.prefs = { ...u.prefs };
    if (['dark', 'light', 'auto'].includes(prefs.appearance)) u.prefs.appearance = prefs.appearance;
    if (typeof prefs.sounds === 'boolean') u.prefs.sounds = prefs.sounds;
    if (typeof prefs.enterToSend === 'boolean') u.prefs.enterToSend = prefs.enterToSend;
  }
  if (newPassword !== undefined) {
    if (!(await bcrypt.compare(String(password || ''), u.passHash))) {
      throw new HttpError(400, 'Current password is wrong.');
    }
    if (String(newPassword).length < 6) throw new HttpError(400, 'New password must be at least 6 characters.');
    u.passHash = await bcrypt.hash(String(newPassword), 10);
  }
  db.save();
  // Let friends and chat partners see the new name/avatar right away.
  const audience = new Set(u.friends);
  for (const chat of Object.values(db.data.chats)) {
    if (chat.members.includes(u.id)) chat.members.forEach((m) => audience.add(m));
  }
  audience.delete(u.id);
  emitToUsers([...audience], 'user', publicUser(u));
  res.json({ user: selfUser(u) });
});

app.post('/api/me/invite/reset', auth, (req, res) => {
  req.user.inviteCode = newInviteCode();
  db.save();
  res.json({ user: selfUser(req.user) });
});

// ---------------------------------------------------------------------------
// Friends: QR codes + invite links
// ---------------------------------------------------------------------------

app.get('/api/invite/:code', auth, (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const user = Object.values(db.data.users).find((u) => u.inviteCode === code);
  if (!user) throw new HttpError(404, 'That invite link is not valid (it may have been reset).');
  res.json({
    user: publicUser(user),
    isSelf: user.id === req.user.id,
    alreadyFriends: req.user.friends.includes(user.id),
  });
});

app.post('/api/friends', auth, (req, res) => {
  const code = cleanString(req.body.code, 64).toUpperCase();
  const other = Object.values(db.data.users).find((u) => u.inviteCode === code);
  if (!other) throw new HttpError(404, 'No one has that friend code.');
  if (other.id === req.user.id) throw new HttpError(400, "That's your own code! Share it with a friend instead.");
  const wasFriend = req.user.friends.includes(other.id);
  makeFriends(req.user, other);

  let chat = findDirectChat(req.user.id, other.id);
  if (!chat) {
    chat = createChat({ type: 'direct', members: [req.user.id, other.id], createdBy: req.user.id });
    addSystemMessage(chat, `${displayName(req.user)} and ${displayName(other)} are now friends 🪷`);
  }
  db.save();
  if (!wasFriend) {
    emitToUsers([other.id], 'friend:new', publicUser(req.user));
    emitToUsers([req.user.id, other.id], 'friends:changed', {});
  }
  broadcastChat(chat);
  res.json({ friend: publicUser(other), chatId: chat.id, alreadyFriends: wasFriend });
});

app.get('/api/friends', auth, (req, res) => {
  const friends = req.user.friends.map((fid) => publicUser(db.data.users[fid])).filter(Boolean);
  friends.sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName));
  res.json({ friends });
});

app.delete('/api/friends/:id', auth, (req, res) => {
  const other = db.data.users[req.params.id];
  if (!other) throw new HttpError(404, 'User not found');
  req.user.friends = req.user.friends.filter((f) => f !== other.id);
  other.friends = other.friends.filter((f) => f !== req.user.id);
  db.save();
  emitToUsers([req.user.id, other.id], 'friends:changed', {});
  res.json({ ok: true });
});

app.get('/api/qr.svg', async (req, res) => {
  const text = cleanString(req.query.text, 512);
  if (!text) throw new HttpError(400, 'Missing text');
  const dark = BUBBLE_COLOR.test(req.query.dark || '') ? req.query.dark : '#1a1033';
  const svg = await QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: { dark, light: '#ffffff' },
  });
  res.type('image/svg+xml').setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------

app.get('/api/chats', auth, (req, res) => {
  const chats = Object.values(db.data.chats)
    .filter((c) => c.members.includes(req.user.id))
    .map((c) => serializeChat(c, req.user.id))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  res.json({ chats });
});

app.post('/api/chats', auth, (req, res) => {
  const me = req.user;
  const memberIds = Array.isArray(req.body.members) ? [...new Set(req.body.members.map(String))] : [];
  const others = memberIds.filter((m) => m !== me.id);
  if (!others.length) throw new HttpError(400, 'Pick at least one friend.');
  for (const m of others) {
    if (!me.friends.includes(m)) throw new HttpError(403, 'You can only start chats with friends.');
  }
  if (others.length + 1 > MAX_GROUP_SIZE) throw new HttpError(400, `Groups can have up to ${MAX_GROUP_SIZE} people.`);

  let chat;
  if (others.length === 1 && !req.body.group) {
    chat = findDirectChat(me.id, others[0]);
    if (!chat) chat = createChat({ type: 'direct', members: [me.id, others[0]], createdBy: me.id });
  } else {
    chat = createChat({
      type: 'group',
      members: [me.id, ...others],
      name: cleanString(req.body.name, 40) || 'New group',
      icon: cleanString(req.body.icon, 16) || '🪷',
      createdBy: me.id,
    });
    addSystemMessage(chat, `${displayName(me)} created the group “${chat.name}”`);
  }
  db.save();
  broadcastChat(chat);
  res.json({ chat: serializeChat(chat, me.id) });
});

app.get('/api/chats/:id/messages', auth, (req, res) => {
  const chat = getChatFor(req.params.id, req.user.id);
  const list = messagesFor(chat.id);
  const before = Number(req.query.before) || Infinity;
  const older = list.filter((m) => m.createdAt < before);
  const page = older.slice(-PAGE_SIZE);
  res.json({ messages: page, hasMore: older.length > page.length });
});

app.patch('/api/chats/:id', auth, (req, res) => {
  const me = req.user;
  const chat = getChatFor(req.params.id, me.id);
  const s = chat.settings;
  const b = req.body || {};
  const changes = [];

  if (THEMES.includes(b.theme) && b.theme !== s.theme) {
    s.theme = b.theme;
    changes.push(`changed the chat theme to ${b.theme}`);
  }
  if (WALLPAPERS.includes(b.wallpaper) && b.wallpaper !== s.wallpaper) {
    s.wallpaper = b.wallpaper;
    changes.push('changed the wallpaper');
  }
  if (BUBBLE_COLOR.test(b.bubble || '') && b.bubble !== s.bubble) {
    s.bubble = b.bubble;
    changes.push('changed the bubble colour');
  }
  if (typeof b.quickReaction === 'string' && b.quickReaction.trim() && b.quickReaction !== s.quickReaction) {
    s.quickReaction = cleanString(b.quickReaction, 16);
    changes.push(`set the quick reaction to ${s.quickReaction}`);
  }
  if (FONT_SIZES.includes(b.fontSize)) s.fontSize = b.fontSize;
  if (b.disappear !== undefined && DISAPPEAR_OPTIONS.includes(Number(b.disappear)) && Number(b.disappear) !== s.disappear) {
    s.disappear = Number(b.disappear);
    const labels = { 0: 'off', 300: '5 minutes', 3600: '1 hour', 86400: '24 hours', 604800: '7 days' };
    changes.push(
      s.disappear ? `turned on disappearing messages (${labels[s.disappear]}) 👻` : 'turned off disappearing messages',
    );
  }
  if (b.nickname && typeof b.nickname === 'object') {
    const target = String(b.nickname.userId || '');
    if (chat.members.includes(target)) {
      const nick = cleanString(b.nickname.name, 40);
      if (nick) s.nicknames[target] = nick;
      else delete s.nicknames[target];
      const who = target === me.id ? 'themselves' : displayName(db.data.users[target]);
      changes.push(nick ? `set the nickname for ${who} to “${nick}”` : `cleared the nickname for ${who}`);
    }
  }
  if (chat.type === 'group') {
    if (typeof b.name === 'string' && cleanString(b.name, 40) && cleanString(b.name, 40) !== chat.name) {
      chat.name = cleanString(b.name, 40);
      changes.push(`renamed the group to “${chat.name}”`);
    }
    if (typeof b.icon === 'string' && cleanString(b.icon, 16) && cleanString(b.icon, 16) !== chat.icon) {
      chat.icon = cleanString(b.icon, 16);
      changes.push(`changed the group icon to ${chat.icon}`);
    }
  }
  // Personal (not shared) settings
  if (typeof b.pinned === 'boolean') chat.pinnedBy = { ...chat.pinnedBy, [me.id]: b.pinned };
  if (typeof b.muted === 'boolean') chat.mutedBy = { ...chat.mutedBy, [me.id]: b.muted };

  for (const c of changes) addSystemMessage(chat, `${displayName(me)} ${c}`);
  db.save();
  broadcastChat(chat);
  res.json({ chat: serializeChat(chat, me.id) });
});

app.post('/api/chats/:id/members', auth, (req, res) => {
  const me = req.user;
  const chat = getChatFor(req.params.id, me.id);
  if (chat.type !== 'group') throw new HttpError(400, 'You can only add people to groups.');
  const add = (Array.isArray(req.body.members) ? req.body.members : [])
    .map(String)
    .filter((m) => me.friends.includes(m) && !chat.members.includes(m));
  if (!add.length) throw new HttpError(400, 'Pick friends who are not in the group yet.');
  if (chat.members.length + add.length > MAX_GROUP_SIZE) throw new HttpError(400, 'That group is full.');
  chat.members.push(...add);
  addSystemMessage(chat, `${displayName(me)} added ${add.map((m) => displayName(db.data.users[m])).join(', ')}`);
  db.save();
  broadcastChat(chat);
  res.json({ chat: serializeChat(chat, me.id) });
});

app.post('/api/chats/:id/leave', auth, (req, res) => {
  const me = req.user;
  const chat = getChatFor(req.params.id, me.id);
  if (chat.type !== 'group') throw new HttpError(400, 'You can only leave groups.');
  chat.members = chat.members.filter((m) => m !== me.id);
  emitToUsers([me.id], 'chat:remove', { id: chat.id });
  if (chat.members.length) {
    addSystemMessage(chat, `${displayName(me)} left the group`);
    broadcastChat(chat);
  } else {
    delete db.data.chats[chat.id];
    delete db.data.messages[chat.id];
  }
  db.save();
  res.json({ ok: true });
});

app.post('/api/chats/:id/clear', auth, (req, res) => {
  const me = req.user;
  const chat = getChatFor(req.params.id, me.id);
  db.data.messages[chat.id] = [];
  addSystemMessage(chat, `${displayName(me)} cleared the chat 🧹`);
  db.save();
  emitToUsers(chat.members, 'chat:cleared', { id: chat.id });
  broadcastChat(chat);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Stickers
// ---------------------------------------------------------------------------

function prettyName(file) {
  return file
    .replace(IMAGE_EXT, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

app.get('/api/sticker-packs', auth, (_req, res) => {
  let cats = [];
  try {
    cats = fs
      .readdirSync(CAT_DIR)
      .filter((f) => IMAGE_EXT.test(f) && !f.startsWith('.'))
      .sort()
      .map((f) => ({ key: `p:${f}`, src: `/stickers/cats/${encodeURIComponent(f)}`, name: prettyName(f) }));
  } catch {
    cats = [];
  }
  res.json({ packs: [{ id: 'cats', name: 'My Cats', icon: '🐈', stickers: cats }] });
});

const DATA_URL_RE = /^data:image\/(png|webp|jpeg);base64,([A-Za-z0-9+/=]+)$/;

app.post('/api/stickers', auth, async (req, res) => {
  const me = req.user;
  const match = DATA_URL_RE.exec(String(req.body.data || ''));
  if (!match) throw new HttpError(400, 'Stickers must be PNG, WebP or JPEG images.');
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 1_500_000) throw new HttpError(413, 'That sticker is too big (max 1.5 MB).');
  if (me.stickers.length >= MAX_STICKERS_PER_USER) throw new HttpError(400, 'Your sticker collection is full.');
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const sid = `${id()}.${ext}`;
  await db.putSticker(sid, `image/${match[1]}`, buf);
  me.stickers.unshift(sid);
  db.save();
  res.json({ sticker: `c:${sid}`, user: selfUser(me) });
});

// Save a sticker someone sent you into your own collection.
app.post('/api/stickers/save', auth, async (req, res) => {
  const me = req.user;
  const key = String(req.body.key || '');
  const m = /^c:([\w-]+\.(png|webp|jpg))$/.exec(key);
  if (!m || !(await db.getSticker(m[1]))) throw new HttpError(404, 'Sticker not found');
  if (!me.stickers.includes(m[1])) {
    if (me.stickers.length >= MAX_STICKERS_PER_USER) throw new HttpError(400, 'Your sticker collection is full.');
    me.stickers.unshift(m[1]);
    db.save();
  }
  res.json({ user: selfUser(me) });
});

app.delete('/api/stickers/:sid', auth, (req, res) => {
  const me = req.user;
  me.stickers = me.stickers.filter((s) => s !== req.params.sid);
  db.save();
  // The image itself is kept: the sticker may still appear in old messages.
  res.json({ user: selfUser(me) });
});

app.get('/u-stickers/:sid', async (req, res) => {
  const sticker = /^[\w-]+\.(png|webp|jpg)$/.test(req.params.sid) && (await db.getSticker(req.params.sid));
  if (!sticker) throw new HttpError(404, 'Sticker not found');
  res.type(sticker.mime).setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  res.send(sticker.data);
});

// ---------------------------------------------------------------------------
// Static + SPA
// ---------------------------------------------------------------------------

app.get('/vendor/jsQR.js', (_req, res) => res.sendFile(require.resolve('jsqr/dist/jsQR.js')));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
app.get(/^\/(add\/[A-Za-z0-9]+|chat\/[\w-]+)?$/, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side.' : err.message });
});

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 64 * 1024 });
const online = new Map(); // userId -> number of open sockets

function friendsAndChatPartners(userId) {
  const ids = new Set(db.data.users[userId]?.friends || []);
  for (const chat of Object.values(db.data.chats)) {
    if (chat.members.includes(userId)) chat.members.forEach((m) => ids.add(m));
  }
  ids.delete(userId);
  return [...ids];
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const userId = token && db.data.sessions[token]?.userId;
  if (!userId || !db.data.users[userId]) return next(new Error('unauthorized'));
  socket.data.userId = userId;
  next();
});

const STICKER_KEY = /^(b:[\w-]{1,40}|p:[\w .()-]{1,120}\.(png|jpe?g|webp|gif|svg)|c:[\w-]+\.(png|webp|jpg))$/i;

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(`u:${userId}`);
  online.set(userId, (online.get(userId) || 0) + 1);
  if (online.get(userId) === 1) {
    emitToUsers(friendsAndChatPartners(userId), 'presence', { userId, online: true });
  }

  const handle = (fn) => async (payload, ack) => {
    try {
      const result = await fn(payload || {});
      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (err) {
      if (!(err instanceof HttpError)) console.error(err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message || 'Failed' });
    }
  };

  socket.on(
    'send',
    handle(({ chatId, type, text, sticker, replyTo, clientId }) => {
      const me = db.data.users[userId];
      const chat = getChatFor(String(chatId), userId);
      const msg = {
        id: id(),
        chatId: chat.id,
        from: userId,
        type: type === 'sticker' ? 'sticker' : 'text',
        reactions: {},
        createdAt: now(),
      };
      // Lets the sender match the server copy with its optimistic one.
      if (typeof clientId === 'string') msg.clientId = clientId.slice(0, 40);
      if (msg.type === 'text') {
        msg.text = typeof text === 'string' ? text.slice(0, MAX_TEXT) : '';
        if (!msg.text.trim()) throw new HttpError(400, 'Empty message');
      } else {
        if (!STICKER_KEY.test(String(sticker))) throw new HttpError(400, 'Unknown sticker');
        msg.sticker = String(sticker);
      }
      if (replyTo) {
        const original = messagesFor(chat.id).find((m) => m.id === replyTo);
        if (original && original.type !== 'system') {
          msg.replyTo = {
            id: original.id,
            from: original.from,
            type: original.type,
            text: original.type === 'text' ? original.text.slice(0, 140) : '',
            sticker: original.sticker || null,
          };
        }
      }
      if (chat.settings.disappear) msg.expiresAt = msg.createdAt + chat.settings.disappear * 1000;
      messagesFor(chat.id).push(msg);
      chat.updatedAt = msg.createdAt;
      chat.lastRead = { ...chat.lastRead, [userId]: msg.createdAt };
      me.lastSeen = msg.createdAt;
      db.save();
      emitToUsers(chat.members, 'message', msg);
      broadcastChat(chat);
      return { message: msg };
    }),
  );

  socket.on(
    'typing',
    handle(({ chatId, typing }) => {
      const chat = getChatFor(String(chatId), userId);
      emitToUsers(
        chat.members.filter((m) => m !== userId),
        'typing',
        { chatId: chat.id, userId, typing: !!typing },
      );
    }),
  );

  socket.on(
    'read',
    handle(({ chatId }) => {
      const chat = getChatFor(String(chatId), userId);
      const ts = now();
      chat.lastRead = { ...chat.lastRead, [userId]: ts };
      db.save();
      emitToUsers(chat.members, 'read', { chatId: chat.id, userId, ts });
    }),
  );

  socket.on(
    'react',
    handle(({ chatId, messageId, emoji }) => {
      const chat = getChatFor(String(chatId), userId);
      const msg = messagesFor(chat.id).find((m) => m.id === messageId);
      if (!msg || msg.type === 'system') throw new HttpError(404, 'Message not found');
      const e = cleanString(emoji, 16);
      if (!e) throw new HttpError(400, 'Pick an emoji');
      // One reaction per person: tapping the same emoji again removes it.
      const had = (msg.reactions[e] || []).includes(userId);
      for (const k of Object.keys(msg.reactions)) {
        msg.reactions[k] = msg.reactions[k].filter((u) => u !== userId);
        if (!msg.reactions[k].length) delete msg.reactions[k];
      }
      if (!had) msg.reactions[e] = [...(msg.reactions[e] || []), userId];
      db.save();
      emitToUsers(chat.members, 'message:update', msg);
    }),
  );

  socket.on(
    'unsend',
    handle(({ chatId, messageId }) => {
      const chat = getChatFor(String(chatId), userId);
      const list = messagesFor(chat.id);
      const idx = list.findIndex((m) => m.id === messageId && m.from === userId);
      if (idx === -1) throw new HttpError(404, 'Message not found');
      list.splice(idx, 1);
      db.save();
      emitToUsers(chat.members, 'message:delete', { chatId: chat.id, id: messageId });
      broadcastChat(chat);
    }),
  );

  socket.on('disconnect', () => {
    const count = (online.get(userId) || 1) - 1;
    if (count <= 0) {
      online.delete(userId);
      const u = db.data.users[userId];
      if (u) {
        u.lastSeen = now();
        db.save();
      }
      emitToUsers(friendsAndChatPartners(userId), 'presence', { userId, online: false, lastSeen: now() });
    } else {
      online.set(userId, count);
    }
  });
});

// Disappearing messages sweep.
setInterval(() => {
  const t = now();
  for (const [chatId, list] of Object.entries(db.data.messages)) {
    const expired = list.filter((m) => m.expiresAt && m.expiresAt <= t);
    if (!expired.length) continue;
    db.data.messages[chatId] = list.filter((m) => !(m.expiresAt && m.expiresAt <= t));
    const chat = db.data.chats[chatId];
    if (!chat) continue;
    for (const m of expired) emitToUsers(chat.members, 'message:delete', { chatId, id: m.id, expired: true });
    broadcastChat(chat);
    db.save();
  }
}, 10_000).unref();

async function shutdown() {
  try {
    await db.close();
  } catch (err) {
    console.error('Could not save before shutting down:', err);
  }
  process.exit(0);
}

if (require.main === module) {
  db.init()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`🪷 Buddha Connect is running at http://localhost:${PORT}`);
      });
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    })
    .catch((err) => {
      console.error('Could not open the database:', err);
      process.exit(1);
    });
}

module.exports = { app, server };
