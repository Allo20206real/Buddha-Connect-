'use strict';

// Lists the pictures in public/stickers/cats so the site (which has no server
// to look inside folders) knows which cat stickers exist. Runs automatically
// when the site is published; run `npm run cats` after adding pictures locally.

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'stickers', 'cats');
const files = fs
  .readdirSync(dir)
  .filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f) && /^[A-Za-z0-9_ .()-]{1,120}$/.test(f))
  .sort();

fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(files, null, 2) + '\n');
console.log(`Found ${files.length} cat sticker${files.length === 1 ? '' : 's'}.`);
