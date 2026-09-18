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
  if (health.status !== 'ok' || !Number.isInteger(health.pages) || health.pages < 200 || health.pages >= 246 || health.chapters !== 34 || health.wave !== 10 || health.architecture !== 'rebuild-clean' || health.corpus !== 'canonical-hybrid-recovered') throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);
  if (!/ABNT NBR 6023:2018/iu.test(health.bibliography ?? '')) throw new Error(`Unexpected bibliography standard: ${health.bibliography}`);
  if (health.publication?.cumulativeReview !== 'removed' || health.publication?.videoAccess !== 'removed' || health.publication?.pdfFormat !== 'BOOK-11.2-16' || health.publication?.justification !== 'full' || health.publication?.maxResidualBlankArea !== '20%' || health.publication?.overlapGuard !== true || health.publication?.cover !== 'vector-strong-branding') throw new Error(`Unexpected publication hotfix proof: ${JSON.stringify(health.publication)}`);
  if (health.deployment?.platform !== 'local' || health.deployment?.environment !== 'local' || health.deployment?.branch !== 'local' || health.deployment?.commit !== 'local') throw new Error(`Unexpected local deployment proof: ${JSON.stringify(health.deployment)}`);

  const homeRes = await fetch(base);
  if (!homeRes.ok) throw new Error(`Home status ${homeRes.status}`);
  const html = await homeRes.text();
  for (const token of ['Manual do Participante CATS', 'Edição Digital Interativa', `data-page-count="${health.pages}"`, 'data-testid="approved-cover"', 'data-testid="approved-cover-image"', 'manual-cats-capa-digital-2026.jpg']) if (!html.includes(token)) throw new Error(`Home missing token: ${token}`);
  if (html.includes('data-testid="canonical-hero"')) throw new Error('Duplicate canonical hero is still rendered');
  const pdfRes = await fetch(`${base}/api/manual`);
  if (!pdfRes.ok || !(pdfRes.headers.get('content-type') ?? '').includes('application/pdf')) throw new Error(`PDF contract failed ${pdfRes.status}`);
  const epubRes = await fetch(`${base}/api/epub`);
  if (!epubRes.ok || !(epubRes.headers.get('content-type') ?? '').includes('application/epub+zip')) throw new Error(`EPUB contract failed ${epubRes.status}`);
  for (const forbidden of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-semantic-renderer=', 'data-reader-wave=', 'ApplicationTransferCard', 'VideoResourceCard']) if (html.includes(forbidden)) throw new Error(`Home leaked marker: ${forbidden}`);
  console.log(`SMOKE_OK home=200 health=200 pages=${health.pages} chapters=34 review=removed transfer=removed video=removed pdf=BOOK-11.2-16 cover=single-canonical density<=20pct overlap-guard=on`);
} finally {
  child.kill('SIGTERM');
  await sleep(300);
  if (!child.killed) child.kill('SIGKILL');
}
