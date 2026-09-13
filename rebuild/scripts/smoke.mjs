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
  if (health.status !== 'ok' || health.pages !== 50 || health.wave !== 4 || health.architecture !== 'rebuild-clean') throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);

  const homeRes = await fetch(base);
  if (!homeRes.ok) throw new Error(`Home status ${homeRes.status}`);
  const html = await homeRes.text();
  for (const token of ['Manual do Participante CATS', '50 páginas reais', 'rebuild-clean-v1', 'data-page-count="50"', 'data-wave="4"']) {
    if (!html.includes(token)) throw new Error(`Home missing token: ${token}`);
  }
  console.log('SMOKE_OK home=200 health=200 pages=50 wave=4 architecture=rebuild-clean');
} finally {
  child.kill('SIGTERM');
  await sleep(300);
  if (!child.killed) child.kill('SIGKILL');
}
