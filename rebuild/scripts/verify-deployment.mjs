const raw = process.argv[2];
if (!raw) throw new Error('Usage: npm run verify:deployment -- https://<deployment-url>');
const base = raw.replace(/\/$/, '');

const healthRes = await fetch(`${base}/api/health`, { redirect: 'follow' });
if (!healthRes.ok) throw new Error(`Health status ${healthRes.status}`);
const health = await healthRes.json();

const expected = {
  status: 'ok',
  architecture: 'rebuild-clean',
  wave: 10,
  pages: 246,
  chapters: 34,
  corpus: 'canonical-hybrid-recovered'
};
for (const [key, value] of Object.entries(expected)) {
  if (health[key] !== value) throw new Error(`Health mismatch ${key}: ${health[key]} !== ${value}`);
}
if (!/ABNT NBR 6023:2018/iu.test(health.bibliography ?? '')) throw new Error(`Unexpected bibliography standard ${health.bibliography}`);
if (JSON.stringify(health.removedFrontMatterPages) !== JSON.stringify([2,4,5])) throw new Error(`Removed page proof mismatch: ${JSON.stringify(health.removedFrontMatterPages)}`);
if (health.deployment?.platform !== 'vercel') throw new Error(`Expected Vercel platform, got ${health.deployment?.platform}`);
if (health.deployment?.environment !== 'production') throw new Error(`Expected production environment, got ${health.deployment?.environment}`);
if (health.deployment?.branch !== 'main') throw new Error(`Expected main, got ${health.deployment?.branch}`);
if (!health.deployment?.commit || health.deployment.commit === 'local') throw new Error('Missing real Git commit SHA in Vercel health proof');

const homeRes = await fetch(base, { redirect: 'follow' });
if (!homeRes.ok) throw new Error(`Home status ${homeRes.status}`);
const html = await homeRes.text();
for (const token of ['Manual do Participante CATS', 'data-page-count="246"']) {
  if (!html.includes(token)) throw new Error(`Home missing token: ${token}`);
}
for (const forbidden of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-semantic-renderer=', 'data-reader-wave=']) if (html.includes(forbidden)) throw new Error(`Home leaked backstage marker: ${forbidden}`);
for (const removed of ['COMANDANTE-GERAL DO CBMMG','HIERARQUIA DE FONTES','Minutas V3.1 a V3.4']) if (html.includes(removed)) throw new Error(`Home leaked removed content: ${removed}`);

console.log(`VERCEL_GATE_OK url=${base} pages=246 removed=2,4,5 wave=10 branch=${health.deployment.branch} commit=${health.deployment.commit}`);
