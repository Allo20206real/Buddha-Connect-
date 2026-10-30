# 🪷 Buddha Connect

A cosy, colourful chat app, a bit like Snapchat but **just for chatting** (no camera, no photos).
Make an account, add friends by **scanning their QR code or sending a link**, and chat with
**emojis, stickers (including your own cats 🐈)** and **chats you can customise**.

It runs as a **GitHub Pages site**, with a free **Supabase** project storing accounts, messages
and stickers. Nothing ever sleeps or resets.

## Features

- **Accounts**: sign up with a username and password.
- **Friends by QR code or link**: every account has its own QR code, invite link and short friend code.
  - Scan a friend's QR code with the built-in scanner. The camera only reads codes and never takes photos.
  - Or share your link. If the person opening it doesn't have an account yet, they sign up and the
    invite is accepted automatically.
- **Chats**: one-to-one chats and group chats (up to 32 people), all live:
  - typing indicators, online status, and read receipts ("Delivered" → "Opened")
  - reactions (double-tap a message, or long-press for more)
  - replies (swipe right, or long-press → Reply), unsend, copy
  - messages made only of emoji show up big
- **Stickers**:
  - built-in **Kitty** and **Vibes** packs
  - a **Buddha & Portal** pack (your cats!) from `public/stickers/cats/`
  - a **sticker maker**: turn any picture into a circle, heart or rounded sticker with a caption
  - long-press a friend's sticker → **Save sticker**
- **Customise each chat** with the 🎨 button. Both people see the changes:
  - 10 themes, bubble colour, wallpapers, text size, nicknames
  - a quick-reaction emoji
  - 👻 disappearing messages
  - pin and mute (only for you)
- **Profile**: emoji avatar and colour, bio, dark/light mode, sounds, notifications.
- Works on phones and computers, and you can add it to your home screen.

## Set it up (about 10 minutes, all free)

### 1. Create the database (Supabase)

1. Go to <https://supabase.com>, sign up (GitHub login works) and click **New project**.
   Pick any name and database password, and the region closest to you.
2. When it's ready, open **SQL Editor** → **New query**. Paste in the whole of
   [`supabase/setup.sql`](supabase/setup.sql) and click **Run**. You should see "Success".
3. Open **Authentication** → **Sign In / Providers** → **Email**, turn **off** "Confirm email",
   and click **Save**. Buddha Connect uses usernames, not real email addresses.
4. Open **Project Settings** → **API** (or click **Connect** at the top) and copy:
   - the **Project URL**, like `https://abcdefgh.supabase.co`
   - the **anon / publishable key**, a long string. This key is safe to make public: the database
     rules from step 2 decide what each person can see.

### 2. Connect the site

Edit [`public/config.js`](public/config.js) on GitHub (pencil icon) and paste in the two values:

```js
window.BC_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
};
```

Commit the change to `main`.

### 3. Turn on GitHub Pages

In the GitHub repo, go to **Settings** → **Pages**, and under **Build and deployment → Source**
choose **GitHub Actions**.

That's it. Every push to `main` publishes the site; check the **Actions** tab to watch it. Your
link is shown on the Pages settings page, like:

**`https://<your-github-username>.github.io/Buddha-Connect-/`**

Open it on your phone, tap **Share → Add to Home Screen**, and send the link to your friends.

### Notifications while the app is closed (optional)

So people get messages and calls even when the app is closed:

1. In Supabase, open **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it `push`, and replace the example code with all of
   [`supabase/functions/push/index.ts`](supabase/functions/push/index.ts). Then click **Deploy**.
3. In the function's **Details** (or settings), turn **off** "Enforce JWT verification" and save.
   The database proves who it is with its own secret instead.
4. Make sure you've run the latest `supabase/setup.sql`.

Then each person turns it on for their phone in **Me → 🔔 Notifications when the app is closed**.
On iPhone (iOS 16.4+) this works once the app has been added to the Home Screen and opened from
there.

### Custom domain (optional)

In **Settings → Pages → Custom domain**, type your domain (e.g. `buddhaconnect.com`) and save.
Then add the DNS records GitHub shows you at your domain registrar, and tick **Enforce HTTPS**
once it's available. Invite links and QR codes switch to the new address automatically.

## Adding your cats as stickers 🐱

- **In the app**: open a chat → sticker button → ⭐ → **Make**, then choose a cat picture.
- **For everyone**: add pictures to `public/stickers/cats/` (PNG/JPG/WebP/GIF) and push.
  They appear in the **Buddha & Portal** pack. Transparent PNGs get a die-cut white outline.

## Try it on your computer

Fill in `public/config.js` (see above), then:

```bash
npm start
```

and open <http://localhost:3000>. There's nothing to install: the site is plain HTML/CSS/JS.

## How it's built

- `public/`: the whole site, with no build step.
  - `js/app.js`: the interface (chats, pickers, sticker maker, QR scanner, settings)
  - `js/backend.js`: everything that talks to Supabase (accounts, data, live updates)
  - `js/stickers.js`: the built-in sticker packs, drawn as SVG
  - `vendor/`: Supabase client, QR code generator and QR reader
- `supabase/setup.sql`: tables, security rules (row-level security) and database functions.
  It's safe to run again after updates.
- `.github/workflows/pages.yml`: publishes `public/` to GitHub Pages on every push to `main`.
- Live updates (messages, typing, online status) use Supabase Realtime.
