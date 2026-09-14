import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const port = Number(process.env.CATS_PORT || 4173);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function runApi(modulePath, request, response) {
  const handler = require(path.join(root, modulePath));
  const adapter = {
    setHeader: (name, value) => response.setHeader(name, value),
    status(code) { response.statusCode = code; return this; },
    json(value) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(value));
    },
  };
  return handler(request, adapter);
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/api/book') return runApi('api/book.js', request, response);
  if (pathname === '/api/health') return runApi('api/health.js', request, response);

  const route = pathname === '/' || pathname === '/manual-do-participante-cats' || pathname === '/manual-do-participante-cats/'
    ? '/index.html'
    : pathname;
  const file = path.resolve(root, `.${route}`);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.statusCode = 404;
    return response.end('Not found');
  }
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Manual Digital CATS listening on http://127.0.0.1:${port}`);
});
