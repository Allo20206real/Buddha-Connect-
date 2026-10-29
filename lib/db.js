'use strict';

// A tiny database. Everything lives in memory and is saved (debounced)
// whenever something changes:
//   - to Postgres when DATABASE_URL is set (survives restarts on hosts like Render), or
//   - to a JSON file in DATA_DIR otherwise (handy for running on your own computer).
// Custom sticker images are stored the same way.

const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');
const STICKER_DIR = path.join(DATA_DIR, 'stickers');

const empty = () => ({ users: {}, sessions: {}, chats: {}, messages: {} });

// Callers hold on to this object, so loading fills it in place.
const data = empty();

let pool = null;
let timer = null;
let saving = Promise.resolve();
let dirty = false;

async function init() {
  if (DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    await pool.query(`CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS stickers (
      id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const { rows } = await pool.query(`SELECT value FROM app_state WHERE id = 'main'`);
    if (rows[0]) Object.assign(data, empty(), rows[0].value);
    console.log('Storage: Postgres (data survives restarts)');
    return;
  }

  fs.mkdirSync(STICKER_DIR, { recursive: true });
  if (fs.existsSync(FILE)) {
    try {
      Object.assign(data, empty(), JSON.parse(fs.readFileSync(FILE, 'utf8')));
    } catch (err) {
      const backup = `${FILE}.corrupt-${Date.now()}`;
      fs.copyFileSync(FILE, backup);
      console.error(`Could not read ${FILE}; starting fresh. The old file was kept at ${backup}.`, err);
    }
  }
  console.log(`Storage: ${FILE}`);
}

function writeNow() {
  dirty = false;
  const json = JSON.stringify(data);
  if (pool) {
    return pool.query(
      `INSERT INTO app_state (id, value, updated_at) VALUES ('main', $1, now())
       ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [json],
    );
  }
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, json);
  fs.renameSync(tmp, FILE);
  return Promise.resolve();
}

function flush() {
  timer = null;
  // Chain writes so they never overlap and always land in order.
  saving = saving
    .then(() => (dirty ? writeNow() : null))
    .catch((err) => {
      console.error('Saving failed, will retry:', err.message);
      dirty = true;
      timer ||= setTimeout(flush, 5000);
    });
  return saving;
}

function save() {
  dirty = true;
  if (!timer) timer = setTimeout(flush, pool ? 1000 : 250);
}

async function close() {
  clearTimeout(timer);
  timer = null;
  await flush();
  await pool?.end();
}

// ---- Sticker images --------------------------------------------------------

async function putSticker(id, mime, buf) {
  if (pool) {
    await pool.query(`INSERT INTO stickers (id, mime, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [id, mime, buf]);
  } else {
    fs.writeFileSync(path.join(STICKER_DIR, id), buf);
  }
}

async function getSticker(id) {
  if (pool) {
    const { rows } = await pool.query(`SELECT mime, data FROM stickers WHERE id = $1`, [id]);
    return rows[0] ? { mime: rows[0].mime, data: rows[0].data } : null;
  }
  const file = path.join(STICKER_DIR, path.basename(id));
  if (!fs.existsSync(file)) return null;
  const ext = path.extname(id).slice(1);
  return { mime: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`, data: fs.readFileSync(file) };
}

module.exports = { data, init, save, close, putSticker, getSticker, DATA_DIR };
