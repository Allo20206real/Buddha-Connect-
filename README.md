# 🪷 Buddha Connect

A cosy, colourful chat app, a bit like Snapchat but **just for chatting** (no camera, no photos).
Make an account, add friends by **scanning their QR code or sending a link**, and chat with
**emojis, stickers (including your own cats 🐈)** and **chats you can customise**.

## Features

- **Accounts**: sign up with a username and password.
- **Friends by QR code or link**: every account has its own QR code, invite link and short friend code.
  - Scan a friend's QR code with the built-in scanner. The camera only reads codes and never takes photos.
  - Or share your link (`https://your-site/add/ABCD2345`). If the person opening it doesn't have an
    account yet, they sign up and the invite is accepted automatically.
- **Chats**: one-to-one chats and group chats (up to 32 people), all in real time:
  - typing indicators, online status / last seen, and read receipts ("Delivered" → "Opened")
  - reactions (double-tap a message for your quick reaction, or long-press for more)
  - replies (swipe a message right, or long-press → Reply), unsend, copy
  - links are clickable, and messages made only of emoji show up big
- **Emojis**: a full picker with categories and recently used emoji.
- **Stickers**:
  - **Kitty** pack: 12 hand-drawn cat stickers (hi, love, zen, sleepy, grr…)
  - **Vibes** pack: emoji + caption stickers (namaste, LOL, miss u, on my way…)
  - **My Cats** pack: any picture you drop in `public/stickers/cats/` becomes a sticker for everyone
  - **Sticker maker**: turn any picture into a sticker in the app. Crop it into a circle, heart or
    rounded square, zoom and drag it into place, add a caption and a white sticker border.
  - Long-press someone's custom sticker → **Save sticker** to keep it.
- **Customise each chat** (tap the 🎨 button in a chat). Both people see the changes:
  - 10 themes (Lotus, Sunset, Ocean, Forest, Midnight, Aurora, Ember, Mono, Candy, Sakura)
  - bubble colour (presets or any custom colour)
  - wallpapers (dots, paws, lotus, hearts, stars, waves, grid)
  - a quick-reaction emoji (tap send on an empty message to send it)
  - text size and nicknames
  - 👻 disappearing messages (5 min, 1 hour, 24 hours, 7 days)
  - pin and mute (only for you)
- **Profile**: emoji avatar and colour, bio, dark/light/auto mode, sounds, notifications.
- Works on phones and computers. You can **install it to your home screen** (it's a PWA).

## Run it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

To try it with two accounts on one computer, open a second browser (or a private window), create
another account, and paste the first account's invite link.

### Put it online (get a link to share) 🚀

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Allo20206real/Buddha-Connect-)

1. Click the button and sign in to Render (free).
2. Click **Apply**. A few minutes later you get a link like `https://buddha-connect.onrender.com`.
3. Open that link on your phone, tap **Share → Add to Home Screen**, and send the link to your friends.

**Custom domain:** in Render, open your service → **Settings → Custom Domains → Add**, type your
domain (e.g. `buddhaconnect.com`), then add the DNS record Render shows you at your domain
registrar. Render sets up HTTPS automatically. Invite links and QR codes always use whatever
address the app is opened on, so they switch to your domain by themselves.

### Keep accounts and chats forever (free database) 💾

Render's free plan wipes its own disk on every restart, so the app saves everything in a
free Postgres database instead:

1. Sign up at <https://neon.tech> (free) and create a project.
2. Copy the **connection string** (it starts with `postgresql://`).
3. In Render, open your service → **Environment** → **Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: the connection string
   Then click **Save, rebuild and deploy**.

The Render logs then say `Storage: Postgres (data survives restarts)`. Accounts, messages,
chat settings and custom stickers are now kept for good.

On the free plan, the app still goes to sleep when nobody uses it, and the first visit afterwards
takes about 30 seconds.

### Using it on your phones

To chat with friends on their own phones, the app has to run somewhere they can reach:

- **Same Wi-Fi**: run `npm start` on your computer, then on your phone open
  `http://<your-computer's-IP>:3000`. Chatting and invite links work. The QR **scanner** needs
  HTTPS, though; browsers only allow the camera on secure sites.
- **Online (recommended)**: deploy to any Node host (Render, Railway, Fly.io, a VPS…) with HTTPS.
  - The start command is `npm start`, and the port comes from the `PORT` environment variable.
  - Set `DATABASE_URL` to a Postgres database so data survives restarts (see above).

## Adding your cats as stickers 🐱

Two ways:

1. **In the app**: open a chat → sticker button → ⭐ → **Make**, then choose a cat picture.
2. **For everyone**: put the pictures in `public/stickers/cats/` (PNG/JPG/WebP/GIF). They show up
   right away in the **My Cats** pack. Transparent PNGs (background removed) look best, because
   they get a die-cut white outline.

## How it's built

- `server.js`: Express REST API plus Socket.IO for real-time messages, typing, reactions and presence.
- `lib/db.js`: a tiny database kept in memory and saved to Postgres when `DATABASE_URL` is set, or
  to `data/db.json` otherwise. Nothing to set up for running locally.
- `public/`: the app itself, in plain HTML/CSS/JS with no build step.
  - `js/app.js`: the whole UI (chats, pickers, sticker maker, QR scanner, settings)
  - `js/stickers.js`: the built-in sticker packs, drawn as SVG
  - `js/emoji-data.js`: the emoji picker data
- Passwords are hashed with bcrypt. QR codes are generated on the server (`qrcode`), and scanning
  uses the browser's `BarcodeDetector`, falling back to `jsQR`.
