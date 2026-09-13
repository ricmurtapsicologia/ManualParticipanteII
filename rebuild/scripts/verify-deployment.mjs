const raw = process.argv[2];
if (!raw) throw new Error('Usage: npm run verify:deployment -- https://<deployment-url>');
const base = raw.replace(/\/$/, '');

const healthRes = await fetch(`${base}/api/health`, { redirect: 'follow' });
if (!healthRes.ok) throw new Error(`Health status ${healthRes.status}`);
const health = await healthRes.json();

const expected = {
  status: 'ok',
  architecture: 'rebuild-clean',
  wave: 8,
  pages: 249,
  corpus: 'canonical-hybrid-recovered'
};
for (const [key, value] of Object.entries(expected)) {
  if (health[key] !== value) throw new Error(`Health mismatch ${key}: ${health[key]} !== ${value}`);
}
if (health.deployment?.platform !== 'vercel') throw new Error(`Expected Vercel platform, got ${health.deployment?.platform}`);
if (health.deployment?.environment !== 'production') throw new Error(`Expected production environment, got ${health.deployment?.environment}`);
if (health.deployment?.branch !== 'rebuild-clean-v1') throw new Error(`Expected rebuild-clean-v1, got ${health.deployment?.branch}`);
if (!health.deployment?.commit || health.deployment.commit === 'local') throw new Error('Missing real Git commit SHA in Vercel health proof');

const homeRes = await fetch(base, { redirect: 'follow' });
if (!homeRes.ok) throw new Error(`Home status ${homeRes.status}`);
const html = await homeRes.text();
for (const token of ['Manual do Participante CATS', '249 páginas canônicas', 'data-page-count="249"', 'data-wave="8"']) {
  if (!html.includes(token)) throw new Error(`Home missing token: ${token}`);
}

console.log(`VERCEL_GATE_OK url=${base} pages=249 branch=${health.deployment.branch} commit=${health.deployment.commit}`);
