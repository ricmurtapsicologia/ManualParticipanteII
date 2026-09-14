import { spawn } from 'node:child_process';

const port = 3210;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start', '--', '-p', String(port)], { stdio: 'inherit' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try { const response = await fetch(url); if (response.ok) return response; } catch {}
    await sleep(500);
  }
  throw new Error(`Server did not become healthy: ${url}`);
}

try {
  const healthRes = await waitFor(`${base}/api/health`);
  const health = await healthRes.json();
  if (health.status !== 'ok' || health.pages !== 249 || health.chapters !== 34 || health.release !== '1.0.0' || health.gate !== 'wave10-release' || health.architecture !== 'rebuild-clean') throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);
  if (health.deployment?.platform !== 'local' || health.deployment?.environment !== 'local' || health.deployment?.branch !== 'local' || health.deployment?.commit !== 'local') throw new Error(`Unexpected local deployment proof: ${JSON.stringify(health.deployment)}`);

  const homeRes = await fetch(base);
  if (!homeRes.ok) throw new Error(`Home status ${homeRes.status}`);
  const html = await homeRes.text();
  for (const token of ['Manual do Participante CATS', 'Edição Digital Interativa', '249 páginas']) {
    if (!html.includes(token)) throw new Error(`Home missing token: ${token}`);
  }
  for (const forbidden of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-semantic-renderer=', 'data-multimedia-wave=', 'data-reader-wave=', 'ChatGPT', 'system prompt']) {
    if (html.includes(forbidden)) throw new Error(`Frontend release residue: ${forbidden}`);
  }
  console.log('SMOKE_OK home=200 health=200 pages=249 chapters=34 release=1.0.0 frontend-residue=0');
} finally {
  child.kill('SIGTERM');
  await sleep(300);
  if (!child.killed) child.kill('SIGKILL');
}
