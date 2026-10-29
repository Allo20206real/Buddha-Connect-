'use strict';

(() => {
  // =========================================================================
  // Tiny DOM helpers
  // =========================================================================

  const $ = (sel, root = document) => root.querySelector(sel);
  const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'src', 'type', 'placeholder']);

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv);
          else el.style[sk] = sv;
        }
      } else if (k === 'html') el.innerHTML = v; // trusted markup only (icons)
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (PROPS.has(k)) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    appendKids(el, children);
    return el;
  }

  function appendKids(el, kids) {
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }

  const ICONS = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    send: '<path d="M4 12l16-8-6 16-3-6.5z"/><path d="M11 13.5L20 4"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>',
    sticker: '<path d="M14.5 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h6.5L21 13.5V7a4 4 0 0 0-4-4z"/><path d="M13.5 21v-3.5a4 4 0 0 1 4-4H21"/><path d="M8.5 9.5h.01M14.5 9.5h.01" stroke-width="2.6"/><path d="M8.5 13.5s1 1.3 2.8 1.3"/>',
    dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    qr: '<rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h2v2h-2zM18.5 18.5h2v2h-2zM14.5 18.5h2M18.5 14.5h2"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    chat: '<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    reply: '<path d="M9 15L4 10l5-5"/><path d="M4 10h10a6 6 0 0 1 6 6v3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    pin: '<path d="M9 4h6l-1 5 4 4H6l4-4zM12 13v8"/>',
    mute: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
    ghost: '<path d="M5 20V10a7 7 0 0 1 14 0v10l-2.3-1.6L14.3 20 12 18.4 9.7 20l-2.4-1.6z"/><path d="M9.5 10.5h.01M14.5 10.5h.01" stroke-width="2.6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    paw: '<ellipse cx="12" cy="16" rx="4.5" ry="3.8"/><circle cx="6" cy="10.5" r="1.8"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.1-.9-1.4-.9-2.4 0-.8.6-1.4 1.5-1.4H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01" stroke-width="2.8"/>',
  };

  const icon = (name, cls = '') =>
    h('span', {
      class: `icon ${cls}`,
      'aria-hidden': 'true',
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`,
    });

  // =========================================================================
  // State
  // =========================================================================

  const store = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem(`bc.${k}`);
        return v == null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(k, v) {
      try {
        if (v == null) localStorage.removeItem(`bc.${k}`);
        else localStorage.setItem(`bc.${k}`, JSON.stringify(v));
      } catch {
        /* storage unavailable */
      }
    },
  };

  const state = {
    token: store.get('token', null),
    me: null,
    friends: [],
    users: new Map(),
    chats: new Map(),
    msgs: new Map(), // chatId -> { list, hasMore, loaded, loading }
    typing: new Map(), // chatId -> Map(userId -> timeout)
    tab: 'chats',
    activeChatId: null,
    replyTo: null,
    picker: null,
    packs: [],
    socket: null,
    chatSearch: '',
    newestId: null,
  };

  // =========================================================================
  // Constants: themes, wallpapers, choices
  // =========================================================================

  const THEMES = {
    lotus: { label: 'Lotus', bg: 'linear-gradient(165deg,#2a1240 0%,#40194f 50%,#61213f 100%)', light: false },
    sunset: { label: 'Sunset', bg: 'linear-gradient(165deg,#ff9a62 0%,#ff5e7e 50%,#8f3fd1 100%)', light: false },
    ocean: { label: 'Ocean', bg: 'linear-gradient(165deg,#0b2a4a 0%,#0e5a7a 55%,#13a3a8 100%)', light: false },
    forest: { label: 'Forest', bg: 'linear-gradient(165deg,#0f2b1f 0%,#1d4d35 55%,#3c7a4b 100%)', light: false },
    midnight: { label: 'Midnight', bg: 'linear-gradient(165deg,#05060f 0%,#11163a 55%,#1e2460 100%)', light: false },
    aurora: { label: 'Aurora', bg: 'linear-gradient(165deg,#0b1026 0%,#1b5e5a 50%,#6a3fa0 100%)', light: false },
    ember: { label: 'Ember', bg: 'linear-gradient(165deg,#1a0a05 0%,#5a1a0a 55%,#b23a12 100%)', light: false },
    mono: { label: 'Mono', bg: 'linear-gradient(165deg,#111114 0%,#222228 100%)', light: false },
    candy: { label: 'Candy', bg: 'linear-gradient(165deg,#ffd6e8 0%,#e3d4ff 50%,#c9f0ff 100%)', light: true },
    sakura: { label: 'Sakura', bg: 'linear-gradient(165deg,#fff3f7 0%,#ffdbe9 55%,#ffc2d9 100%)', light: true },
  };

  const WALLPAPERS = {
    none: 'None',
    dots: 'Dots',
    paws: 'Paws',
    lotus: 'Lotus',
    hearts: 'Hearts',
    stars: 'Stars',
    waves: 'Waves',
    grid: 'Grid',
  };

  function wallpaperUrl(kind, ink) {
    const c = ink;
    const shapes = {
      dots: [28, `<circle cx="14" cy="14" r="1.6" fill="${c}"/>`],
      grid: [32, `<path d="M32 0H0V32" fill="none" stroke="${c}" stroke-width="1"/>`],
      paws: [
        90,
        `<g fill="${c}" transform="translate(22 26) rotate(-20)"><ellipse cx="0" cy="6" rx="7" ry="6"/><circle cx="-8" cy="-3" r="2.8"/><circle cx="-3" cy="-8.5" r="2.8"/><circle cx="3" cy="-8.5" r="2.8"/><circle cx="8" cy="-3" r="2.8"/></g><g fill="${c}" transform="translate(66 68) rotate(18)"><ellipse cx="0" cy="6" rx="7" ry="6"/><circle cx="-8" cy="-3" r="2.8"/><circle cx="-3" cy="-8.5" r="2.8"/><circle cx="3" cy="-8.5" r="2.8"/><circle cx="8" cy="-3" r="2.8"/></g>`,
      ],
      lotus: [
        96,
        `<g fill="none" stroke="${c}" stroke-width="1.6" transform="translate(28 34)"><path d="M0-14c6 6 6 13 0 17c-6-4-6-11 0-17z"/><path d="M-3 3c-11 1-17-4-19-11c8-1 15 3 19 11zM3 3c11 1 17-4 19-11c-8-1-15 3-19 11z"/></g><g fill="none" stroke="${c}" stroke-width="1.6" transform="translate(74 78) scale(.7)"><path d="M0-14c6 6 6 13 0 17c-6-4-6-11 0-17z"/><path d="M-3 3c-11 1-17-4-19-11c8-1 15 3 19 11zM3 3c11 1 17-4 19-11c-8-1-15 3-19 11z"/></g>`,
      ],
      hearts: [
        70,
        `<path fill="${c}" d="M20 30l-9-9a5.5 5.5 0 0 1 9-6.5 5.5 5.5 0 0 1 9 6.5z"/><path fill="${c}" d="M52 62l-6-6a3.6 3.6 0 0 1 6-4.3 3.6 3.6 0 0 1 6 4.3z"/>`,
      ],
      stars: [
        80,
        `<path fill="${c}" d="M20 10l2.5 6.5 6.5 2.5-6.5 2.5L20 28l-2.5-6.5L11 19l6.5-2.5z"/><circle cx="60" cy="56" r="1.6" fill="${c}"/><path fill="${c}" d="M58 22l1.4 3.6 3.6 1.4-3.6 1.4L58 32l-1.4-3.6L53 27l3.6-1.4z"/><circle cx="28" cy="64" r="1.2" fill="${c}"/>`,
      ],
      waves: [60, `<path d="M0 30q15-12 30 0t30 0" fill="none" stroke="${c}" stroke-width="1.4"/>`],
    };
    const s = shapes[kind];
    if (!s) return 'none';
    const [size, body] = s;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  }

  const BUBBLE_COLORS = ['#ff7a3d', '#ff3d7f', '#8338ec', '#3a86ff', '#06d6a0', '#ffb703', '#ef476f', '#118ab2', '#f15bb5', '#2b2d42'];
  const AVATAR_COLORS = ['#ff7a3d', '#ffb703', '#8338ec', '#3a86ff', '#06d6a0', '#ef476f', '#118ab2', '#f15bb5', '#43aa8b', '#6d597a'];
  const AVATAR_EMOJIS = '🐱 😺 🐈 🐈‍⬛ 🦁 🐯 🪷 🌸 🦊 🐼 🐨 🐻 🐰 🐸 🐵 🦄 🐙 🦋 🐝 🌙 ⭐ 🌈 🔥 🍑 🍓 🍵 🧋 🍩 🎧 🎮 🎨 🧘 👻 👽 🤖 😎 🥷 🧚 🧜 💎'.split(' ');
  const GROUP_ICONS = '🪷 🐱 🔥 🌈 🎉 💜 🍕 🎮 📚 ⚽ 🎧 ✨ 🌸 🧋 🏝️ 👯'.split(' ');
  const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👍', '🔥'];
  const DISAPPEAR = [
    [0, 'Off'],
    [300, '5 min'],
    [3600, '1 hour'],
    [86400, '24 hours'],
    [604800, '7 days'],
  ];

  // =========================================================================
  // Generic utilities
  // =========================================================================

  async function api(path, { method = 'GET', body } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && state.me) {
      logoutLocal();
      throw new Error('Your session ended — please log in again.');
    }
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  }

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function fmtListTime(ts) {
    if (!ts) return '';
    const days = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86400000);
    if (days === 0) return fmtTime(ts);
    if (days === 1) return 'Yesterday';
    if (days < 7) return new Date(ts).toLocaleDateString([], { weekday: 'short' });
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function fmtDay(ts) {
    const days = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return new Date(ts).toLocaleDateString([], { weekday: 'long' });
    return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric' });
  }

  function fmtAgo(ts) {
    if (!ts) return 'offline';
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return 'last seen just now';
    if (s < 3600) return `last seen ${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `last seen ${Math.floor(s / 3600)}h ago`;
    return `last seen ${fmtListTime(ts)}`;
  }

  const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;

  function bigEmojiCount(text) {
    const t = text.trim();
    if (!t || !EMOJI_ONLY.test(t) || /^[\d#*\s]+$/.test(t)) return 0;
    const n = segmenter ? [...segmenter.segment(t.replace(/\s/g, ''))].length : [...t].length;
    return n <= 3 ? n : 0;
  }

  function linkify(text) {
    const parts = text.split(/(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g);
    return parts.map((p, i) => (i % 2 ? h('a', { href: p, target: '_blank', rel: 'noopener noreferrer' }, p) : p));
  }

  function contrastInk(hex) {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#1b1230' : '#ffffff';
  }

  const uid = () => 'c' + Math.random().toString(36).slice(2) + Date.now().toString(36);

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = h('textarea', { value: text, style: { position: 'fixed', opacity: '0' } });
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  // ---- Sounds ----------------------------------------------------------------
  let audioCtx;
  function chime(kind = 'in') {
    if (state.me?.prefs?.sounds === false) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === 'in' ? [880, 1318.5] : [660];
      notes.forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        const t = audioCtx.currentTime + i * 0.09;
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(kind === 'in' ? 0.12 : 0.05, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.connect(g).connect(audioCtx.destination);
        o.start(t);
        o.stop(t + 0.3);
      });
    } catch {
      /* audio not available */
    }
  }

  // ---- Toasts ----------------------------------------------------------------
  function toast(content, { onClick, duration = 3200, kind = '' } = {}) {
    const el = h(
      'div',
      { class: `toast ${kind} ${onClick ? 'clickable' : ''}`, onclick: () => (onClick?.(), dismiss()) },
      content,
    );
    $('#toasts').append(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const timer = setTimeout(dismiss, duration);
    function dismiss() {
      clearTimeout(timer);
      el.classList.remove('in');
      setTimeout(() => el.remove(), 300);
    }
  }
  const toastError = (err) => toast(err.message || String(err), { kind: 'error' });

  // ---- Sheets (bottom sheets on phones, dialogs on desktop) ------------------
  function openSheet({ title, content, className = '', onClose, actions }) {
    const root = $('#sheet-root');
    let closed = false;
    const panel = h(
      'div',
      { class: `sheet ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' },
      h('div', { class: 'sheet-handle' }),
      title &&
        h(
          'div',
          { class: 'sheet-head' },
          h('h2', {}, title),
          actions,
          h('button', { class: 'icon-btn ghost', 'aria-label': 'Close', onclick: () => close() }, icon('x')),
        ),
      h('div', { class: 'sheet-body' }, content),
    );
    const backdrop = h('div', { class: 'sheet-backdrop', onclick: (e) => e.target === backdrop && close() }, panel);
    root.append(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));
    const onKey = (e) => {
      if (e.key === 'Escape' && root.lastElementChild === backdrop) close();
    };
    document.addEventListener('keydown', onKey);

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 260);
      onClose?.();
    }
    return { close, panel, body: $('.sheet-body', panel) };
  }

  function confirmSheet(text, { ok = 'OK', danger = false, detail = '' } = {}) {
    return new Promise((resolve) => {
      let answered = false;
      const sheet = openSheet({
        className: 'confirm',
        content: [
          h('p', { class: 'confirm-text' }, text),
          detail && h('p', { class: 'muted small' }, detail),
          h(
            'div',
            { class: 'row gap end' },
            h('button', { class: 'btn ghost', onclick: () => sheet.close() }, 'Cancel'),
            h(
              'button',
              {
                class: `btn ${danger ? 'danger' : 'primary'}`,
                onclick: () => {
                  answered = true;
                  sheet.close();
                },
              },
              ok,
            ),
          ),
        ],
        onClose: () => resolve(answered),
      });
    });
  }

  // =========================================================================
  // Users & chats helpers
  // =========================================================================

  function upsertUser(u) {
    if (!u) return;
    state.users.set(u.id, { ...state.users.get(u.id), ...u });
  }
  const getUser = (id) => (id === state.me?.id ? state.me : state.users.get(id));

  function otherMember(chat) {
    const id = chat.members.find((m) => m.id !== state.me.id)?.id;
    return getUser(id) || chat.members.find((m) => m.id !== state.me.id);
  }

  function memberName(chat, userId) {
    if (userId === state.me.id) return chat?.settings?.nicknames?.[userId] || 'You';
    return chat?.settings?.nicknames?.[userId] || getUser(userId)?.displayName || 'Someone';
  }

  function chatTitle(chat) {
    if (chat.type === 'group') return chat.name || 'Group';
    const other = otherMember(chat);
    return chat.settings?.nicknames?.[other?.id] || other?.displayName || 'Chat';
  }

  function avatar(user, size = 'md', { dot = false } = {}) {
    const el = h('div', { class: `avatar ${size}`, style: { '--av': user?.avatar?.color || '#7a6a8f' } }, user?.avatar?.emoji || '🙂');
    if (dot && user?.online) el.append(h('span', { class: 'presence-dot' }));
    return el;
  }

  function chatAvatar(chat, size = 'md') {
    if (chat.type === 'group') return h('div', { class: `avatar group ${size}` }, chat.icon || '🪷');
    return avatar(otherMember(chat), size, { dot: true });
  }

  function stickerImg(key, cls = '') {
    const kind = Stickers.kind(key);
    return h('img', {
      class: `sticker-img ${kind} ${cls}`,
      src: Stickers.src(key),
      alt: 'sticker',
      loading: 'lazy',
      draggable: 'false',
    });
  }

  function messagePreview(chat, m) {
    if (!m) return 'Say hi 👋';
    if (m.type === 'system') return m.text;
    const who = chat.type === 'group' || m.from === state.me.id ? `${memberName(chat, m.from)}: ` : '';
    const body = m.type === 'sticker' ? 'sent a sticker ✨' : m.text;
    return who + body;
  }

  function typingNames(chatId) {
    const chat = state.chats.get(chatId);
    const t = state.typing.get(chatId);
    if (!chat || !t || !t.size) return '';
    const names = [...t.keys()].map((id) => memberName(chat, id));
    if (chat.type === 'direct') return 'typing…';
    return names.length === 1 ? `${names[0]} is typing…` : `${names.length} people typing…`;
  }

  function totalUnread() {
    let n = 0;
    for (const c of state.chats.values()) if (!c.muted) n += c.unread || 0;
    return n;
  }

  function updateTitle() {
    const n = totalUnread();
    document.title = n ? `(${n}) Buddha Connect` : 'Buddha Connect';
    const badge = $('#nav-chats-badge');
    if (badge) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = !n;
    }
  }

  // =========================================================================
  // Auth screen
  // =========================================================================

  function renderAuth(mode = 'login') {
    const app = $('#app');
    const err = h('p', { class: 'form-error', role: 'alert' });
    const isReg = mode === 'register';
    const pending = sessionStorage.getItem('bc.invite');

    const form = h(
      'form',
      {
        class: 'auth-form',
        onsubmit: async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const btn = $('button[type=submit]', form);
          btn.disabled = true;
          err.textContent = '';
          try {
            const body = Object.fromEntries(fd.entries());
            const data = await api(isReg ? '/api/register' : '/api/login', { method: 'POST', body });
            state.token = data.token;
            store.set('token', data.token);
            await startSession(data.user);
          } catch (ex) {
            err.textContent = ex.message;
            btn.disabled = false;
          }
        },
      },
      isReg &&
        h('label', { class: 'field' }, h('span', {}, 'Your name'), h('input', { name: 'displayName', placeholder: 'e.g. Luna', maxlength: 40, autocomplete: 'nickname' })),
      h(
        'label',
        { class: 'field' },
        h('span', {}, 'Username'),
        h('input', {
          name: 'username',
          placeholder: 'e.g. luna.cat',
          required: true,
          autocapitalize: 'none',
          autocomplete: 'username',
          spellcheck: 'false',
          minlength: 3,
          maxlength: 20,
        }),
      ),
      h(
        'label',
        { class: 'field' },
        h('span', {}, 'Password'),
        h('input', {
          name: 'password',
          type: 'password',
          required: true,
          minlength: 6,
          autocomplete: isReg ? 'new-password' : 'current-password',
          placeholder: isReg ? 'At least 6 characters' : '••••••',
        }),
      ),
      err,
      h('button', { class: 'btn primary block lg', type: 'submit' }, isReg ? 'Create my account' : 'Log in'),
      h(
        'p',
        { class: 'auth-switch' },
        isReg ? 'Already have an account? ' : 'New here? ',
        h('button', { type: 'button', class: 'link-btn', onclick: () => renderAuth(isReg ? 'login' : 'register') }, isReg ? 'Log in' : 'Create an account'),
      ),
    );

    const spots = [[6, 10], [80, 8], [14, 78], [88, 70], [50, 4], [4, 44], [92, 40], [60, 88]];
    const floaters = ['🪷', '🐱', '💬', '✨', '😻', '🌸', '💜', '🙏'].map((e, i) =>
      h('span', { class: 'floater', style: { '--i': i, left: `${spots[i][0]}%`, top: `${spots[i][1]}%` } }, e),
    );

    app.replaceChildren(
      h(
        'div',
        { class: 'auth' },
        h('div', { class: 'auth-bg' }, floaters),
        h(
          'div',
          { class: 'auth-card' },
          h('div', { class: 'logo-mark big' }, '🪷'),
          h('h1', { class: 'brand' }, 'Buddha ', h('span', {}, 'Connect')),
          h('p', { class: 'tagline' }, 'Chats, stickers & good vibes with your people.'),
          pending && h('div', { class: 'invite-hint' }, '🎟️ Log in or sign up to accept your friend invite!'),
          form,
        ),
      ),
    );
    $('input', form)?.focus();
  }

  // =========================================================================
  // Session lifecycle
  // =========================================================================

  async function startSession(user) {
    state.me = user;
    applyAppearance();
    renderShell();
    connectSocket();
    try {
      await Promise.all([loadChats(), loadFriends(), loadPacks()]);
    } catch (err) {
      toastError(err);
    }
    route();
    handlePendingInvite();
  }

  function logoutLocal() {
    state.socket?.disconnect();
    Object.assign(state, {
      token: null,
      me: null,
      friends: [],
      activeChatId: null,
      replyTo: null,
      socket: null,
    });
    state.users.clear();
    state.chats.clear();
    state.msgs.clear();
    state.typing.clear();
    store.set('token', null);
    history.replaceState({}, '', '/');
    $('#sheet-root').replaceChildren();
    renderAuth();
  }

  async function logout() {
    try {
      await api('/api/logout', { method: 'POST' });
    } catch {
      /* already logged out */
    }
    logoutLocal();
  }

  function applyAppearance() {
    const pref = state.me?.prefs?.appearance || 'auto';
    const dark = pref === 'dark' || (pref === 'auto' && !matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.dataset.mode = dark ? 'dark' : 'light';
    $('meta[name=theme-color]').content = dark ? '#140c26' : '#fff6ef';
  }
  matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', applyAppearance);

  async function loadChats() {
    const { chats } = await api('/api/chats');
    state.chats.clear();
    for (const c of chats) {
      c.members.forEach(upsertUser);
      state.chats.set(c.id, c);
    }
    renderChatList();
    updateTitle();
  }

  async function loadFriends() {
    const { friends } = await api('/api/friends');
    friends.forEach(upsertUser);
    state.friends = friends.map((f) => f.id);
    if (state.tab === 'friends') renderFriends();
  }

  async function loadPacks() {
    const { packs } = await api('/api/sticker-packs');
    state.packs = packs;
  }

  // =========================================================================
  // Realtime
  // =========================================================================

  function connectSocket() {
    const socket = io({ auth: { token: state.token } });
    state.socket = socket;

    socket.on('connect_error', (err) => {
      if (err.message === 'unauthorized') logoutLocal();
    });
    socket.on('connect', () => {
      $('#app')?.classList.remove('offline');
      // Catch up on anything missed while disconnected.
      if (state.me) {
        loadChats().catch(() => {});
        if (state.activeChatId) loadMessages(state.activeChatId, { reset: true }).catch(() => {});
      }
    });
    socket.on('disconnect', () => $('#app')?.classList.add('offline'));

    socket.on('message', onMessage);
    socket.on('message:update', (msg) => {
      const s = state.msgs.get(msg.chatId);
      if (!s) return;
      const i = s.list.findIndex((m) => m.id === msg.id);
      if (i !== -1) s.list[i] = msg;
      if (msg.chatId === state.activeChatId) renderMessages();
    });
    socket.on('message:delete', ({ chatId, id }) => {
      const s = state.msgs.get(chatId);
      if (s) s.list = s.list.filter((m) => m.id !== id);
      if (chatId === state.activeChatId) renderMessages();
    });
    socket.on('chat', (chat) => {
      if (!chat) return;
      chat.members.forEach(upsertUser);
      if (chat.id === state.activeChatId && document.visibilityState === 'visible') chat.unread = 0;
      state.chats.set(chat.id, chat);
      renderChatList();
      updateTitle();
      if (chat.id === state.activeChatId) {
        renderChatHeader();
        applyChatLook();
        renderMessages();
      }
    });
    socket.on('chat:remove', ({ id }) => {
      state.chats.delete(id);
      state.msgs.delete(id);
      if (state.activeChatId === id) navigate('/');
      renderChatList();
      updateTitle();
    });
    socket.on('chat:cleared', ({ id }) => {
      const s = state.msgs.get(id);
      if (s) s.list = [];
      if (id === state.activeChatId) loadMessages(id, { reset: true });
    });
    socket.on('typing', ({ chatId, userId, typing }) => {
      let t = state.typing.get(chatId);
      if (!t) state.typing.set(chatId, (t = new Map()));
      clearTimeout(t.get(userId));
      if (typing) t.set(userId, setTimeout(() => (t.delete(userId), refreshTyping(chatId)), 6000));
      else t.delete(userId);
      refreshTyping(chatId);
    });
    socket.on('read', ({ chatId, userId, ts }) => {
      const chat = state.chats.get(chatId);
      if (!chat) return;
      chat.lastRead = { ...chat.lastRead, [userId]: ts };
      if (chatId === state.activeChatId) renderMessages();
    });
    socket.on('presence', ({ userId, online, lastSeen }) => {
      upsertUser({ id: userId, online, ...(lastSeen ? { lastSeen } : {}) });
      renderChatList();
      if (state.activeChatId) renderChatHeader();
      if (state.tab === 'friends') renderFriends();
    });
    socket.on('user', (u) => {
      upsertUser(u);
      for (const c of state.chats.values()) {
        const i = c.members.findIndex((m) => m.id === u.id);
        if (i !== -1) c.members[i] = { ...c.members[i], ...u };
      }
      renderChatList();
      if (state.activeChatId) {
        renderChatHeader();
        renderMessages();
      }
      if (state.tab === 'friends') renderFriends();
    });
    socket.on('friend:new', (u) => {
      upsertUser(u);
      toast(h('div', { class: 'toast-row' }, avatar(u, 'sm'), h('span', {}, h('b', {}, u.displayName), ' added you as a friend 🎉')));
      chime('in');
    });
    socket.on('friends:changed', () => loadFriends().catch(() => {}));
  }

  function refreshTyping(chatId) {
    renderChatList();
    if (chatId === state.activeChatId) {
      renderChatHeader();
      renderMessages();
    }
  }

  function onMessage(msg) {
    const s = state.msgs.get(msg.chatId);
    if (s) {
      const pendingIdx = msg.clientId ? s.list.findIndex((m) => m.clientId === msg.clientId) : -1;
      if (pendingIdx !== -1) s.list[pendingIdx] = msg;
      else if (!s.list.some((m) => m.id === msg.id)) {
        s.list.push(msg);
        state.newestId = msg.id;
      }
    }
    const chat = state.chats.get(msg.chatId);
    if (chat) {
      chat.lastMessage = msg;
      chat.updatedAt = msg.createdAt;
    }
    // A message from someone else clears their typing bubble.
    state.typing.get(msg.chatId)?.delete(msg.from);

    const isActive = msg.chatId === state.activeChatId && document.visibilityState === 'visible';
    if (msg.chatId === state.activeChatId) {
      renderMessages();
      if (isActive && msg.from !== state.me.id) markRead(msg.chatId);
    }
    if (msg.from && msg.from !== state.me.id && msg.type !== 'system') {
      if (!isActive && chat) {
        chat.unread = (chat.unread || 0) + 1;
        if (!chat.muted) notifyMessage(chat, msg);
      } else if (isActive) {
        chime('soft');
      }
    }
    renderChatList();
    updateTitle();
  }

  function notifyMessage(chat, msg) {
    chime('in');
    const text = msg.type === 'sticker' ? 'sent a sticker ✨' : msg.text;
    const sender = getUser(msg.from);
    toast(
      h(
        'div',
        { class: 'toast-row' },
        chatAvatar(chat, 'sm'),
        h(
          'div',
          { class: 'toast-text' },
          h('b', {}, chatTitle(chat)),
          h('span', {}, chat.type === 'group' ? `${memberName(chat, msg.from)}: ${text}` : text),
        ),
      ),
      { onClick: () => navigate(`/chat/${chat.id}`) },
    );
    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(chatTitle(chat), {
          body: chat.type === 'group' ? `${sender?.displayName || 'Someone'}: ${text}` : text,
          tag: chat.id,
          icon: '/img/icon.svg',
        });
        n.onclick = () => {
          window.focus();
          navigate(`/chat/${chat.id}`);
          n.close();
        };
      } catch {
        /* notifications unavailable */
      }
    }
  }

  function markRead(chatId) {
    const chat = state.chats.get(chatId);
    if (chat) chat.unread = 0;
    state.socket?.emit('read', { chatId });
    updateTitle();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.activeChatId) {
      markRead(state.activeChatId);
      renderChatList();
    }
  });

  // =========================================================================
  // Routing
  // =========================================================================

  function navigate(path, replace = false) {
    if (location.pathname !== path) history[replace ? 'replaceState' : 'pushState']({}, '', path);
    route();
  }
  window.addEventListener('popstate', () => state.me && route());

  function stashInviteFromUrl() {
    const m = location.pathname.match(/^\/add\/([A-Za-z0-9]+)/);
    if (m) {
      sessionStorage.setItem('bc.invite', m[1].toUpperCase());
      history.replaceState({}, '', '/');
    }
  }

  function route() {
    stashInviteFromUrl();
    const m = location.pathname.match(/^\/chat\/([\w-]+)/);
    if (m && state.chats.has(m[1])) openChat(m[1]);
    else {
      if (m) history.replaceState({}, '', '/');
      closeChat();
    }
    handlePendingInvite();
  }

  function handlePendingInvite() {
    const code = sessionStorage.getItem('bc.invite');
    if (!code || !state.me) return;
    sessionStorage.removeItem('bc.invite');
    showInvite(code);
  }

  // =========================================================================
  // Shell
  // =========================================================================

  function renderShell() {
    const navBtn = (tab, ic, label, badge) =>
      h(
        'button',
        { class: 'nav-btn', 'data-tab': tab, onclick: () => setTab(tab), 'aria-label': label },
        icon(ic),
        h('span', {}, label),
        badge && h('span', { class: 'nav-badge', id: badge, hidden: true }),
      );

    $('#app').replaceChildren(
      h(
        'div',
        { class: 'shell', id: 'shell' },
        h(
          'section',
          { class: 'main-screen' },
          h(
            'header',
            { class: 'top-bar' },
            h('button', { class: 'me-btn', onclick: () => setTab('me'), 'aria-label': 'My profile', id: 'me-avatar' }),
            h('h1', { class: 'top-title', id: 'top-title' }, 'Chats'),
            h('div', { class: 'top-actions', id: 'top-actions' }),
          ),
          h(
            'div',
            { class: 'tab-body' },
            h('div', { class: 'tab', id: 'tab-chats' }),
            h('div', { class: 'tab', id: 'tab-friends', hidden: true }),
            h('div', { class: 'tab', id: 'tab-me', hidden: true }),
          ),
          h(
            'nav',
            { class: 'bottom-nav' },
            navBtn('chats', 'chat', 'Chats', 'nav-chats-badge'),
            navBtn('friends', 'users', 'Friends'),
            navBtn('me', 'user', 'Me'),
          ),
        ),
        h(
          'section',
          { class: 'chat-screen', id: 'chat-screen' },
          h(
            'div',
            { class: 'chat-empty' },
            h('div', { class: 'logo-mark big' }, '🪷'),
            h('h2', {}, 'Buddha Connect'),
            h('p', { class: 'muted' }, 'Pick a chat on the left, or add a friend to start one.'),
          ),
        ),
      ),
      h('div', { class: 'offline-pill' }, 'Reconnecting…'),
    );
    renderMeAvatar();
    setTab(state.tab);
  }

  function renderMeAvatar() {
    const btn = $('#me-avatar');
    if (btn) btn.replaceChildren(avatar(state.me, 'sm'));
  }

  function setTab(tab) {
    state.tab = tab;
    for (const t of ['chats', 'friends', 'me']) {
      const el = $(`#tab-${t}`);
      if (el) el.hidden = t !== tab;
      $(`.nav-btn[data-tab=${t}]`)?.classList.toggle('active', t === tab);
    }
    $('#top-title').textContent = { chats: 'Chats', friends: 'Friends', me: 'Me' }[tab];
    const actions = $('#top-actions');
    if (tab === 'chats') {
      actions.replaceChildren(
        h('button', { class: 'icon-btn', 'aria-label': 'Scan QR code', onclick: openScanner }, icon('scan')),
        h('button', { class: 'icon-btn accent', 'aria-label': 'New chat', onclick: openNewChat }, icon('edit')),
      );
      renderChatList();
    } else if (tab === 'friends') {
      actions.replaceChildren(h('button', { class: 'icon-btn accent', 'aria-label': 'Scan QR code', onclick: openScanner }, icon('scan')));
      renderFriends();
    } else {
      actions.replaceChildren();
      renderMe();
    }
    updateTitle();
  }

  // =========================================================================
  // Chat list
  // =========================================================================

  function renderChatList() {
    const root = $('#tab-chats');
    if (!root || !state.me) return;
    const q = state.chatSearch.trim().toLowerCase();
    const chats = [...state.chats.values()]
      .filter((c) => !q || chatTitle(c).toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);

    const search = $('#chat-search', root);
    const hadFocus = document.activeElement === search;

    const list = chats.map((c) => {
      const typing = typingNames(c.id);
      const last = c.lastMessage;
      return h(
        'button',
        {
          class: `chat-row ${c.id === state.activeChatId ? 'active' : ''} ${c.unread ? 'unread' : ''}`,
          onclick: () => navigate(`/chat/${c.id}`),
        },
        chatAvatar(c, 'md'),
        h(
          'div',
          { class: 'chat-row-main' },
          h(
            'div',
            { class: 'chat-row-top' },
            h('span', { class: 'chat-row-name' }, chatTitle(c)),
            c.settings?.disappear ? icon('ghost', 'tiny muted') : null,
            c.muted ? icon('mute', 'tiny muted') : null,
            c.pinned ? icon('pin', 'tiny muted') : null,
            h('span', { class: 'chat-row-time' }, fmtListTime(last?.createdAt || c.updatedAt)),
          ),
          h(
            'div',
            { class: 'chat-row-bottom' },
            typing
              ? h('span', { class: 'chat-row-preview typing' }, typing)
              : h('span', { class: 'chat-row-preview' }, messagePreview(c, last)),
            c.unread ? h('span', { class: 'badge' }, c.unread > 99 ? '99+' : c.unread) : null,
          ),
        ),
      );
    });

    const children = [];
    if (state.chats.size > 4 || q) {
      children.push(
        h(
          'label',
          { class: 'search' },
          icon('search'),
          h('input', {
            id: 'chat-search',
            placeholder: 'Search chats',
            value: state.chatSearch,
            oninput: (e) => {
              state.chatSearch = e.target.value;
              renderChatList();
            },
          }),
        ),
      );
    }
    if (!state.chats.size) {
      children.push(
        h(
          'div',
          { class: 'empty-state' },
          h('div', { class: 'empty-art' }, '😺💬'),
          h('h3', {}, 'No chats yet'),
          h('p', { class: 'muted' }, 'Add a friend by scanning their QR code or sending them your link — your chat will appear here.'),
          h('button', { class: 'btn primary', onclick: () => setTab('friends') }, icon('qr'), 'Add a friend'),
        ),
      );
    } else if (!chats.length) {
      children.push(h('p', { class: 'muted center pad' }, 'No chats match that search.'));
    }
    children.push(h('div', { class: 'chat-list' }, list));
    root.replaceChildren(...children);
    if (hadFocus) {
      const s = $('#chat-search', root);
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }
  }

  // =========================================================================
  // New chat / group
  // =========================================================================

  function openNewChat() {
    const friends = state.friends.map(getUser).filter(Boolean);
    if (!friends.length) {
      const sheet = openSheet({
        title: 'New chat',
        content: h(
          'div',
          { class: 'empty-state compact' },
          h('div', { class: 'empty-art' }, '🫂'),
          h('p', {}, "You don't have any friends on Buddha Connect yet."),
          h('button', { class: 'btn primary', onclick: () => (sheet.close(), setTab('friends')) }, 'Add friends'),
        ),
      });
      return;
    }
    const picked = new Set();
    let icon_ = GROUP_ICONS[0];
    const nameInput = h('input', { placeholder: 'Group name', maxlength: 40 });
    const groupBox = h(
      'div',
      { class: 'group-box', hidden: true },
      h('div', { class: 'row gap' }, h('button', { class: 'avatar group md icon-pick', type: 'button', onclick: pickIcon }, icon_), nameInput),
    );
    const go = h('button', { class: 'btn primary block', disabled: true, onclick: create }, 'Start chat');

    function pickIcon(e) {
      const btn = e.currentTarget;
      openEmojiSheet((emoji) => {
        icon_ = emoji;
        btn.textContent = emoji;
      }, GROUP_ICONS);
    }

    function sync() {
      groupBox.hidden = picked.size < 2;
      go.disabled = !picked.size;
      go.textContent = picked.size >= 2 ? `Create group (${picked.size + 1})` : 'Start chat';
    }

    async function create() {
      go.disabled = true;
      try {
        const { chat } = await api('/api/chats', {
          method: 'POST',
          body: { members: [...picked], group: picked.size > 1, name: nameInput.value, icon: icon_ },
        });
        state.chats.set(chat.id, chat);
        sheet.close();
        navigate(`/chat/${chat.id}`);
      } catch (err) {
        toastError(err);
        go.disabled = false;
      }
    }

    const sheet = openSheet({
      title: 'New chat',
      content: [
        h('p', { class: 'muted small' }, 'Pick one friend for a chat, or a few for a group.'),
        groupBox,
        h(
          'div',
          { class: 'pick-list' },
          friends.map((f) =>
            h(
              'label',
              { class: 'pick-row' },
              avatar(f, 'sm', { dot: true }),
              h('div', { class: 'grow' }, h('div', { class: 'bold' }, f.displayName), h('div', { class: 'muted small' }, `@${f.username}`)),
              h('input', {
                type: 'checkbox',
                class: 'check',
                onchange: (e) => {
                  e.target.checked ? picked.add(f.id) : picked.delete(f.id);
                  sync();
                },
              }),
            ),
          ),
        ),
        h('div', { class: 'sheet-footer' }, go),
      ],
    });
  }

  // =========================================================================
  // Chat screen
  // =========================================================================

  function closeChat() {
    if (!state.activeChatId) {
      $('#shell')?.classList.remove('has-chat');
      return;
    }
    stopTyping();
    state.activeChatId = null;
    state.replyTo = null;
    state.picker = null;
    $('#shell')?.classList.remove('has-chat');
    const screen = $('#chat-screen');
    setTimeout(() => {
      if (!state.activeChatId && screen) {
        screen.removeAttribute('style');
        screen.replaceChildren(
          h(
            'div',
            { class: 'chat-empty' },
            h('div', { class: 'logo-mark big' }, '🪷'),
            h('h2', {}, 'Buddha Connect'),
            h('p', { class: 'muted' }, 'Pick a chat on the left, or add a friend to start one.'),
          ),
        );
      }
    }, 280);
    renderChatList();
  }

  async function openChat(chatId) {
    if (state.activeChatId === chatId) return;
    stopTyping();
    state.activeChatId = chatId;
    state.replyTo = null;
    state.picker = null;
    const screen = $('#chat-screen');
    const composerInput = h('textarea', {
      id: 'composer-input',
      rows: 1,
      placeholder: 'Message',
      maxlength: 2000,
      enterkeyhint: 'send',
      oninput: onComposerInput,
      onkeydown: onComposerKey,
      onfocus: () => {
        if (matchMedia('(max-width: 720px)').matches) setPicker(null);
      },
    });

    screen.replaceChildren(
      h('header', { class: 'chat-header', id: 'chat-header' }),
      h(
        'div',
        { class: 'chat-body', id: 'chat-body' },
        h('div', { class: 'wallpaper', id: 'wallpaper' }),
        h('div', { class: 'messages', id: 'messages', onscroll: onMessagesScroll }),
        h('button', { class: 'jump-btn', id: 'jump-btn', hidden: true, 'aria-label': 'Jump to latest', onclick: () => scrollToBottom(true) }, icon('down')),
      ),
      h('div', { class: 'reply-bar', id: 'reply-bar', hidden: true }),
      h(
        'div',
        { class: 'composer', id: 'composer' },
        h('button', { class: 'icon-btn ghost', id: 'emoji-btn', 'aria-label': 'Emoji', onclick: () => togglePicker('emoji') }, icon('smile')),
        h('div', { class: 'composer-field' }, composerInput),
        h('button', { class: 'icon-btn ghost', id: 'sticker-btn', 'aria-label': 'Stickers', onclick: () => togglePicker('sticker') }, icon('sticker')),
        h('button', { class: 'send-btn', id: 'send-btn', 'aria-label': 'Send', onclick: onSendClick }),
      ),
      h('div', { class: 'picker', id: 'picker', hidden: true }),
    );
    $('#shell').classList.add('has-chat');
    renderChatHeader();
    applyChatLook();
    updateSendButton();
    renderChatList();
    const draft = store.get(`draft.${chatId}`, '');
    if (draft) {
      composerInput.value = draft;
      autoGrow(composerInput);
      updateSendButton();
    }
    if (!matchMedia('(max-width: 720px)').matches) composerInput.focus();

    const s = state.msgs.get(chatId);
    if (s?.loaded) {
      renderMessages({ toBottom: true });
    } else {
      $('#messages').replaceChildren(h('div', { class: 'loading-dots' }, h('span'), h('span'), h('span')));
    }
    await loadMessages(chatId, { reset: !s?.loaded });
    if (state.activeChatId === chatId) markRead(chatId);
    renderChatList();
  }

  async function loadMessages(chatId, { reset = false, older = false } = {}) {
    let s = state.msgs.get(chatId);
    if (!s || reset) {
      s = { list: s && !reset ? s.list : [], hasMore: false, loaded: false, loading: false };
      state.msgs.set(chatId, s);
    }
    if (s.loading) return;
    s.loading = true;
    try {
      const before = older && s.list.length ? s.list[0].createdAt : '';
      const { messages, hasMore } = await api(`/api/chats/${chatId}/messages${before ? `?before=${before}` : ''}`);
      if (older) {
        s.list = [...messages, ...s.list];
      } else {
        // Keep optimistic messages that have not been confirmed yet.
        const pending = s.list.filter((m) => m.pending);
        s.list = [...messages, ...pending];
      }
      s.hasMore = hasMore;
      s.loaded = true;
    } catch (err) {
      if (chatId === state.activeChatId) toastError(err);
    } finally {
      s.loading = false;
    }
    if (chatId === state.activeChatId) renderMessages(older ? { keepTop: true } : { toBottom: true });
  }

  function onMessagesScroll(e) {
    const el = e.currentTarget;
    const s = state.msgs.get(state.activeChatId);
    if (el.scrollTop < 120 && s?.hasMore && !s.loading) loadMessages(state.activeChatId, { older: true });
    $('#jump-btn').hidden = el.scrollHeight - el.scrollTop - el.clientHeight < 300;
  }

  function scrollToBottom(smooth = false) {
    const el = $('#messages');
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  function applyChatLook() {
    const chat = state.chats.get(state.activeChatId);
    const screen = $('#chat-screen');
    if (!chat || !screen) return;
    const s = chat.settings;
    const theme = THEMES[s.theme] || THEMES.lotus;
    const ink = theme.light ? '#1b1230' : '#ffffff';
    screen.dataset.light = theme.light ? 'true' : 'false';
    screen.dataset.size = s.fontSize || 'medium';
    screen.style.setProperty('--chat-bg', theme.bg);
    screen.style.setProperty('--chat-ink', ink);
    screen.style.setProperty('--bubble', s.bubble);
    screen.style.setProperty('--bubble-ink', contrastInk(s.bubble));
    const wp = $('#wallpaper');
    if (wp) wp.style.backgroundImage = wallpaperUrl(s.wallpaper, theme.light ? 'rgba(60,20,80,.13)' : 'rgba(255,255,255,.09)');
    updateSendButton();
  }

  function renderChatHeader() {
    const chat = state.chats.get(state.activeChatId);
    const header = $('#chat-header');
    if (!chat || !header) return;
    let status;
    const typing = typingNames(chat.id);
    if (typing) status = h('span', { class: 'typing-text' }, typing);
    else if (chat.type === 'direct') {
      const other = otherMember(chat);
      status = other?.online ? h('span', { class: 'online-text' }, 'online') : fmtAgo(other?.lastSeen);
    } else {
      const onlineCount = chat.members.filter((m) => m.id !== state.me.id && getUser(m.id)?.online).length;
      status = `${chat.members.length} members${onlineCount ? ` · ${onlineCount} online` : ''}`;
    }
    header.replaceChildren(
      h('button', { class: 'icon-btn ghost back-btn', 'aria-label': 'Back', onclick: () => navigate('/') }, icon('back')),
      h(
        'button',
        { class: 'chat-header-who', onclick: openChatSettings },
        chatAvatar(chat, 'sm'),
        h(
          'div',
          { class: 'chat-header-text' },
          h('div', { class: 'chat-header-name' }, chatTitle(chat)),
          h('div', { class: 'chat-header-status' }, chat.settings.disappear ? icon('ghost', 'tiny') : null, status),
        ),
      ),
      h('button', { class: 'icon-btn ghost', 'aria-label': 'Customize chat', onclick: openChatSettings }, icon('palette')),
    );
  }

  // ---- Messages ------------------------------------------------------------

  function renderMessages({ toBottom = false, keepTop = false } = {}) {
    const el = $('#messages');
    const chat = state.chats.get(state.activeChatId);
    const s = state.msgs.get(state.activeChatId);
    if (!el || !chat || !s || !s.loaded) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    const fromBottom = el.scrollHeight - el.scrollTop;
    const nodes = [];

    if (s.hasMore) nodes.push(h('div', { class: 'load-more' }, h('div', { class: 'loading-dots small' }, h('span'), h('span'), h('span'))));
    else nodes.push(chatIntro(chat));

    if (chat.settings.disappear) {
      const label = DISAPPEAR.find(([v]) => v === chat.settings.disappear)?.[1];
      nodes.push(h('div', { class: 'system-pill ghosty' }, icon('ghost', 'tiny'), ` New messages disappear after ${label}`));
    }

    const list = s.list;
    let lastDay = null;
    const myLastId = [...list].reverse().find((m) => m.from === state.me.id && !m.pending)?.id;

    list.forEach((m, i) => {
      const day = startOfDay(m.createdAt);
      if (day !== lastDay) {
        nodes.push(h('div', { class: 'day-sep' }, h('span', {}, fmtDay(m.createdAt))));
        lastDay = day;
      }
      if (m.type === 'system') {
        nodes.push(h('div', { class: 'system-pill' }, m.text));
        return;
      }
      const prev = list[i - 1];
      const next = list[i + 1];
      const sameAs = (o) => o && o.type !== 'system' && o.from === m.from && Math.abs(o.createdAt - m.createdAt) < 5 * 60000 && startOfDay(o.createdAt) === day;
      const first = !sameAs(prev);
      const last = !sameAs(next);
      nodes.push(messageRow(chat, m, { first, last }));
      if (m.id === myLastId && m.id === list.filter((x) => x.type !== 'system').at(-1)?.id) {
        nodes.push(receipt(chat, m));
      }
    });

    const typing = state.typing.get(chat.id);
    if (typing?.size) {
      const who = getUser([...typing.keys()][0]);
      nodes.push(
        h(
          'div',
          { class: 'msg-row theirs first last typing-row' },
          chat.type === 'group' ? avatar(who, 'xs') : null,
          h('div', { class: 'bubble typing-bubble' }, h('span'), h('span'), h('span')),
        ),
      );
    }

    el.replaceChildren(...nodes);
    if (toBottom || nearBottom) scrollToBottom();
    else if (keepTop) el.scrollTop = el.scrollHeight - fromBottom;
    state.newestId = null;
  }

  function chatIntro(chat) {
    if (chat.type === 'group') {
      return h(
        'div',
        { class: 'chat-intro' },
        chatAvatar(chat, 'xl'),
        h('h3', {}, chat.name),
        h('p', {}, `${chat.members.length} members`),
      );
    }
    const other = otherMember(chat);
    return h(
      'div',
      { class: 'chat-intro' },
      avatar(other, 'xl'),
      h('h3', {}, chatTitle(chat)),
      h('p', {}, `@${other?.username || ''}`),
      other?.bio ? h('p', { class: 'intro-bio' }, other.bio) : null,
    );
  }

  function receipt(chat, m) {
    let text;
    if (chat.type === 'direct') {
      const other = otherMember(chat);
      const read = (chat.lastRead?.[other?.id] || 0) >= m.createdAt;
      text = read ? h('span', { class: 'opened' }, '● Opened') : '○ Delivered';
    } else {
      const seen = chat.members.filter((u) => u.id !== state.me.id && (chat.lastRead?.[u.id] || 0) >= m.createdAt);
      text = seen.length ? `Seen by ${seen.map((u) => memberName(chat, u.id)).slice(0, 3).join(', ')}${seen.length > 3 ? ` +${seen.length - 3}` : ''}` : 'Delivered';
    }
    return h('div', { class: 'receipt' }, text);
  }

  function messageRow(chat, m, { first, last }) {
    const mine = m.from === state.me.id;
    const sender = getUser(m.from);
    const showName = !mine && chat.type === 'group' && first;
    const showAvatar = !mine && chat.type === 'group';

    let content;
    if (m.type === 'sticker') {
      content = h('div', { class: 'sticker-msg' }, stickerImg(m.sticker));
    } else {
      const big = bigEmojiCount(m.text);
      content = big
        ? h('div', { class: `emoji-msg n${big}` }, m.text.trim())
        : h('div', { class: 'bubble' }, m.replyTo ? replyQuote(chat, m.replyTo) : null, h('div', { class: 'bubble-text' }, linkify(m.text)));
    }
    const needsQuote = m.replyTo && (m.type === 'sticker' || bigEmojiCount(m.text || ''));

    const reactions = Object.entries(m.reactions || {}).filter(([, users]) => users.length);
    const row = h(
      'div',
      {
        class: `msg-row ${mine ? 'mine' : 'theirs'} ${first ? 'first' : ''} ${last ? 'last' : ''} ${m.pending ? 'pending' : ''} ${m.failed ? 'failed' : ''} ${m.id === state.newestId ? 'pop' : ''}`,
        'data-id': m.id,
      },
      showAvatar ? (last ? avatar(sender, 'xs') : h('div', { class: 'avatar-spacer' })) : null,
      h(
        'div',
        { class: 'msg-stack' },
        showName ? h('div', { class: 'msg-name', style: { color: sender?.avatar?.color } }, memberName(chat, m.from)) : null,
        needsQuote ? replyQuote(chat, m.replyTo, true) : null,
        h('div', { class: 'msg-content', title: fmtTime(m.createdAt) }, content),
        reactions.length
          ? h(
              'div',
              { class: 'reactions' },
              reactions.map(([emoji, users]) =>
                h(
                  'button',
                  {
                    class: `reaction ${users.includes(state.me.id) ? 'mine' : ''}`,
                    title: users.map((u) => memberName(chat, u)).join(', '),
                    onclick: (e) => {
                      e.stopPropagation();
                      react(m, emoji);
                    },
                  },
                  emoji,
                  users.length > 1 ? h('span', {}, users.length) : null,
                ),
              ),
            )
          : null,
        last ? h('div', { class: 'msg-time' }, m.failed ? 'Not sent — tap to retry' : m.pending ? 'Sending…' : fmtTime(m.createdAt), m.expiresAt ? icon('clock', 'tiny') : null) : null,
      ),
      h('div', { class: 'swipe-reply' }, icon('reply')),
    );
    attachMessageGestures(row, m);
    return row;
  }

  function replyQuote(chat, r, standalone = false) {
    return h(
      'div',
      {
        class: `reply-quote ${standalone ? 'standalone' : ''}`,
        onclick: (e) => {
          e.stopPropagation();
          const target = $(`.msg-row[data-id="${CSS.escape(r.id)}"]`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('flash');
            setTimeout(() => target.classList.remove('flash'), 1200);
          }
        },
      },
      h('div', { class: 'reply-name' }, r.from === state.me.id ? 'You' : memberName(chat, r.from)),
      r.type === 'sticker' ? h('div', { class: 'reply-sticker' }, stickerImg(r.sticker, 'tiny'), 'Sticker') : h('div', { class: 'reply-text' }, r.text),
    );
  }

  function attachMessageGestures(row, m) {
    if (m.pending && !m.failed) return;
    if (m.failed) {
      row.addEventListener('click', () => retrySend(m));
      return;
    }
    let pressTimer = null;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let swiping = false;
    let longPressed = false;
    let lastTap = 0;

    row.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a,.reaction,.reply-quote')) return;
      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      swiping = false;
      longPressed = false;
      pressTimer = setTimeout(() => {
        longPressed = true;
        navigator.vibrate?.(12);
        openMessageMenu(m);
      }, 480);
    });
    row.addEventListener('pointermove', (e) => {
      if (!pressTimer && !swiping) return;
      const mx = e.clientX - startX;
      const my = e.clientY - startY;
      if (Math.abs(mx) > 8 || Math.abs(my) > 8) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (e.pointerType !== 'mouse' && !swiping && mx > 12 && Math.abs(my) < 10) swiping = true;
      if (swiping) {
        dx = Math.max(0, Math.min(80, mx));
        row.style.transform = `translateX(${dx}px)`;
        row.classList.toggle('swipe-ready', dx > 56);
      }
    });
    const end = () => {
      clearTimeout(pressTimer);
      pressTimer = null;
      if (swiping) {
        row.style.transform = '';
        row.classList.remove('swipe-ready');
        if (dx > 56) setReply(m);
        swiping = false;
      }
    };
    row.addEventListener('pointerup', (e) => {
      end();
      if (longPressed || e.target.closest('a,.reaction,.reply-quote')) return;
      const t = Date.now();
      if (t - lastTap < 300) {
        const chat = state.chats.get(m.chatId);
        react(m, chat.settings.quickReaction || '❤️');
        burst(row, chat.settings.quickReaction || '❤️');
        lastTap = 0;
      } else lastTap = t;
    });
    row.addEventListener('pointercancel', end);
    row.addEventListener('pointerleave', end);
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!longPressed) openMessageMenu(m);
    });
  }

  function burst(row, emoji) {
    const target = $('.msg-content', row);
    if (!target) return;
    const b = h('span', { class: 'burst' }, emoji);
    target.append(b);
    setTimeout(() => b.remove(), 800);
  }

  function openMessageMenu(m) {
    const chat = state.chats.get(m.chatId);
    const mine = m.from === state.me.id;
    const reactions = [...new Set([chat.settings.quickReaction, ...QUICK_REACTIONS])].slice(0, 7);
    const actions = [];
    actions.push(['reply', 'Reply', () => setReply(m)]);
    if (m.type === 'text') actions.push(['copy', 'Copy text', () => copyText(m.text).then(() => toast('Copied 📋'))]);
    if (m.type === 'sticker' && m.sticker.startsWith('c:') && !state.me.stickers.includes(m.sticker.slice(2))) {
      actions.push([
        'star',
        'Save sticker',
        async () => {
          try {
            const { user } = await api('/api/stickers/save', { method: 'POST', body: { key: m.sticker } });
            state.me = user;
            toast('Sticker saved to your collection ⭐');
          } catch (err) {
            toastError(err);
          }
        },
      ]);
    }
    if (mine) {
      actions.push([
        'trash',
        'Unsend',
        () =>
          state.socket.emit('unsend', { chatId: m.chatId, messageId: m.id }, (res) => {
            if (!res?.ok) toast(res?.error || 'Could not unsend', { kind: 'error' });
          }),
        'danger',
      ]);
    }

    const sheet = openSheet({
      className: 'msg-menu',
      content: [
        h(
          'div',
          { class: 'menu-preview' },
          m.type === 'sticker' ? stickerImg(m.sticker, 'menu') : h('div', { class: 'menu-preview-text' }, m.text),
          h('div', { class: 'muted small' }, `${mine ? 'You' : memberName(chat, m.from)} · ${fmtDay(m.createdAt)} ${fmtTime(m.createdAt)}`),
        ),
        h(
          'div',
          { class: 'react-bar' },
          reactions.map((e) =>
            h(
              'button',
              {
                class: `react-opt ${(m.reactions?.[e] || []).includes(state.me.id) ? 'active' : ''}`,
                onclick: () => {
                  react(m, e);
                  sheet.close();
                },
              },
              e,
            ),
          ),
          h(
            'button',
            {
              class: 'react-opt more',
              'aria-label': 'More reactions',
              onclick: () => {
                sheet.close();
                openEmojiSheet((e) => react(m, e));
              },
            },
            icon('plus'),
          ),
        ),
        h(
          'div',
          { class: 'menu-actions' },
          actions.map(([ic, label, fn, cls]) =>
            h(
              'button',
              {
                class: `menu-action ${cls || ''}`,
                onclick: () => {
                  sheet.close();
                  fn();
                },
              },
              icon(ic),
              label,
            ),
          ),
        ),
      ],
    });
  }

  function react(m, emoji) {
    state.socket.emit('react', { chatId: m.chatId, messageId: m.id, emoji }, (res) => {
      if (!res?.ok) toast(res?.error || 'Could not react', { kind: 'error' });
    });
  }

  function setReply(m) {
    const chat = state.chats.get(m.chatId);
    state.replyTo = m;
    const bar = $('#reply-bar');
    if (!bar) return;
    bar.hidden = false;
    bar.replaceChildren(
      icon('reply', 'accent-ink'),
      h(
        'div',
        { class: 'reply-bar-text' },
        h('div', { class: 'bold small' }, `Replying to ${m.from === state.me.id ? 'yourself' : memberName(chat, m.from)}`),
        h('div', { class: 'muted small ellipsis' }, m.type === 'sticker' ? 'Sticker ✨' : m.text),
      ),
      h('button', { class: 'icon-btn ghost', 'aria-label': 'Cancel reply', onclick: clearReply }, icon('x')),
    );
    $('#composer-input')?.focus();
  }

  function clearReply() {
    state.replyTo = null;
    const bar = $('#reply-bar');
    if (bar) bar.hidden = true;
  }

  // ---- Composer ----------------------------------------------------------

  let typingSent = false;
  let typingTimer = null;

  function stopTyping() {
    clearTimeout(typingTimer);
    if (typingSent && state.activeChatId) state.socket?.emit('typing', { chatId: state.activeChatId, typing: false });
    typingSent = false;
  }

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  function onComposerInput(e) {
    const el = e.target;
    autoGrow(el);
    updateSendButton();
    store.set(`draft.${state.activeChatId}`, el.value || null);
    if (!el.value.trim()) return stopTyping();
    if (!typingSent) {
      typingSent = true;
      state.socket?.emit('typing', { chatId: state.activeChatId, typing: true });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, 2500);
  }

  function onComposerKey(e) {
    const enterSends = state.me?.prefs?.enterToSend ?? !matchMedia('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && enterSends) {
      e.preventDefault();
      onSendClick();
    }
  }

  function updateSendButton() {
    const btn = $('#send-btn');
    const input = $('#composer-input');
    const chat = state.chats.get(state.activeChatId);
    if (!btn || !input || !chat) return;
    const hasText = !!input.value.trim();
    btn.classList.toggle('quick', !hasText);
    btn.replaceChildren(hasText ? icon('send') : h('span', { class: 'quick-emoji' }, chat.settings.quickReaction || '🙏'));
    btn.setAttribute('aria-label', hasText ? 'Send' : `Send ${chat.settings.quickReaction}`);
  }

  function onSendClick() {
    const input = $('#composer-input');
    const chat = state.chats.get(state.activeChatId);
    if (!input || !chat) return;
    const text = input.value.trim();
    if (!text) {
      sendMessage({ type: 'text', text: chat.settings.quickReaction || '🙏' });
      return;
    }
    sendMessage({ type: 'text', text });
    input.value = '';
    store.set(`draft.${chat.id}`, null);
    autoGrow(input);
    updateSendButton();
    stopTyping();
    if (!matchMedia('(pointer: coarse)').matches) input.focus();
  }

  function sendMessage({ type, text, sticker }) {
    const chatId = state.activeChatId;
    const s = state.msgs.get(chatId);
    if (!chatId || !s) return;
    const reply = state.replyTo;
    const clientId = uid();
    const optimistic = {
      id: clientId,
      clientId,
      chatId,
      from: state.me.id,
      type,
      text,
      sticker,
      reactions: {},
      createdAt: Date.now(),
      pending: true,
      replyTo: reply
        ? { id: reply.id, from: reply.from, type: reply.type, text: reply.text?.slice(0, 140) || '', sticker: reply.sticker || null }
        : undefined,
    };
    s.list.push(optimistic);
    state.newestId = clientId;
    clearReply();
    renderMessages({ toBottom: true });
    chime('out');
    emitSend(optimistic, reply?.id);
  }

  function emitSend(msg, replyToId) {
    const timeout = setTimeout(() => markFailed(msg), 15000);
    state.socket.emit(
      'send',
      { chatId: msg.chatId, type: msg.type, text: msg.text, sticker: msg.sticker, replyTo: replyToId || msg.replyTo?.id, clientId: msg.clientId },
      (res) => {
        clearTimeout(timeout);
        if (!res?.ok) {
          markFailed(msg);
          toast(res?.error || 'Message not sent', { kind: 'error' });
        }
      },
    );
  }

  function markFailed(msg) {
    const s = state.msgs.get(msg.chatId);
    const m = s?.list.find((x) => x.clientId === msg.clientId && x.pending);
    if (!m) return;
    m.failed = true;
    if (msg.chatId === state.activeChatId) renderMessages();
  }

  function retrySend(m) {
    m.failed = false;
    renderMessages();
    emitSend(m);
  }

  // ---- Emoji & sticker picker -------------------------------------------

  function togglePicker(kind) {
    setPicker(state.picker === kind ? null : kind);
  }

  function setPicker(kind) {
    state.picker = kind;
    const picker = $('#picker');
    if (!picker) return;
    $('#emoji-btn')?.classList.toggle('on', kind === 'emoji');
    $('#sticker-btn')?.classList.toggle('on', kind === 'sticker');
    if (!kind) {
      picker.hidden = true;
      return;
    }
    if (matchMedia('(pointer: coarse)').matches) $('#composer-input')?.blur();
    picker.hidden = false;
    if (kind === 'emoji') renderEmojiPicker(picker, insertEmoji);
    else renderStickerPicker(picker);
    scrollToBottom();
  }

  function insertEmoji(emoji) {
    const input = $('#composer-input');
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    const pos = start + emoji.length;
    input.setSelectionRange(pos, pos);
    input.dispatchEvent(new Event('input'));
  }

  function rememberEmoji(e) {
    const recent = store.get('recentEmoji', []);
    store.set('recentEmoji', [e, ...recent.filter((x) => x !== e)].slice(0, 32));
  }

  function renderEmojiPicker(root, onPick, { only } = {}) {
    const recent = store.get('recentEmoji', []);
    const cats = only
      ? [{ name: 'Choose', icon: only[0], emojis: only }, ...window.EMOJI_CATEGORIES]
      : [...(recent.length ? [{ name: 'Recent', icon: '🕘', emojis: recent }] : []), ...window.EMOJI_CATEGORIES];
    const grid = h('div', { class: 'emoji-scroll' });
    const tabs = h('div', { class: 'picker-tabs' });
    const sections = cats.map((c, i) => {
      const sec = h(
        'section',
        { class: 'emoji-section', 'data-i': i },
        h('h4', {}, c.name),
        h(
          'div',
          { class: 'emoji-grid' },
          c.emojis.map((e) =>
            h(
              'button',
              {
                class: 'emoji-btn',
                onclick: () => {
                  rememberEmoji(e);
                  onPick(e);
                },
              },
              e,
            ),
          ),
        ),
      );
      tabs.append(
        h(
          'button',
          {
            class: `picker-tab ${i === 0 ? 'active' : ''}`,
            title: c.name,
            onclick: () => grid.scrollTo({ top: sec.offsetTop - grid.offsetTop, behavior: 'smooth' }),
          },
          c.icon,
        ),
      );
      return sec;
    });
    grid.append(...sections);
    grid.addEventListener('scroll', () => {
      let active = 0;
      sections.forEach((s, i) => {
        if (s.offsetTop - grid.offsetTop <= grid.scrollTop + 10) active = i;
      });
      [...tabs.children].forEach((t, i) => t.classList.toggle('active', i === active));
    });
    root.replaceChildren(h('div', { class: 'picker-inner' }, tabs, grid));
  }

  function openEmojiSheet(onPick, only) {
    const content = h('div', { class: 'emoji-sheet' });
    const sheet = openSheet({ title: 'Pick an emoji', content });
    renderEmojiPicker(
      content,
      (e) => {
        onPick(e);
        sheet.close();
      },
      { only },
    );
  }

  function allStickerPacks() {
    const recent = store.get('recentStickers', []);
    const mine = (state.me.stickers || []).map((f) => ({ key: `c:${f}`, src: Stickers.src(`c:${f}`), name: 'My sticker' }));
    return [
      ...(recent.length ? [{ id: 'recent', name: 'Recent', icon: '🕘', stickers: recent.map((key) => ({ key, src: Stickers.src(key) })) }] : []),
      { id: 'mine', name: 'My stickers', icon: '⭐', stickers: mine, maker: true },
      ...state.packs,
      ...Stickers.builtinPacks,
    ];
  }

  function renderStickerPicker(root) {
    const packs = allStickerPacks();
    let current = store.get('stickerTab', packs.find((p) => p.stickers.length)?.id || 'kitty');
    if (!packs.some((p) => p.id === current)) current = packs[0].id;
    const body = h('div', { class: 'sticker-scroll' });
    const tabs = h('div', { class: 'picker-tabs' });

    function show(id) {
      current = id;
      store.set('stickerTab', id);
      [...tabs.children].forEach((t) => t.classList.toggle('active', t.dataset.id === id));
      const pack = packs.find((p) => p.id === id);
      const tiles = pack.stickers.map((s) =>
        h(
          'button',
          {
            class: 'sticker-tile',
            title: s.name || '',
            onclick: () => {
              const recent = store.get('recentStickers', []);
              store.set('recentStickers', [s.key, ...recent.filter((k) => k !== s.key)].slice(0, 24));
              sendMessage({ type: 'sticker', sticker: s.key });
            },
          },
          stickerImg(s.key),
        ),
      );
      if (pack.maker) {
        tiles.unshift(h('button', { class: 'sticker-tile maker', onclick: () => openStickerMaker() }, icon('plus'), h('span', {}, 'Make')));
      }
      const hint =
        pack.id === 'cats' && !pack.stickers.length
          ? h(
              'div',
              { class: 'pack-hint' },
              h('div', { class: 'empty-art' }, '🐈'),
              h('p', {}, 'Turn your cat pics into stickers!'),
              h('button', { class: 'btn primary sm', onclick: () => openStickerMaker() }, icon('image'), 'Sticker maker'),
            )
          : pack.id === 'mine' && !pack.stickers.length
            ? h('p', { class: 'muted small pack-note' }, 'Make stickers from your own pictures — like your cats 🐱')
            : null;
      body.replaceChildren(...[h('h4', {}, pack.name), hint, h('div', { class: 'sticker-grid' }, tiles)].filter(Boolean));
      body.scrollTop = 0;
    }

    for (const p of packs) {
      const preview = p.stickers[0];
      tabs.append(
        h(
          'button',
          { class: 'picker-tab', 'data-id': p.id, title: p.name, onclick: () => show(p.id) },
          p.id !== 'recent' && p.id !== 'mine' && preview ? h('img', { src: preview.src, alt: '' }) : p.icon,
        ),
      );
    }
    root.replaceChildren(h('div', { class: 'picker-inner' }, tabs, body));
    show(current);
  }

  // =========================================================================
  // Sticker maker
  // =========================================================================

  function openStickerMaker() {
    const SIZE = 320;
    const canvas = h('canvas', { width: SIZE * 2, height: SIZE * 2, class: 'maker-canvas' });
    const ctx = canvas.getContext('2d');
    const opts = { shape: 'circle', zoom: 1, x: 0, y: 0, caption: '', outline: true, captionColor: '#ff5f8f' };
    let img = null;

    const fileInput = h('input', {
      type: 'file',
      accept: 'image/png,image/jpeg,image/webp,image/gif',
      hidden: true,
      onchange: (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => {
          img = im;
          Object.assign(opts, { zoom: 1, x: 0, y: 0 });
          zoomInput.value = 1;
          draw(ctx, SIZE * 2);
          saveBtn.disabled = false;
          dropHint.hidden = true;
        };
        im.onerror = () => toast("Couldn't open that picture", { kind: 'error' });
        im.src = url;
      },
    });

    function shapePath(c, s, pad) {
      const w = s - pad * 2;
      c.beginPath();
      if (opts.shape === 'circle') c.arc(s / 2, s / 2, w / 2, 0, Math.PI * 2);
      else if (opts.shape === 'heart') {
        const x = pad;
        const y = pad + w * 0.06;
        c.moveTo(x + w / 2, y + w * 0.92);
        c.bezierCurveTo(x - w * 0.12, y + w * 0.5, x + w * 0.02, y - w * 0.06, x + w / 2, y + w * 0.2);
        c.bezierCurveTo(x + w * 0.98, y - w * 0.06, x + w * 1.12, y + w * 0.5, x + w / 2, y + w * 0.92);
      } else {
        const r = opts.shape === 'rounded' ? w * 0.22 : w * 0.06;
        c.roundRect(pad, pad, w, w, r);
      }
      c.closePath();
    }

    function draw(c, s) {
      c.clearRect(0, 0, s, s);
      if (!img) return;
      const pad = s * 0.05;
      const scaleCover = Math.max((s - pad * 2) / img.width, (s - pad * 2) / img.height) * opts.zoom;
      const w = img.width * scaleCover;
      const ht = img.height * scaleCover;
      const k = s / (SIZE * 2);
      if (opts.outline) {
        c.save();
        c.shadowColor = 'rgba(0,0,0,.25)';
        c.shadowBlur = s * 0.02;
        c.shadowOffsetY = s * 0.008;
        shapePath(c, s, pad);
        c.fillStyle = '#fff';
        c.fill();
        c.restore();
      }
      c.save();
      shapePath(c, s, pad + (opts.outline ? s * 0.025 : 0));
      c.clip();
      c.drawImage(img, (s - w) / 2 + opts.x * k, (s - ht) / 2 + opts.y * k, w, ht);
      c.restore();
      if (opts.caption) {
        const fs = s * 0.13;
        c.font = `900 ${fs}px Nunito, "Arial Rounded MT Bold", Arial, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'alphabetic';
        c.lineJoin = 'round';
        c.lineWidth = fs * 0.32;
        c.strokeStyle = '#fff';
        const y = s - pad - fs * 0.3;
        c.strokeText(opts.caption, s / 2, y, s - pad * 2);
        c.fillStyle = opts.captionColor;
        c.fillText(opts.caption, s / 2, y, s - pad * 2);
      }
    }

    // Drag to reposition
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (!img) return fileInput.click();
      drag = { x: e.clientX, y: e.clientY, ox: opts.x, oy: opts.y };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const ratio = (SIZE * 2) / canvas.getBoundingClientRect().width;
      opts.x = drag.ox + (e.clientX - drag.x) * ratio;
      opts.y = drag.oy + (e.clientY - drag.y) * ratio;
      draw(ctx, SIZE * 2);
    });
    canvas.addEventListener('pointerup', () => (drag = null));
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!img) return;
        e.preventDefault();
        opts.zoom = Math.min(4, Math.max(0.5, opts.zoom - e.deltaY * 0.0015));
        zoomInput.value = opts.zoom;
        draw(ctx, SIZE * 2);
      },
      { passive: false },
    );

    const zoomInput = h('input', {
      type: 'range',
      min: 0.5,
      max: 4,
      step: 0.01,
      value: 1,
      oninput: (e) => {
        opts.zoom = Number(e.target.value);
        draw(ctx, SIZE * 2);
      },
    });

    const seg = (name, choices) =>
      h(
        'div',
        { class: 'segmented' },
        choices.map(([v, label]) =>
          h(
            'button',
            {
              class: opts[name] === v ? 'on' : '',
              onclick: (e) => {
                opts[name] = v;
                [...e.currentTarget.parentNode.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget));
                draw(ctx, SIZE * 2);
              },
            },
            label,
          ),
        ),
      );

    const dropHint = h('div', { class: 'maker-drop' }, h('div', { class: 'empty-art' }, '🐱'), h('b', {}, 'Choose a picture'), h('span', { class: 'muted small' }, 'Your cat, your friends, anything!'));

    const saveBtn = h(
      'button',
      {
        class: 'btn primary block',
        disabled: true,
        onclick: async () => {
          if (!img) return;
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving…';
          try {
            const out = h('canvas', { width: 384, height: 384 });
            draw(out.getContext('2d'), 384);
            let data = out.toDataURL('image/webp', 0.9);
            if (!data.startsWith('data:image/webp')) data = out.toDataURL('image/png');
            const { user, sticker } = await api('/api/stickers', { method: 'POST', body: { data } });
            state.me = user;
            store.set('stickerTab', 'mine');
            sheet.close();
            toast(h('div', { class: 'toast-row' }, stickerImg(sticker, 'tiny'), h('span', {}, 'Sticker saved! Find it under ⭐')));
            if (state.picker === 'sticker') setPicker('sticker');
            if (state.tab === 'me') renderMe();
          } catch (err) {
            toastError(err);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save sticker';
          }
        },
      },
      'Save sticker',
    );

    const sheet = openSheet({
      title: 'Sticker maker',
      className: 'maker',
      content: [
        fileInput,
        h('div', { class: 'maker-stage' }, canvas, dropHint),
        h('button', { class: 'btn ghost block', onclick: () => fileInput.click() }, icon('image'), 'Choose picture'),
        h('div', { class: 'field' }, h('span', {}, 'Shape'), seg('shape', [['circle', '● Circle'], ['heart', '♥ Heart'], ['rounded', '▢ Rounded'], ['square', '■ Full']])),
        h('label', { class: 'field' }, h('span', {}, 'Zoom (drag the picture to move it)'), zoomInput),
        h(
          'label',
          { class: 'field' },
          h('span', {}, 'Caption (optional)'),
          h('input', {
            maxlength: 18,
            placeholder: 'e.g. feed me',
            oninput: (e) => {
              opts.caption = e.target.value;
              draw(ctx, SIZE * 2);
            },
          }),
        ),
        h(
          'div',
          { class: 'swatches small' },
          ['#ff5f8f', '#ff7a3d', '#8338ec', '#3a86ff', '#06d6a0', '#1b1230'].map((c) =>
            h('button', {
              class: `swatch ${c === opts.captionColor ? 'on' : ''}`,
              style: { background: c },
              'aria-label': `Caption colour ${c}`,
              onclick: (e) => {
                opts.captionColor = c;
                [...e.currentTarget.parentNode.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget));
                draw(ctx, SIZE * 2);
              },
            }),
          ),
        ),
        h(
          'label',
          { class: 'toggle-row' },
          h('span', {}, 'White sticker border'),
          h('input', {
            type: 'checkbox',
            class: 'switch',
            checked: true,
            onchange: (e) => {
              opts.outline = e.target.checked;
              draw(ctx, SIZE * 2);
            },
          }),
        ),
        h('div', { class: 'sheet-footer' }, saveBtn),
      ],
    });
  }

  // =========================================================================
  // Chat settings (customization)
  // =========================================================================

  function openChatSettings() {
    const chat = state.chats.get(state.activeChatId);
    if (!chat) return;
    const content = h('div', { class: 'settings' });
    const sheet = openSheet({ title: 'Customize chat', className: 'chat-settings', content });

    async function patch(body) {
      try {
        const { chat: updated } = await api(`/api/chats/${chat.id}`, { method: 'PATCH', body });
        state.chats.set(updated.id, updated);
        if (updated.id === state.activeChatId) {
          applyChatLook();
          renderChatHeader();
          renderMessages();
        }
        renderChatList();
        render();
      } catch (err) {
        toastError(err);
      }
    }

    function render() {
      const c = state.chats.get(chat.id);
      if (!c) return sheet.close();
      const s = c.settings;

      const sections = [];

      sections.push(
        h(
          'div',
          { class: 'settings-hero' },
          c.type === 'group'
            ? h(
                'button',
                { class: 'avatar group xl icon-pick', 'aria-label': 'Change group icon', onclick: () => openEmojiSheet((e) => patch({ icon: e }), GROUP_ICONS) },
                c.icon,
              )
            : avatar(otherMember(c), 'xl'),
          c.type === 'group'
            ? h('input', {
                class: 'title-input',
                value: c.name,
                maxlength: 40,
                'aria-label': 'Group name',
                onchange: (e) => patch({ name: e.target.value }),
              })
            : h('h3', {}, chatTitle(c)),
          c.type === 'direct' ? h('p', { class: 'muted small' }, `@${otherMember(c)?.username}`) : null,
        ),
      );

      // Live preview
      sections.push(
        h(
          'div',
          { class: 'theme-preview', style: { background: THEMES[s.theme]?.bg, '--bubble': s.bubble, '--bubble-ink': contrastInk(s.bubble) } },
          h('div', { class: 'tp-wall', style: { backgroundImage: wallpaperUrl(s.wallpaper, THEMES[s.theme]?.light ? 'rgba(60,20,80,.13)' : 'rgba(255,255,255,.09)') } }),
          h('div', { class: `tp-bubble theirs ${THEMES[s.theme]?.light ? 'light' : ''}` }, 'Did you feed the cats? 🐱'),
          h('div', { class: 'tp-bubble mine' }, 'Yes! They are napping now 😴'),
          h('div', { class: 'tp-react' }, s.quickReaction),
        ),
      );

      sections.push(
        h('h4', {}, 'Theme'),
        h(
          'div',
          { class: 'theme-grid' },
          Object.entries(THEMES).map(([key, t]) =>
            h(
              'button',
              { class: `theme-opt ${s.theme === key ? 'on' : ''}`, onclick: () => patch({ theme: key }) },
              h('span', { class: 'theme-swatch', style: { background: t.bg } }),
              h('span', { class: 'small' }, t.label),
            ),
          ),
        ),
      );

      sections.push(
        h('h4', {}, 'Bubble colour'),
        h(
          'div',
          { class: 'swatches' },
          BUBBLE_COLORS.map((col) =>
            h('button', { class: `swatch ${s.bubble === col ? 'on' : ''}`, style: { background: col }, 'aria-label': col, onclick: () => patch({ bubble: col }) }),
          ),
          h(
            'label',
            { class: 'swatch custom', title: 'Custom colour' },
            h('input', { type: 'color', value: s.bubble, onchange: (e) => patch({ bubble: e.target.value }) }),
            icon('plus', 'tiny'),
          ),
        ),
      );

      sections.push(
        h('h4', {}, 'Wallpaper'),
        h(
          'div',
          { class: 'wall-grid' },
          Object.entries(WALLPAPERS).map(([key, label]) =>
            h(
              'button',
              { class: `wall-opt ${s.wallpaper === key ? 'on' : ''}`, onclick: () => patch({ wallpaper: key }) },
              h('span', {
                class: 'wall-swatch',
                style: {
                  background: THEMES[s.theme]?.bg,
                  backgroundImage: `${wallpaperUrl(key, THEMES[s.theme]?.light ? 'rgba(60,20,80,.25)' : 'rgba(255,255,255,.25)')}, ${THEMES[s.theme]?.bg}`,
                },
              }),
              h('span', { class: 'small' }, label),
            ),
          ),
        ),
      );

      sections.push(
        h('h4', {}, 'Quick reaction'),
        h(
          'div',
          { class: 'row gap wrap' },
          [...new Set([s.quickReaction, '🙏', '❤️', '🔥', '😹', '🪷', '👍', '✨'])].map((e) =>
            h('button', { class: `chip-emoji ${s.quickReaction === e ? 'on' : ''}`, onclick: () => patch({ quickReaction: e }) }, e),
          ),
          h('button', { class: 'chip-emoji', 'aria-label': 'More', onclick: () => openEmojiSheet((e) => patch({ quickReaction: e })) }, icon('plus', 'tiny')),
        ),
        h('p', { class: 'muted small' }, 'Tap send with an empty message, or double-tap a message, to use it.'),
      );

      sections.push(
        h('h4', {}, 'Text size'),
        h(
          'div',
          { class: 'segmented' },
          [
            ['small', 'Small'],
            ['medium', 'Medium'],
            ['large', 'Large'],
          ].map(([v, label]) => h('button', { class: s.fontSize === v ? 'on' : '', onclick: () => patch({ fontSize: v }) }, label)),
        ),
      );

      sections.push(
        h('h4', {}, icon('ghost', 'tiny'), ' Disappearing messages'),
        h(
          'div',
          { class: 'segmented wrap' },
          DISAPPEAR.map(([v, label]) => h('button', { class: s.disappear === v ? 'on' : '', onclick: () => patch({ disappear: v }) }, label)),
        ),
        h('p', { class: 'muted small' }, 'New messages vanish for everyone after this time. 👻'),
      );

      sections.push(
        h('h4', {}, 'Nicknames'),
        h(
          'div',
          { class: 'nick-list' },
          c.members.map((m) =>
            h(
              'label',
              { class: 'nick-row' },
              avatar(getUser(m.id) || m, 'sm'),
              h('input', {
                placeholder: m.id === state.me.id ? `${m.displayName} (you)` : m.displayName,
                value: s.nicknames?.[m.id] || '',
                maxlength: 40,
                onchange: (e) => patch({ nickname: { userId: m.id, name: e.target.value } }),
              }),
            ),
          ),
        ),
      );

      sections.push(
        h('h4', {}, 'Just for me'),
        h(
          'label',
          { class: 'toggle-row' },
          h('span', {}, icon('pin', 'tiny'), ' Pin to top'),
          h('input', { type: 'checkbox', class: 'switch', checked: !!c.pinned, onchange: (e) => patch({ pinned: e.target.checked }) }),
        ),
        h(
          'label',
          { class: 'toggle-row' },
          h('span', {}, icon('mute', 'tiny'), ' Mute notifications'),
          h('input', { type: 'checkbox', class: 'switch', checked: !!c.muted, onchange: (e) => patch({ muted: e.target.checked }) }),
        ),
      );

      if (c.type === 'group') {
        sections.push(
          h('h4', {}, `Members (${c.members.length})`),
          h(
            'div',
            { class: 'member-list' },
            c.members.map((m) => {
              const u = getUser(m.id) || m;
              return h(
                'div',
                { class: 'member-row' },
                avatar(u, 'sm', { dot: true }),
                h('div', { class: 'grow' }, h('div', { class: 'bold' }, u.displayName, m.id === state.me.id ? ' (you)' : ''), h('div', { class: 'muted small' }, `@${u.username}`)),
              );
            }),
          ),
          h('button', { class: 'btn ghost block', onclick: () => openAddMembers(c) }, icon('plus'), 'Add people'),
        );
      }

      sections.push(
        h('h4', {}, 'Danger zone'),
        h(
          'div',
          { class: 'col gap' },
          h(
            'button',
            {
              class: 'btn ghost block danger-text',
              onclick: async () => {
                if (!(await confirmSheet('Clear this chat for everyone?', { ok: 'Clear chat', danger: true, detail: 'All messages will be deleted.' }))) return;
                api(`/api/chats/${c.id}/clear`, { method: 'POST' }).catch(toastError);
              },
            },
            icon('trash'),
            'Clear chat',
          ),
          c.type === 'group'
            ? h(
                'button',
                {
                  class: 'btn danger block',
                  onclick: async () => {
                    if (!(await confirmSheet(`Leave “${c.name}”?`, { ok: 'Leave group', danger: true }))) return;
                    try {
                      await api(`/api/chats/${c.id}/leave`, { method: 'POST' });
                      sheet.close();
                      state.chats.delete(c.id);
                      navigate('/');
                    } catch (err) {
                      toastError(err);
                    }
                  },
                },
                icon('logout'),
                'Leave group',
              )
            : null,
        ),
      );
      content.replaceChildren(...sections);
    }
    render();
  }

  function openAddMembers(chat) {
    const candidates = state.friends.filter((f) => !chat.members.some((m) => m.id === f)).map(getUser).filter(Boolean);
    const picked = new Set();
    const btn = h(
      'button',
      {
        class: 'btn primary block',
        disabled: true,
        onclick: async () => {
          try {
            const { chat: updated } = await api(`/api/chats/${chat.id}/members`, { method: 'POST', body: { members: [...picked] } });
            state.chats.set(updated.id, updated);
            sheet.close();
            toast('Added to the group 🎉');
          } catch (err) {
            toastError(err);
          }
        },
      },
      'Add',
    );
    const sheet = openSheet({
      title: 'Add people',
      content: candidates.length
        ? [
            h(
              'div',
              { class: 'pick-list' },
              candidates.map((f) =>
                h(
                  'label',
                  { class: 'pick-row' },
                  avatar(f, 'sm'),
                  h('div', { class: 'grow bold' }, f.displayName),
                  h('input', {
                    type: 'checkbox',
                    class: 'check',
                    onchange: (e) => {
                      e.target.checked ? picked.add(f.id) : picked.delete(f.id);
                      btn.disabled = !picked.size;
                    },
                  }),
                ),
              ),
            ),
            h('div', { class: 'sheet-footer' }, btn),
          ]
        : h('p', { class: 'muted' }, 'All your friends are already in this group!'),
    });
  }

  // =========================================================================
  // Friends: QR, links, scanning
  // =========================================================================

  const inviteLink = () => `${location.origin}/add/${state.me.inviteCode}`;

  function renderFriends() {
    const root = $('#tab-friends');
    if (!root || !state.me) return;
    const link = inviteLink();
    const friends = state.friends.map(getUser).filter(Boolean);
    friends.sort((a, b) => Number(!!b.online) - Number(!!a.online) || a.displayName.localeCompare(b.displayName));

    const codeInput = h('input', { placeholder: 'Friend code or link', autocapitalize: 'characters', spellcheck: 'false' });

    root.replaceChildren(
      h(
        'div',
        { class: 'qr-card', style: { '--av': state.me.avatar.color } },
        h('div', { class: 'qr-card-top' }, avatar(state.me, 'md'), h('div', {}, h('div', { class: 'bold' }, state.me.displayName), h('div', { class: 'small op' }, `@${state.me.username}`))),
        h(
          'div',
          { class: 'qr-frame' },
          h('img', { class: 'qr-img', src: `/api/qr.svg?text=${encodeURIComponent(link)}`, alt: 'Your friend QR code', width: 220, height: 220 }),
          h('div', { class: 'qr-center' }, state.me.avatar.emoji),
        ),
        h('p', { class: 'qr-caption' }, 'Friends scan this to add you instantly'),
        h('button', { class: 'code-chip', onclick: () => copyText(state.me.inviteCode).then(() => toast('Friend code copied')) }, `Code: ${state.me.inviteCode}`),
        h(
          'div',
          { class: 'qr-actions' },
          h(
            'button',
            {
              class: 'btn white',
              onclick: async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: 'Buddha Connect', text: `Add me on Buddha Connect! 🪷`, url: link });
                    return;
                  } catch (err) {
                    if (err.name === 'AbortError') return;
                  }
                }
                await copyText(link);
                toast('Invite link copied — send it to a friend! 🔗');
              },
            },
            icon('share'),
            'Share link',
          ),
          h('button', { class: 'btn white', onclick: () => copyText(link).then(() => toast('Link copied 🔗')) }, icon('copy'), 'Copy'),
          h('button', { class: 'btn white', onclick: openScanner }, icon('scan'), 'Scan'),
        ),
      ),
      h(
        'form',
        {
          class: 'add-code',
          onsubmit: (e) => {
            e.preventDefault();
            const code = extractCode(codeInput.value);
            if (!code) return toast('That doesn’t look like a friend code', { kind: 'error' });
            codeInput.value = '';
            showInvite(code);
          },
        },
        codeInput,
        h('button', { class: 'btn primary', type: 'submit' }, 'Add'),
      ),
      h('div', { class: 'section-title' }, h('h3', {}, `Friends`), h('span', { class: 'count' }, friends.length)),
      friends.length
        ? h(
            'div',
            { class: 'friend-list' },
            friends.map((f) =>
              h(
                'div',
                { class: 'friend-row' },
                avatar(f, 'md', { dot: true }),
                h(
                  'div',
                  { class: 'grow min0' },
                  h('div', { class: 'bold' }, f.displayName),
                  h('div', { class: 'muted small ellipsis' }, f.online ? h('span', { class: 'online-text' }, 'online') : `@${f.username}`, f.bio ? ` · ${f.bio}` : ''),
                ),
                h('button', { class: 'icon-btn accent', 'aria-label': `Chat with ${f.displayName}`, onclick: () => startDirect(f.id) }, icon('chat')),
                h('button', { class: 'icon-btn ghost', 'aria-label': 'More', onclick: () => friendMenu(f) }, icon('dots')),
              ),
            ),
          )
        : h(
            'div',
            { class: 'empty-state compact' },
            h('div', { class: 'empty-art' }, '🫶'),
            h('p', { class: 'muted' }, 'No friends yet. Show your QR code to a friend, or share your link!'),
          ),
      h(
        'button',
        {
          class: 'link-btn small center-block',
          onclick: async () => {
            if (!(await confirmSheet('Reset your friend link?', { ok: 'Reset', detail: 'Your old QR code and link will stop working. Existing friends stay friends.' }))) return;
            try {
              const { user } = await api('/api/me/invite/reset', { method: 'POST' });
              state.me = user;
              renderFriends();
              toast('New link ready ✨');
            } catch (err) {
              toastError(err);
            }
          },
        },
        'Reset my QR code & link',
      ),
    );
  }

  async function startDirect(friendId) {
    try {
      const { chat } = await api('/api/chats', { method: 'POST', body: { members: [friendId] } });
      state.chats.set(chat.id, chat);
      navigate(`/chat/${chat.id}`);
    } catch (err) {
      toastError(err);
    }
  }

  function friendMenu(f) {
    const sheet = openSheet({
      className: 'msg-menu',
      content: [
        h('div', { class: 'settings-hero' }, avatar(f, 'xl'), h('h3', {}, f.displayName), h('p', { class: 'muted small' }, `@${f.username}`), f.bio ? h('p', {}, f.bio) : null),
        h(
          'div',
          { class: 'menu-actions' },
          h('button', { class: 'menu-action', onclick: () => (sheet.close(), startDirect(f.id)) }, icon('chat'), 'Message'),
          h(
            'button',
            {
              class: 'menu-action danger',
              onclick: async () => {
                sheet.close();
                if (!(await confirmSheet(`Remove ${f.displayName} from your friends?`, { ok: 'Remove', danger: true, detail: 'Your chat history stays.' }))) return;
                try {
                  await api(`/api/friends/${f.id}`, { method: 'DELETE' });
                  state.friends = state.friends.filter((x) => x !== f.id);
                  renderFriends();
                } catch (err) {
                  toastError(err);
                }
              },
            },
            icon('trash'),
            'Remove friend',
          ),
        ),
      ],
    });
  }

  function extractCode(text) {
    const t = String(text || '').trim();
    const m = t.match(/\/add\/([A-Za-z0-9]{4,32})/);
    if (m) return m[1].toUpperCase();
    if (/^[A-Za-z0-9]{6,12}$/.test(t)) return t.toUpperCase();
    return null;
  }

  async function showInvite(code) {
    let info;
    try {
      info = await api(`/api/invite/${encodeURIComponent(code)}`);
    } catch (err) {
      return toastError(err);
    }
    const u = info.user;
    let btn;
    if (info.isSelf) {
      btn = h('p', { class: 'muted' }, "That's your own code! Share it with someone else 😄");
    } else if (info.alreadyFriends) {
      btn = h('button', { class: 'btn primary block', onclick: () => (sheet.close(), startDirect(u.id)) }, icon('chat'), 'You’re already friends — open chat');
    } else {
      btn = h(
        'button',
        {
          class: 'btn primary block lg',
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              const { chatId } = await api('/api/friends', { method: 'POST', body: { code } });
              await loadFriends();
              await loadChats();
              sheet.close();
              confetti();
              toast(`You and ${u.displayName} are now friends! 🎉`);
              navigate(`/chat/${chatId}`);
            } catch (err) {
              toastError(err);
              e.currentTarget.disabled = false;
            }
          },
        },
        icon('plus'),
        'Add friend',
      );
    }
    const sheet = openSheet({
      className: 'invite',
      content: h(
        'div',
        { class: 'settings-hero invite-hero' },
        h('div', { class: 'invite-glow' }, avatar(u, 'xl')),
        h('h3', {}, u.displayName),
        h('p', { class: 'muted' }, `@${u.username}`),
        u.bio ? h('p', { class: 'intro-bio' }, u.bio) : null,
        btn,
      ),
    });
  }

  function confetti() {
    const layer = h('div', { class: 'confetti' });
    const bits = ['🪷', '🎉', '✨', '💜', '🐱', '🌸'];
    for (let i = 0; i < 28; i++) {
      layer.append(
        h(
          'span',
          { style: { left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.4}s`, fontSize: `${16 + Math.random() * 18}px`, '--drift': `${(Math.random() - 0.5) * 120}px` } },
          bits[i % bits.length],
        ),
      );
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 2600);
  }

  // The camera is only used to read QR codes — nothing is ever captured or saved.
  function openScanner() {
    const video = h('video', { playsinline: true, muted: true, autoplay: true });
    const status = h('p', { class: 'scan-status' }, 'Point your camera at a friend’s Buddha Connect QR code');
    let stream = null;
    let raf = 0;
    let stopped = false;
    let detector = null;
    const canvas = document.createElement('canvas');
    const cctx = canvas.getContext('2d', { willReadFrequently: true });

    const sheet = openSheet({
      title: 'Scan QR code',
      className: 'scanner',
      content: [
        h('div', { class: 'scan-view' }, video, h('div', { class: 'scan-frame' }, h('span'), h('span'), h('span'), h('span')), h('div', { class: 'scan-line' })),
        status,
        h('p', { class: 'muted small center' }, 'Only scans codes — no photos are taken.'),
      ],
      onClose: stop,
    });

    function stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    }

    function found(text) {
      const code = extractCode(text);
      if (!code) {
        status.textContent = 'That QR code isn’t a Buddha Connect invite 🤔';
        return false;
      }
      navigator.vibrate?.(30);
      sheet.close();
      showInvite(code);
      return true;
    }

    async function loadJsQR() {
      if (window.jsQR) return;
      await new Promise((res, rej) => {
        const s = h('script', { src: '/vendor/jsQR.js' });
        s.onload = res;
        s.onerror = rej;
        document.head.append(s);
      });
    }

    let last = 0;
    async function tick(t) {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      if (t - last < 180 || video.readyState < 2) return;
      last = t;
      try {
        if (detector) {
          const codes = await detector.detect(video);
          if (codes[0] && found(codes[0].rawValue)) stop();
        } else if (window.jsQR) {
          const w = (canvas.width = Math.min(640, video.videoWidth));
          const hh = (canvas.height = Math.round((video.videoHeight / video.videoWidth) * w));
          cctx.drawImage(video, 0, 0, w, hh);
          const data = cctx.getImageData(0, 0, w, hh);
          const code = window.jsQR(data.data, w, hh, { inversionAttempts: 'dontInvert' });
          if (code && found(code.data)) stop();
        }
      } catch {
        /* keep scanning */
      }
    }

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        status.textContent = window.isSecureContext
          ? 'Your browser can’t use the camera. Ask your friend for their link or code instead.'
          : 'The camera needs a secure (https) connection. Ask your friend for their link or code instead.';
        return;
      }
      try {
        if ('BarcodeDetector' in window) {
          const formats = await window.BarcodeDetector.getSupportedFormats?.();
          if (!formats || formats.includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        }
        if (!detector) await loadJsQR();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return stop();
        video.srcObject = stream;
        await video.play().catch(() => {});
        raf = requestAnimationFrame(tick);
      } catch (err) {
        status.textContent =
          err?.name === 'NotAllowedError'
            ? 'Camera permission was blocked. You can still add friends with their link or code.'
            : 'Couldn’t start the camera. You can still add friends with their link or code.';
      }
    })();
  }

  // =========================================================================
  // Me / profile
  // =========================================================================

  function renderMe() {
    const root = $('#tab-me');
    if (!root || !state.me) return;
    const me = state.me;
    const draft = { displayName: me.displayName, bio: me.bio, avatar: { ...me.avatar } };

    const nameIn = h('input', { value: me.displayName, maxlength: 40, oninput: (e) => (draft.displayName = e.target.value) });
    const bioIn = h('input', { value: me.bio || '', maxlength: 140, placeholder: 'Something about you ✨', oninput: (e) => (draft.bio = e.target.value) });

    let previewEl = avatar(me, 'xl');
    const setPreview = () => {
      const n = avatar({ avatar: draft.avatar }, 'xl');
      previewEl.replaceWith(n);
      previewEl = n;
    };

    const emojiGrid = h(
      'div',
      { class: 'avatar-emoji-grid' },
      AVATAR_EMOJIS.map((e) =>
        h(
          'button',
          {
            class: `emoji-btn ${draft.avatar.emoji === e ? 'on' : ''}`,
            onclick: (ev) => {
              draft.avatar.emoji = e;
              [...emojiGrid.children].forEach((b) => b.classList.toggle('on', b === ev.currentTarget));
              setPreview();
            },
          },
          e,
        ),
      ),
      h(
        'button',
        {
          class: 'emoji-btn',
          'aria-label': 'More emoji',
          onclick: () =>
            openEmojiSheet((e) => {
              draft.avatar.emoji = e;
              setPreview();
            }),
        },
        icon('plus', 'tiny'),
      ),
    );

    const colorRow = h(
      'div',
      { class: 'swatches' },
      AVATAR_COLORS.map((c) =>
        h('button', {
          class: `swatch ${draft.avatar.color === c ? 'on' : ''}`,
          style: { background: c },
          'aria-label': c,
          onclick: (ev) => {
            draft.avatar.color = c;
            [...colorRow.children].forEach((b) => b.classList.toggle('on', b === ev.currentTarget));
            setPreview();
          },
        }),
      ),
    );

    const saveProfile = h(
      'button',
      {
        class: 'btn primary block',
        onclick: async () => {
          try {
            const { user } = await api('/api/me', { method: 'PATCH', body: draft });
            state.me = user;
            renderMeAvatar();
            renderMe();
            renderChatList();
            toast('Profile saved ✨');
          } catch (err) {
            toastError(err);
          }
        },
      },
      'Save profile',
    );

    const prefs = me.prefs || {};
    const setPref = async (patch) => {
      try {
        const { user } = await api('/api/me', { method: 'PATCH', body: { prefs: patch } });
        state.me = user;
        applyAppearance();
      } catch (err) {
        toastError(err);
      }
    };

    const myStickers = (me.stickers || []).map((f) =>
      h(
        'div',
        { class: 'sticker-tile manage' },
        stickerImg(`c:${f}`),
        h(
          'button',
          {
            class: 'sticker-del',
            'aria-label': 'Delete sticker',
            onclick: async () => {
              if (!(await confirmSheet('Remove this sticker from your collection?', { ok: 'Remove', danger: true }))) return;
              try {
                const { user } = await api(`/api/stickers/${encodeURIComponent(f)}`, { method: 'DELETE' });
                state.me = user;
                renderMe();
              } catch (err) {
                toastError(err);
              }
            },
          },
          icon('x', 'tiny'),
        ),
      ),
    );

    const oldPw = h('input', { type: 'password', placeholder: 'Current password', autocomplete: 'current-password' });
    const newPw = h('input', { type: 'password', placeholder: 'New password (6+ characters)', autocomplete: 'new-password', minlength: 6 });

    const notifOn = 'Notification' in window && Notification.permission === 'granted';

    root.replaceChildren(
      h(
        'div',
        { class: 'profile-card', style: { '--av': draft.avatar.color } },
        previewEl,
        h('h2', {}, me.displayName),
        h('p', { class: 'op' }, `@${me.username}`),
        me.bio ? h('p', { class: 'small' }, me.bio) : null,
        h('div', { class: 'profile-stats' }, h('div', {}, h('b', {}, state.friends.length), h('span', {}, 'friends')), h('div', {}, h('b', {}, state.chats.size), h('span', {}, 'chats')), h('div', {}, h('b', {}, (me.stickers || []).length), h('span', {}, 'stickers'))),
      ),
      h(
        'div',
        { class: 'card' },
        h('h3', {}, 'Edit profile'),
        h('label', { class: 'field' }, h('span', {}, 'Display name'), nameIn),
        h('label', { class: 'field' }, h('span', {}, 'Bio'), bioIn),
        h('div', { class: 'field' }, h('span', {}, 'Avatar'), emojiGrid),
        h('div', { class: 'field' }, h('span', {}, 'Avatar colour'), colorRow),
        saveProfile,
      ),
      h(
        'div',
        { class: 'card' },
        h('div', { class: 'row between' }, h('h3', {}, 'My stickers'), h('button', { class: 'btn primary sm', onclick: () => openStickerMaker() }, icon('plus'), 'Make one')),
        myStickers.length
          ? h('div', { class: 'sticker-grid' }, myStickers)
          : h('p', { class: 'muted small' }, 'Make stickers from your pictures — your cats would look amazing as stickers 🐱'),
      ),
      h(
        'div',
        { class: 'card' },
        h('h3', {}, 'Settings'),
        h(
          'div',
          { class: 'field' },
          h('span', {}, 'Appearance'),
          h(
            'div',
            { class: 'segmented' },
            [
              ['auto', 'Auto'],
              ['dark', 'Dark'],
              ['light', 'Light'],
            ].map(([v, label]) =>
              h(
                'button',
                {
                  class: (prefs.appearance || 'auto') === v ? 'on' : '',
                  onclick: (e) => {
                    [...e.currentTarget.parentNode.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget));
                    setPref({ appearance: v });
                  },
                },
                label,
              ),
            ),
          ),
        ),
        h('label', { class: 'toggle-row' }, h('span', {}, 'Sounds'), h('input', { type: 'checkbox', class: 'switch', checked: prefs.sounds !== false, onchange: (e) => setPref({ sounds: e.target.checked }) })),
        h(
          'label',
          { class: 'toggle-row' },
          h('span', {}, 'Enter key sends message'),
          h('input', {
            type: 'checkbox',
            class: 'switch',
            checked: prefs.enterToSend ?? !matchMedia('(pointer: coarse)').matches,
            onchange: (e) => setPref({ enterToSend: e.target.checked }),
          }),
        ),
        'Notification' in window
          ? h(
              'label',
              { class: 'toggle-row' },
              h('span', {}, 'Pop-up notifications'),
              h('input', {
                type: 'checkbox',
                class: 'switch',
                checked: notifOn,
                disabled: Notification.permission === 'denied',
                onchange: async (e) => {
                  if (e.target.checked) {
                    const p = await Notification.requestPermission();
                    e.target.checked = p === 'granted';
                    if (p !== 'granted') toast('Notifications are blocked in your browser settings');
                  } else {
                    toast('To turn notifications off fully, use your browser’s site settings');
                    e.target.checked = true;
                  }
                },
              }),
            )
          : null,
        h(
          'details',
          { class: 'pw-box' },
          h('summary', {}, 'Change password'),
          h(
            'div',
            { class: 'col gap' },
            oldPw,
            newPw,
            h(
              'button',
              {
                class: 'btn ghost',
                onclick: async () => {
                  try {
                    await api('/api/me', { method: 'PATCH', body: { password: oldPw.value, newPassword: newPw.value } });
                    oldPw.value = newPw.value = '';
                    toast('Password changed 🔒');
                  } catch (err) {
                    toastError(err);
                  }
                },
              },
              'Update password',
            ),
          ),
        ),
      ),
      h('button', { class: 'btn danger-soft block', onclick: logout }, icon('logout'), 'Log out'),
      h('p', { class: 'muted small center footer-note' }, 'Buddha Connect 🪷 made with love'),
    );
  }

  // =========================================================================
  // Boot
  // =========================================================================

  async function boot() {
    stashInviteFromUrl();
    if (!state.token) return renderAuth(sessionStorage.getItem('bc.invite') ? 'register' : 'login');
    try {
      const { user } = await api('/api/me');
      await startSession(user);
    } catch {
      state.token = null;
      store.set('token', null);
      renderAuth();
    }
  }

  window.addEventListener('resize', () => {
    if (state.activeChatId && document.activeElement?.id === 'composer-input') scrollToBottom();
  });

  boot();
})();
