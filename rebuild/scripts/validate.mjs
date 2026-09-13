import { readFile } from 'node:fs/promises';

const pages = JSON.parse(await readFile(new URL('../content/pages.json', import.meta.url), 'utf8'));
const provenance = JSON.parse(await readFile(new URL('../content/provenance.json', import.meta.url), 'utf8'));
const pageSource = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const health = await readFile(new URL('../app/api/health/route.ts', import.meta.url), 'utf8');
const deployContract = JSON.parse(await readFile(new URL('../deployment-contract.json', import.meta.url), 'utf8'));
const deployVerifier = await readFile(new URL('./verify-deployment.mjs', import.meta.url), 'utf8');

const SOURCE_SHA256 = '892511fd392b8a3cbca876803244e3297c683f214f79f44823a3e29ff56e6be8';
const PDF_SHA256 = '7a8d9a0a0614e18af812ffe1c172b48a87e609b66ec8631eec15cb1ea15becbb';
const fail = message => { throw new Error(message); };

if (!Array.isArray(pages) || pages.length !== 249) fail(`Expected 249 pages, got ${pages?.length ?? 'invalid'}`);
pages.forEach((page, index) => {
  if (page.number !== index + 1) fail(`Unexpected number at page ${index + 1}: ${page.number}`);
  if (!page.title || !Array.isArray(page.paragraphs) || page.paragraphs.length === 0) fail(`Invalid page ${index + 1}`);
});
if (pages[0].cover !== true) fail('Page 1 must be the cover');
if (!/Eletricidade/i.test([pages[155].title, ...pages[155].paragraphs].join(' '))) fail('Page 156 does not contain the canonical electricity continuation');
if (!/Checklist final do participante/i.test([pages[248].title, ...pages[248].paragraphs].join(' '))) fail('Page 249 does not contain the final checklist');
if (!pages[248].paragraphs.join(' ').includes('Tenho um plano para revisar e praticar estas competências após o curso.')) fail('Page 249 canonical ending missing');

if (provenance.schema !== 4) fail(`Unexpected provenance schema: ${provenance.schema}`);
if (provenance.extractedPages !== 249) fail('Provenance extractedPages mismatch');
if (provenance.recoverableSequentialPages !== 155) fail(`Expected exact legacy recoverable prefix of 155 pages, got ${provenance.recoverableSequentialPages}`);
if (provenance.targetBookPages !== 249) fail(`Unexpected target book size: ${provenance.targetBookPages}`);
if (!provenance.sourceSha256 || !provenance.selectedSha256 || !provenance.sourceCommit) fail('Legacy provenance hashes/source missing');
if (provenance.recoveredTail?.generatedDigitalPages !== 94) fail('Recovered-tail page count mismatch');
if (provenance.recoveredTail?.digitalRange?.[0] !== 156 || provenance.recoveredTail?.digitalRange?.[1] !== 249) fail('Recovered-tail digital range mismatch');
if (provenance.recoveredTail?.sourceTextSha256 !== SOURCE_SHA256) fail('Recovered-tail text hash mismatch');
if (provenance.recoveredTail?.pdfSha256 !== PDF_SHA256) fail('Canonical PDF hash mismatch');
if (provenance.recoveredTail?.sourcePhysicalStartPage !== 90) fail('Canonical PDF start-page provenance mismatch');
if (provenance.recoveredTail?.sourceDerived !== true) fail('Recovered tail must be marked source-derived');
if (provenance.recoveredTail?.algorithm !== 'deterministic balanced paragraph reflow v1') fail('Unexpected reflow algorithm');

if (!/text-align:justify/.test(css)) fail('Paragraphs are not justified');
if (!/ant\[oô\]nio/i.test(pageSource)) fail('Antonio voice preference missing');
if (!/pt-br/i.test(pageSource)) fail('pt-BR fallback missing');
if (!/data-page-count=\{pages\.length\}/.test(pageSource)) fail('Stable page-count runtime contract missing');
if (!/data-wave="8"/.test(pageSource)) fail('Wave 8 runtime marker missing');
const executableSurface = pageSource + css;
if (/cdn\.jsdelivr\.net|https?:\/\/[^'"\s]*jsdelivr/i.test(executableSurface)) fail('jsDelivr dependency detected');
if (!/status:\s*'ok'/.test(health) || !/pages:\s*249/.test(health) || !/wave:\s*8/.test(health)) fail('Health contract mismatch');
for (const envName of ['VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF', 'VERCEL_GIT_COMMIT_SHA']) {
  if (!health.includes(envName)) fail(`Health deployment proof missing ${envName}`);
}
if (deployContract.projectName !== 'manual-participante-cats-digital') fail('Unexpected Vercel project name contract');
if (deployContract.productionBranch !== 'rebuild-clean-v1' || deployContract.rootDirectory !== 'rebuild') fail('Vercel Git/root contract mismatch');
if (deployContract.expected?.pages !== 249 || deployContract.expected?.environment !== 'production') fail('Vercel expected-state contract mismatch');
if (!deployVerifier.includes("health.deployment?.branch !== 'rebuild-clean-v1'")) fail('Remote verifier branch gate missing');
if (!deployVerifier.includes("health.deployment?.environment !== 'production'")) fail('Remote verifier production gate missing');

console.log(`VALIDATE_OK pages=249 legacy-prefix=155 recovered-tail=94 source=${SOURCE_SHA256.slice(0, 12)} justify=ok tts=Antonio->pt-BR jsdelivr=absent health=ok vercel-proof=armed`);
