import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfPath = path.join(root, 'public', 'downloads', 'Manual-do-Participante-CATS-Edicao-Digital-2026.pdf');
const textPath = path.join(root, 'reports', 'pdf-extracted.txt');
const reportPath = path.join(root, 'reports', 'parity-report.json');
const [semantic, navigation, preflight] = await Promise.all([
  readFile(path.join(root, 'content', 'semantic-pages.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'content', 'navigation.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'public', 'downloads', 'manual-preflight.json'), 'utf8').then(JSON.parse)
]);
await mkdir(path.dirname(textPath), { recursive: true });
const pdftotext = spawnSync('pdftotext', ['-layout', '-nopgbrk', pdfPath, textPath], { encoding: 'utf8' });
if (pdftotext.status !== 0) throw new Error(`pdftotext falhou: ${pdftotext.stderr || pdftotext.stdout}`);
const extracted = await readFile(textPath, 'utf8');
const normalize = value => String(value ?? '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u00ad\u200b]/g, '')
  .replace(/-\s*\n\s*/g, '')
  .replace(/\s+/g, ' ').trim().toLowerCase();
const pdfText = normalize(extracted);
const blocks = (semantic.pages ?? []).flatMap(page => [
  { page: page.number, kind: 'page-title', text: page.title },
  ...(page.blocks ?? []).map(block => ({ page: page.number, kind: block.kind, text: block.text }))
]).filter(item => normalize(item.text).length > 1);
const missing = [];
for (const item of blocks) {
  const n = normalize(item.text);
  if (!pdfText.includes(n)) missing.push({ page: item.page, kind: item.kind, text: String(item.text).slice(0, 180) });
}
const pageCountMatch = Number(preflight.pageCount) === (semantic.pages ?? []).length;
const chapterCountMatch = Number(preflight.chapterCount) === Number(navigation.chapterCount ?? 34);
const report = {
  schemaVersion: 1,
  status: missing.length === 0 && pageCountMatch && chapterCountMatch ? 'PASS' : 'FAIL',
  sourcePages: (semantic.pages ?? []).length,
  pdfPages: preflight.pageCount,
  sourceChapters: navigation.chapterCount ?? 34,
  pdfManifestChapters: preflight.chapterCount,
  blocksChecked: blocks.length,
  blocksMissing: missing.length,
  missing: missing.slice(0, 100)
};
await writeFile(reportPath, JSON.stringify(report, null, 2));
if (report.status !== 'PASS') {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
