const raw = process.argv[2];
if (!raw) throw new Error('Usage: npm run verify:deployment -- https://<deployment-url>');
const base = raw.replace(/\/$/, '');

const healthRes = await fetch(`${base}/api/health`, { redirect: 'follow', cache: 'no-store' });
if (!healthRes.ok) throw new Error(`Health status ${healthRes.status}`);
const health = await healthRes.json();
for (const [key, value] of Object.entries({ status:'ok', architecture:'rebuild-clean', wave:10, chapters:34, corpus:'canonical-hybrid-recovered' })) {
  if (health[key] !== value) throw new Error(`Health mismatch ${key}: ${health[key]} !== ${value}`);
}
if (!Number.isInteger(health.pages) || health.pages <= 200 || health.pages >= 246) throw new Error(`Unexpected dynamic page count ${health.pages}`);
if (!/ABNT NBR 6023:2018/iu.test(health.bibliography ?? '')) throw new Error(`Unexpected bibliography standard ${health.bibliography}`);
if (health.deployment?.platform !== 'vercel') throw new Error(`Expected Vercel platform, got ${health.deployment?.platform}`);
if (health.deployment?.environment !== 'production') throw new Error(`Expected production environment, got ${health.deployment?.environment}`);
if (health.deployment?.branch !== 'main') throw new Error(`Expected main, got ${health.deployment?.branch}`);
if (!health.deployment?.commit || health.deployment.commit === 'local') throw new Error('Missing real Git commit SHA in Vercel health proof');

const homeRes = await fetch(base, { redirect: 'follow', cache: 'no-store' });
if (!homeRes.ok) throw new Error(`Home status ${homeRes.status}`);
const html = await homeRes.text();
for (const token of ['Manual do Participante CATS', `data-page-count="${health.pages}"`, 'data-testid="approved-cover"', 'wave54CoverIllustration', 'Baixar PDF', 'Baixar EPUB']) {
  if (!html.includes(token)) throw new Error(`Home missing token: ${token}`);
}
for (const forbidden of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-semantic-renderer=', 'data-reader-wave=']) if (html.includes(forbidden)) throw new Error(`Home leaked backstage marker: ${forbidden}`);

const pdfRes = await fetch(`${base}/api/manual`, { redirect:'follow', cache:'no-store' });
if (!pdfRes.ok || !(pdfRes.headers.get('content-type') ?? '').includes('application/pdf')) throw new Error(`PDF contract failed ${pdfRes.status}`);
if (pdfRes.headers.get('x-cats-editorial-edition') !== 'publication-grade-book-2026') throw new Error(`Unexpected PDF editorial edition ${pdfRes.headers.get('x-cats-editorial-edition')}`);
const epubRes = await fetch(`${base}/api/epub`, { redirect:'follow', cache:'no-store' });
if (!epubRes.ok || !(epubRes.headers.get('content-type') ?? '').includes('application/epub+zip')) throw new Error(`EPUB contract failed ${epubRes.status}`);

console.log(`VERCEL_GATE_OK url=${base} pages=${health.pages} chapters=34 branch=${health.deployment.branch} commit=${health.deployment.commit} pdf=professional-book epub=ok cover=vector`);
