import { readFile } from 'node:fs/promises';

const pages = JSON.parse(await readFile(new URL('../content/pages.json', import.meta.url), 'utf8'));
const provenance = JSON.parse(await readFile(new URL('../content/provenance.json', import.meta.url), 'utf8'));
const pageSource = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const health = await readFile(new URL('../app/api/health/route.ts', import.meta.url), 'utf8');

const fail = (message) => { throw new Error(message); };
if (!Array.isArray(pages) || pages.length !== 25) fail(`Expected 25 pages, got ${pages?.length ?? 'invalid'}`);
pages.forEach((page, index) => {
  if (page.number !== index + 1) fail(`Unexpected number at page ${index + 1}: ${page.number}`);
  if (!page.title || !Array.isArray(page.paragraphs) || page.paragraphs.length === 0) fail(`Invalid page ${index + 1}`);
});
if (pages[0].cover !== true) fail('Page 1 must be the cover');
if (provenance.extractedPages !== 25 || provenance.totalLegacyPages < 25 || !provenance.sourceSha256) fail('Provenance contract mismatch');
if (!/text-align:justify/.test(css)) fail('Paragraphs are not justified');
if (!/ant\[oô\]nio/i.test(pageSource)) fail('Antonio voice preference missing');
if (!/pt-br/i.test(pageSource)) fail('pt-BR fallback missing');
const executableSurface = pageSource + css;
if (/cdn\.jsdelivr\.net|https?:\/\/[^'"\s]*jsdelivr/i.test(executableSurface)) fail('jsDelivr dependency detected');
if (!/status:\s*'ok'/.test(health) || !/pages:\s*25/.test(health) || !/wave:\s*3/.test(health)) fail('Health contract mismatch');
console.log(`VALIDATE_OK pages=25 sequence=1-25 provenance=${provenance.sourceSha256.slice(0, 12)} justify=ok tts=Antonio->pt-BR jsdelivr=absent health=ok`);
