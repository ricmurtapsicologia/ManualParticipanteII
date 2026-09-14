import { spawn } from 'node:child_process';

const port = 3210;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start', '--', '-p', String(port)], { stdio: 'inherit' });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return r; } catch {}
    await sleep(500);
  }
  throw new Error(`Server did not become healthy: ${url}`);
}

try {
  const healthRes = await waitFor(`${base}/api/health`);
  const health = await healthRes.json();
  if (health.status !== 'ok' || health.pages !== 249 || health.app !== 'Manual do Participante CATS' || health.release !== '1.0.0') throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);
  const forbiddenHealthKeys = ['wave','architecture','corpus','branch','commit'];
  for (const key of forbiddenHealthKeys) if (Object.prototype.hasOwnProperty.call(health, key)) throw new Error(`Public health exposes internal key: ${key}`);

  const homeRes = await fetch(base);
  if (!homeRes.ok) throw new Error(`Home status ${homeRes.status}`);
  const html = await homeRes.text();
  for (const token of ['Manual do Participante CATS', 'Edição Digital Interativa', 'data-page-count="249"', 'data-product="manual-participante-cats"']) {
    if (!html.includes(token)) throw new Error(`Home missing token: ${token}`);
  }
  for (const token of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-reader-wave=']) {
    if (html.includes(token)) throw new Error(`Home exposes internal marker: ${token}`);
  }
  console.log('SMOKE_OK home=200 health=200 pages=249 public-metadata=clean product=manual-participante-cats release=1.0.0');
} finally {
  child.kill('SIGTERM');
  await sleep(300);
  if (!child.killed) child.kill('SIGKILL');
}
