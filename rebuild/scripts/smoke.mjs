import { spawn } from 'node:child_process';

const port = 3210;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start', '--', '-p', String(port)], { stdio: 'inherit' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(url, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try { const r = await fetch(url); if (r.ok) return r; } catch {}
    await sleep(500);
  }
  throw new Error(`Server did not become healthy: ${url}`);
}

try {
  const healthRes = await waitFor(`${base}/api/health`);
  const health = await healthRes.json();
  if (health.status !== 'ok' || health.pages !== 246 || health.chapters !== 34 || health.wave !== 10 || health.architecture !== 'rebuild-clean' || health.corpus !== 'canonical-hybrid-recovered') throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);
  if (!/ABNT NBR 6023:2018/iu.test(health.bibliography ?? '')) throw new Error(`Unexpected bibliography standard: ${health.bibliography}`);
  if (JSON.stringify(health.removedFrontMatterPages) !== JSON.stringify([2,4,5])) throw new Error(`Unexpected removed pages: ${JSON.stringify(health.removedFrontMatterPages)}`);
  if (health.deployment?.platform !== 'local' || health.deployment?.environment !== 'local' || health.deployment?.branch !== 'local' || health.deployment?.commit !== 'local') throw new Error(`Unexpected local deployment proof: ${JSON.stringify(health.deployment)}`);

  const homeRes = await fetch(base);
  if (!homeRes.ok) throw new Error(`Home status ${homeRes.status}`);
  const html = await homeRes.text();
  for (const token of ['Manual do Participante CATS', 'Edição Digital Interativa', 'data-page-count="246"']) if (!html.includes(token)) throw new Error(`Home missing token: ${token}`);
  for (const forbidden of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-semantic-renderer=', 'data-reader-wave=']) if (html.includes(forbidden)) throw new Error(`Home leaked backstage marker: ${forbidden}`);
  for (const removed of ['COMANDANTE-GERAL DO CBMMG','HIERARQUIA DE FONTES','Minutas V3.1 a V3.4']) if (html.includes(removed)) throw new Error(`Home leaked removed front-matter content: ${removed}`);
  console.log('SMOKE_OK home=200 health=200 pages=246 removed=2,4,5 chapters=34 wave=10 bibliography=ABNT-NBR-6023-2018-corrigida-2020 backstage=clean architecture=rebuild-clean deployment-proof=local');
} finally {
  child.kill('SIGTERM');
  await sleep(300);
  if (!child.killed) child.kill('SIGKILL');
}
