import { readFile } from 'node:fs/promises';

const pages = JSON.parse(await readFile(new URL('../content/pages.json', import.meta.url), 'utf8'));
const pageSource = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');
const health = await readFile(new URL('../app/api/health/route.ts', import.meta.url), 'utf8');

const fail = (message) => { throw new Error(message); };
if (!Array.isArray(pages) || pages.length !== 10) fail(`Expected 10 pages, got ${pages?.length ?? 'invalid'}`);
pages.forEach((page, index) => {
  if (!page.title || !Array.isArray(page.paragraphs) || page.paragraphs.length === 0) fail(`Invalid page ${index + 1}`);
});
if (!/text-align:justify/.test(css)) fail('Paragraphs are not justified');
if (!/ant\[oô\]nio/i.test(pageSource)) fail('Antonio voice preference missing');
if (!/pt-br/i.test(pageSource)) fail('pt-BR fallback missing');
if (/jsdelivr/i.test(pageSource + css + JSON.stringify(pages))) fail('jsDelivr dependency detected');
if (!/status:\s*'ok'/.test(health) || !/pages:\s*10/.test(health)) fail('Health contract mismatch');
console.log('VALIDATE_OK pages=10 justify=ok tts=Antonio->pt-BR jsdelivr=absent health=ok');
