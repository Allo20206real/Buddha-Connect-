// Built-in sticker packs, drawn as SVG so they stay crisp at any size.
// Sticker keys: "b:<id>" built-in, "p:<file>" from stickers/cats, "c:<path>" user-made (Supabase storage).
(function () {
  const svgUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  // ---- Kitty pack -------------------------------------------------------
  const EYES = {
    happy: `<path d="M64 112q12-14 24 0M112 112q12-14 24 0" stroke="#2b1d16" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    open: `<circle cx="76" cy="110" r="10" fill="#2b1d16"/><circle cx="124" cy="110" r="10" fill="#2b1d16"/><circle cx="79" cy="106" r="3.5" fill="#fff"/><circle cx="127" cy="106" r="3.5" fill="#fff"/>`,
    wow: `<circle cx="76" cy="108" r="15" fill="#2b1d16"/><circle cx="124" cy="108" r="15" fill="#2b1d16"/><circle cx="81" cy="102" r="6" fill="#fff"/><circle cx="129" cy="102" r="6" fill="#fff"/><circle cx="71" cy="114" r="2.5" fill="#fff"/><circle cx="119" cy="114" r="2.5" fill="#fff"/>`,
    love: `<path d="M76 122l-13-13a8 8 0 0 1 13-9 8 8 0 0 1 13 9z" fill="#ff3d6e"/><path d="M124 122l-13-13a8 8 0 0 1 13-9 8 8 0 0 1 13 9z" fill="#ff3d6e"/>`,
    sleepy: `<path d="M64 112q12 8 24 0M112 112q12 8 24 0" stroke="#2b1d16" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    wink: `<circle cx="76" cy="110" r="10" fill="#2b1d16"/><circle cx="79" cy="106" r="3.5" fill="#fff"/><path d="M112 112q12-14 24 0" stroke="#2b1d16" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    angry: `<path d="M62 96l26 10M138 96l-26 10" stroke="#2b1d16" stroke-width="6" stroke-linecap="round"/><circle cx="78" cy="114" r="8" fill="#2b1d16"/><circle cx="122" cy="114" r="8" fill="#2b1d16"/>`,
    cry: `<path d="M64 110q12-8 24 0M112 110q12-8 24 0" stroke="#2b1d16" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M70 118q-6 14 0 22q6-8 0-22zM130 118q-6 14 0 22q6-8 0-22z" fill="#5ec8ff"/>`,
    zen: `<path d="M64 113q12 6 24 0M112 113q12 6 24 0" stroke="#2b1d16" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  };
  const MOUTH = {
    w: `<path d="M88 132q6 8 12 0q6 8 12 0" stroke="#2b1d16" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    open: `<path d="M88 130q12 22 24 0z" fill="#7a2338"/><path d="M94 138q6 6 12 0" fill="#ff8fa6"/>`,
    o: `<ellipse cx="100" cy="138" rx="7" ry="9" fill="#7a2338"/>`,
    flat: `<path d="M90 136h20" stroke="#2b1d16" stroke-width="4.5" stroke-linecap="round"/>`,
    sad: `<path d="M88 140q12-10 24 0" stroke="#2b1d16" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    tongue: `<path d="M88 132q6 8 12 0q6 8 12 0" stroke="#2b1d16" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M102 136q4 14 12 4z" fill="#ff7b9c"/>`,
  };
  const EXTRA = {
    heart: `<path d="M160 52l-16-16a10 10 0 0 1 16-12 10 10 0 0 1 16 12z" fill="#ff3d6e" stroke="#fff" stroke-width="4"/>`,
    zzz: `<text x="138" y="48" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-weight="900" font-size="30" fill="#7c6cff" stroke="#fff" stroke-width="5" paint-order="stroke">z</text><text x="160" y="30" font-family="Arial,sans-serif" font-weight="900" font-size="22" fill="#7c6cff" stroke="#fff" stroke-width="4" paint-order="stroke">z</text>`,
    sparkle: `<path d="M164 34l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="#ffd23f" stroke="#fff" stroke-width="3"/><path d="M34 52l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffd23f" stroke="#fff" stroke-width="2"/>`,
    anger: `<path d="M150 40l8 8m8-8l-8 8m-16 4l8-8m8 16l-8-8" stroke="#ff3d3d" stroke-width="6" stroke-linecap="round"/>`,
    lotus: `<g transform="translate(100 176)"><path d="M0 -34c12 12 12 26 0 34c-12-8-12-22 0-34z" fill="#ff8fc1" stroke="#fff" stroke-width="3"/><path d="M-6 0c-22 2-34-8-38-22c16-2 30 6 38 22z" fill="#ffb3d6" stroke="#fff" stroke-width="3"/><path d="M6 0c22 2 34-8 38-22c-16-2-30 6-38 22z" fill="#ffb3d6" stroke="#fff" stroke-width="3"/><ellipse cx="0" cy="4" rx="40" ry="7" fill="#4caf7d" stroke="#fff" stroke-width="3"/></g>`,
    paw: `<g transform="translate(160 132) rotate(-18)"><ellipse rx="18" ry="16" fill="var(--fur)" stroke="#fff" stroke-width="4"/><circle cx="-8" cy="2" r="4" fill="#ff9db6"/><circle cx="8" cy="2" r="4" fill="#ff9db6"/><circle cy="-6" r="4" fill="#ff9db6"/></g>`,
    tea: `<g transform="translate(150 150)"><path d="M-18 -10h36v14a18 18 0 0 1-36 0z" fill="#fff" stroke="#2b1d16" stroke-width="3"/><path d="M18 -4q12 0 8 10q-3 5-9 4" fill="none" stroke="#2b1d16" stroke-width="3"/><path d="M-6 -18q-4-6 0-12M4 -18q-4-6 0-12" stroke="#bbb" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
    sweat: `<path d="M150 70q-8 14 0 20q8-6 0-20z" fill="#5ec8ff" stroke="#fff" stroke-width="3"/>`,
  };

  function kitty({ fur = '#ffb36b', stripe = '#e8893c', eyes = 'open', mouth = 'w', extra = [], caption = '' }) {
    const stripes = stripe
      ? `<path d="M100 60v16M86 62l3 12M114 62l-3 12" stroke="${stripe}" stroke-width="6" stroke-linecap="round"/>`
      : '';
    const cap = caption
      ? `<text x="100" y="192" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial Black,Arial,sans-serif" font-weight="900" font-size="26" fill="#ff5f8f" stroke="#fff" stroke-width="8" paint-order="stroke" stroke-linejoin="round">${caption}</text>`
      : '';
    return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <g stroke="#fff" stroke-width="10" stroke-linejoin="round">
        <path d="M40 92L48 30L92 62z" fill="${fur}"/><path d="M160 92L152 30L108 62z" fill="${fur}"/>
        <ellipse cx="100" cy="116" rx="72" ry="58" fill="${fur}"/>
      </g>
      <path d="M50 78L54 44L80 62z" fill="#ffb3c4"/><path d="M150 78L146 44L120 62z" fill="#ffb3c4"/>
      ${stripes}
      <ellipse cx="62" cy="130" rx="11" ry="7" fill="#ff8fa6" opacity=".55"/><ellipse cx="138" cy="130" rx="11" ry="7" fill="#ff8fa6" opacity=".55"/>
      ${EYES[eyes]}
      <path d="M94 122h12l-6 7z" fill="#ff7b9c"/>
      ${MOUTH[mouth]}
      <path d="M34 120l26 4M34 134l26-2M166 120l-26 4M166 134l-26-2" stroke="#2b1d16" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>
      ${extra.map((e) => EXTRA[e].replaceAll('var(--fur)', fur)).join('')}
      ${cap}
    </svg>`);
  }

  const KITTY = [
    ['kitty-hi', 'Hi!', { eyes: 'happy', mouth: 'open', extra: ['paw'], caption: 'hi!' }],
    ['kitty-love', 'Love', { eyes: 'love', mouth: 'w', extra: ['heart'] }],
    ['kitty-zen', 'Zen', { fur: '#f6e7d0', stripe: '#d9b98f', eyes: 'zen', mouth: 'w', extra: ['lotus'] }],
    ['kitty-sleepy', 'Sleepy', { fur: '#9aa7c7', stripe: '#7a87a8', eyes: 'sleepy', mouth: 'o', extra: ['zzz'] }],
    ['kitty-wow', 'Wow', { eyes: 'wow', mouth: 'o', extra: ['sparkle'] }],
    ['kitty-angry', 'Grr', { fur: '#4a4a55', stripe: '', eyes: 'angry', mouth: 'flat', extra: ['anger'] }],
    ['kitty-cry', 'Cry', { fur: '#f2f2f2', stripe: '#c9c9c9', eyes: 'cry', mouth: 'sad' }],
    ['kitty-wink', 'Wink', { fur: '#2e2e36', stripe: '', eyes: 'wink', mouth: 'tongue', extra: ['sparkle'] }],
    ['kitty-tea', 'Tea time', { fur: '#e9c48a', stripe: '#c79a56', eyes: 'happy', mouth: 'w', extra: ['tea'] }],
    ['kitty-oops', 'Oops', { fur: '#ffb36b', eyes: 'open', mouth: 'flat', extra: ['sweat'] }],
    ['kitty-thanks', 'Thanks', { fur: '#f6e7d0', stripe: '#d9b98f', eyes: 'happy', mouth: 'w', caption: 'thank u' }],
    ['kitty-night', 'Good night', { fur: '#9aa7c7', stripe: '#7a87a8', eyes: 'sleepy', mouth: 'w', caption: 'gn' }],
  ].map(([id, name, opts]) => ({ key: `b:${id}`, name, src: kitty(opts) }));

  // ---- Vibes pack (emoji + caption) -------------------------------------
  function vibe(emoji, text, colors) {
    const [a, b] = colors;
    return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <text x="100" y="118" text-anchor="middle" font-size="96">${emoji}</text>
      <g transform="rotate(-6 100 160)">
        <rect x="${100 - (text.length * 9 + 22)}" y="138" width="${text.length * 18 + 44}" height="44" rx="22" fill="url(#g)" stroke="#fff" stroke-width="6"/>
        <text x="100" y="168" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial Black,Arial,sans-serif" font-weight="900" font-size="24" fill="#fff">${text}</text>
      </g>
    </svg>`);
  }

  const VIBES = [
    ['namaste', '🙏', 'namaste', ['#ff9a3d', '#ff3d7f']],
    ['lol', '😹', 'LOL', ['#ffcf3d', '#ff8a3d']],
    ['omg', '🙀', 'OMG', ['#8338ec', '#3a86ff']],
    ['loveu', '😻', 'love u', ['#ff5f8f', '#ff3d6e']],
    ['missu', '🥺', 'miss u', ['#7c6cff', '#c86cff']],
    ['yay', '🎉', 'yesss', ['#06d6a0', '#118ab2']],
    ['nope', '🙅', 'nope', ['#ef476f', '#b5179e']],
    ['brb', '☕', 'brb', ['#a0703d', '#d49a5a']],
    ['omw', '🏃', 'on my way', ['#3a86ff', '#06d6a0']],
    ['zen', '🪷', 'zen mode', ['#ff8fc1', '#8338ec']],
    ['gm', '☀️', 'good morning', ['#ffb703', '#fb8500']],
    ['hugs', '🫂', 'hugs', ['#f15bb5', '#9b5de5']],
  ].map(([id, emoji, text, colors]) => ({ key: `b:${id}`, name: text, src: vibe(emoji, text, colors) }));

  const BUILTIN = new Map([...KITTY, ...VIBES].map((s) => [s.key, s]));

  window.Stickers = {
    builtinPacks: [
      { id: 'kitty', name: 'Kitty', icon: '😺', stickers: KITTY },
      { id: 'vibes', name: 'Vibes', icon: '✨', stickers: VIBES },
    ],
    // Turn any sticker key into an image URL.
    src(key) {
      if (!key) return '';
      if (key.startsWith('b:')) return BUILTIN.get(key)?.src || '';
      if (key.startsWith('p:')) return 'stickers/cats/' + encodeURIComponent(key.slice(2));
      if (key.startsWith('c:')) return window.Backend ? window.Backend.stickerUrl(key.slice(2)) : '';
      return '';
    },
    kind(key) {
      return { b: 'builtin', p: 'pack', c: 'custom' }[key?.[0]] || 'builtin';
    },
  };
})();
