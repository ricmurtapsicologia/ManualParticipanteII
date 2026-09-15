import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfPath = path.join(root, 'public', 'downloads', 'Manual-do-Participante-CATS-Edicao-Digital-2026.pdf');
const generatorReportPath = path.join(root, 'public', 'downloads', 'manual-preflight.json');
const reportsDir = path.join(root, 'reports');
const outputPath = path.join(reportsDir, 'pdf-preflight.json');

const [pdf, generated] = await Promise.all([readFile(pdfPath), readFile(generatorReportPath, 'utf8').then(JSON.parse)]);
const raw = pdf.toString('latin1');
const has = pattern => pattern.test(raw);
const count = pattern => [...raw.matchAll(pattern)].length;
const sha256 = createHash('sha256').update(pdf).digest('hex');

const checks = [
  ['header-pdf', pdf.subarray(0, 8).toString('ascii').startsWith('%PDF-1.'), 'Cabeçalho PDF válido'],
  ['eof', /%%EOF\s*$/.test(raw), 'EOF válido'],
  ['pages', count(/\/Type\s*\/Page(?!s)\b/g) === generated.pageCount, `Contagem de páginas = ${generated.pageCount}`],
  ['tagged-struct-tree', has(/\/StructTreeRoot\b/), 'StructTreeRoot presente'],
  ['tagged-mark-info', has(/\/MarkInfo\b/), 'MarkInfo presente'],
  ['language', has(/\/Lang\b/), 'Idioma de documento presente'],
  ['xmp', has(/\/Metadata\b/), 'Stream XMP presente'],
  ['outlines', has(/\/Outlines\b/), 'Bookmarks/outlines presentes'],
  ['links', count(/\/Subtype\s*\/Link\b/g) > 0, 'Links reais presentes'],
  ['embedded-fonts', has(/\/FontFile2\b|\/FontFile3\b/), 'Fontes incorporadas/subsetadas'],
  ['no-base14-helvetica', !has(/\/BaseFont\s*\/(Helvetica|Times-Roman|Times-Bold|Courier)\b/), 'Sem Base14 como fonte de conteúdo'],
  ['unicode-cmap', has(/\/ToUnicode\b/), 'Mapeamento ToUnicode presente'],
  ['figure-alt', !has(/\/S\s*\/Figure\b/) || has(/\/Alt\b/), 'Figuras estruturadas possuem Alt'],
  ['deterministic', generated.deterministic === true, 'Geração determinística confirmada'],
  ['sha-match', generated.sha256 === sha256, 'SHA-256 do preflight coincide com o gerador'],
  ['overflow', (generated.pages ?? []).every(page => page.overflow === false), 'Sem overflow declarado pelo motor de composição'],
  ['non-empty', pdf.byteLength > 100_000, 'Arquivo não vazio/truncado']
].map(([id, pass, description]) => ({ id, pass: Boolean(pass), description }));

const failures = checks.filter(check => !check.pass);
const report = {
  schemaVersion: 1,
  generatedAt: '2026-09-15T00:00:00.000Z',
  pdf: path.basename(pdfPath),
  sha256,
  bytes: pdf.byteLength,
  pages: generated.pageCount,
  checks,
  status: failures.length ? 'FAIL' : 'PASS',
  failures: failures.map(item => item.id)
};
await mkdir(reportsDir, { recursive: true });
await writeFile(outputPath, JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', sha256, pages: generated.pageCount, checks: checks.length }, null, 2));
