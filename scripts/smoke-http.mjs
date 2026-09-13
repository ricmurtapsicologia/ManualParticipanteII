import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 43173;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['scripts/dev-server.mjs'], {
  cwd: root,
  env: { ...process.env, CATS_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Local server did not become ready.')), 5000);
  child.stdout.on('data', (chunk) => {
    if (chunk.toString().includes('listening on')) {
      clearTimeout(timer);
      resolve();
    }
  });
  child.once('exit', (code) => reject(new Error(`Local server exited with ${code}.`)));
});

try {
  await ready;
  const paths = ['/', '/manual-do-participante-cats', '/api/health', '/api/book', '/book/pages-01.json', '/app.js', '/cover1.js'];
  const results = [];
  for (const pathname of paths) {
    const response = await fetch(`${base}${pathname}`);
    const body = await response.text();
    assert.equal(response.status, 200, `${pathname} returned ${response.status}.`);
    assert.ok(body.length > 20, `${pathname} returned an unexpectedly small body.`);
    results.push({ pathname, status: response.status, bytes: Buffer.byteLength(body) });
  }
  const book = await fetch(`${base}/api/book`).then((response) => response.json());
  const health = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.equal(book.availablePages, 15);
  assert.equal(health.release, book.release);
  console.log(JSON.stringify({ status: 'PASS', checks: results }, null, 2));
} finally {
  child.kill('SIGTERM');
  await once(child, 'exit').catch(() => {});
}
