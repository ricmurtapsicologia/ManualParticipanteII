import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const require = createRequire(import.meta.url);

const manifest = json('book/manifest.json');
const meta = json('book/meta.json');
const pages = json('book/pages-01.json');
const index = read('index.html');
const app = read('app.js');
const css = read('app.css');
const config = json('vercel.json');

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.complete, false);
assert.equal(manifest.targetPages, 249);
assert.equal(manifest.availablePages, 15);
assert.equal(manifest.expectedParts, 7);
assert.equal(manifest.expectedChapters, 34);
assert.equal(meta.parts.length, 7);
assert.equal(meta.chapters.length, 34);
assert.equal(pages.length, manifest.availablePages);
assert.equal(
  crypto.createHash('sha256').update(read('book/pages-01.json')).digest('hex'),
  manifest.chunks[0].sha256,
);
assert.deepEqual(pages.map((page) => page[0]), Array.from({ length: 15 }, (_, index) => index + 1));
assert.equal(pages[0][4], 'Abertura');
assert.equal(pages[7][4], 'O CATS e a prática profissional');
assert.equal(JSON.stringify(pages).includes('\uFFFD'), false);

for (const page of pages.slice(1)) {
  assert.ok(Array.isArray(page[5]), `Page ${page[0]} has no paragraph collection.`);
  assert.ok(page[5].length > 0, `Page ${page[0]} is blank.`);
}

for (const forbidden of ['atob(', 'DecompressionStream', 'window.B', 'cdn.jsdelivr.net']) {
  assert.equal(app.includes(forbidden) || index.includes(forbidden), false, `Forbidden active dependency: ${forbidden}`);
}
assert.equal(/data\d+\.js/.test(index), false, 'Legacy data scripts are still active in index.html.');
assert.ok(index.includes('/cover1.js'));
assert.ok(index.includes('/app.js'));
assert.ok(app.includes("fetchJson('/api/book'"));
assert.ok(css.includes('.page p,.scrollpage p,.bullet,.ref{text-align:justify'));
assert.ok(app.includes("const TTS_VOICE_NAME = 'Antônio'"));
assert.ok(app.includes("identity.includes('antonio') && language.startsWith('pt-br')"));
assert.ok(app.includes('utterance.voice = voice'));
assert.ok(index.includes('Leitura com a voz Antônio'));
assert.ok(config.rewrites.some((rule) => rule.source === '/manual-do-participante-cats'));

const invoke = async (handler) => {
  const result = { headers: {}, statusCode: null, body: null };
  const response = {
    setHeader(name, value) { result.headers[name.toLowerCase()] = value; },
    status(code) { result.statusCode = code; return this; },
    json(value) { result.body = value; return this; },
  };
  await handler({}, response);
  return result;
};

const bookResponse = await invoke(require(path.join(root, 'api/book.js')));
assert.equal(bookResponse.statusCode, 200);
assert.equal(bookResponse.body.availablePages, 15);
assert.equal(bookResponse.body.meta.chapters.length, 34);

const healthResponse = await invoke(require(path.join(root, 'api/health.js')));
assert.equal(healthResponse.statusCode, 200);
assert.equal(healthResponse.body.status, 'ok');
assert.equal(healthResponse.body.complete, false);

console.log(JSON.stringify({
  status: 'PASS',
  release: manifest.release,
  pages: pages.length,
  parts: meta.parts.length,
  chapters: meta.chapters.length,
  apiBook: bookResponse.statusCode,
  apiHealth: healthResponse.statusCode,
  typography: 'justified',
  ttsVoice: 'Antônio (pt-BR)',
  legacyBrowserPipeline: 'inactive',
}, null, 2));
