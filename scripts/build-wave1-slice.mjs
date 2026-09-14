import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = vm.createContext({ window: {} });

for (let index = 1; index <= 17; index += 1) {
  const source = fs.readFileSync(path.join(root, `data${index}.js`), 'utf8');
  vm.runInContext(source, context, { filename: `data${index}.js` });
}

const payload = context.window.B;
if (!payload) throw new Error('Legacy payload was not found.');

const partialJson = zlib.gunzipSync(Buffer.from(payload, 'base64'), {
  finishFlush: zlib.constants.Z_SYNC_FLUSH,
}).toString('utf8');

const metaStart = partialJson.indexOf('"meta":') + 7;
const pagesMarker = ',"pages":[';
const pagesMarkerAt = partialJson.indexOf(pagesMarker);
if (metaStart < 7 || pagesMarkerAt < 0) throw new Error('Legacy payload has no recognizable book schema.');

const meta = JSON.parse(partialJson.slice(metaStart, pagesMarkerAt));
const pages = [];
const pagesStart = pagesMarkerAt + pagesMarker.length;
let depth = 0;
let inString = false;
let escaped = false;
let itemStart = -1;

for (let cursor = pagesStart; cursor < partialJson.length && pages.length < 15; cursor += 1) {
  const character = partialJson[cursor];
  if (inString) {
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === '"') inString = false;
    continue;
  }
  if (character === '"') {
    inString = true;
    continue;
  }
  if (character === '[') {
    if (depth === 0) itemStart = cursor;
    depth += 1;
  } else if (character === ']') {
    depth -= 1;
    if (depth === 0 && itemStart >= 0) {
      pages.push(JSON.parse(partialJson.slice(itemStart, cursor + 1)));
      itemStart = -1;
    }
  }
}

if (pages.length !== 15) throw new Error(`Expected 15 recoverable pages, found ${pages.length}.`);
pages.forEach((page, index) => {
  if (page[0] !== index + 1) throw new Error(`Page sequence failed at ${index + 1}.`);
  if (JSON.stringify(page).includes('\uFFFD')) throw new Error(`Page ${index + 1} contains replacement characters.`);
});

const pagesJson = `${JSON.stringify(pages)}\n`;
const chunkHash = crypto.createHash('sha256').update(pagesJson).digest('hex');
const release = '2026.09.13-wave1';
const manifest = {
  schemaVersion: 1,
  release,
  title: 'Manual do Participante CATS',
  edition: 'Edição digital interativa • DS1 • 2026',
  complete: false,
  targetPages: 249,
  availablePages: pages.length,
  expectedParts: 7,
  expectedChapters: 34,
  chunks: [
    {
      id: '01',
      from: 1,
      to: pages.length,
      url: '/book/pages-01.json',
      sha256: chunkHash,
    },
  ],
  source: {
    repository: 'ricmurtapsicologia/ManualParticipanteII',
    branch: 'web-book-v1',
    recoveryPoint: '6eff9d2e7a8e60bcd2f2dbdd48b23003eb23d94b',
  },
};

fs.mkdirSync(path.join(root, 'book'), { recursive: true });
fs.writeFileSync(path.join(root, 'book', 'pages-01.json'), pagesJson);
fs.writeFileSync(path.join(root, 'book', 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'book', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Wave 1 slice generated: ${pages.length} pages, sha256 ${chunkHash}`);
