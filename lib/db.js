'use strict';

// A tiny JSON-file database. Everything lives in memory and is written to
// disk (atomically, debounced) whenever something changes. Perfect for a
// friends-and-family sized chat app with zero setup.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

const empty = () => ({ users: {}, sessions: {}, chats: {}, messages: {} });

let data = empty();
if (fs.existsSync(FILE)) {
  try {
    data = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch (err) {
    const backup = `${FILE}.corrupt-${Date.now()}`;
    fs.copyFileSync(FILE, backup);
    console.error(`Could not read ${FILE}; starting fresh. The old file was kept at ${backup}.`, err);
  }
}

let timer = null;

function flush() {
  timer = null;
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, FILE);
}

function save() {
  if (!timer) timer = setTimeout(flush, 250);
}

function flushNow() {
  if (timer) {
    clearTimeout(timer);
    flush();
  }
}

process.on('exit', flushNow);
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    flushNow();
    process.exit(0);
  });
}

module.exports = { data, save, flushNow, DATA_DIR };
