import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfPath = path.join(root, 'public', 'downloads', 'Manual-do-Participante-CATS-Edicao-Digital-2026.pdf');
const generatorReportPath = path.join(root, 'public', 'downloads', 'manual-preflight.json');
const navigationPath = path.join(root, 'content', 'navigation.json');
const reportsDir = path.join(root, 'reports');
const outputPath = path.join(reportsDir, 'pdf-preflight.json');

const [pdf, generated, navigation] = await Promise.all([
  readFile(pdfPath),
  readFile(generatorReportPath, 'utf8').then(JSON.parse),
  readFile(navigationPath, 'utf8').then(JSON.parse)
]);
const raw = pdf.toString('latin1');
const has = pattern => pattern.test(raw);
const sha256 = createHash('sha256').update(pdf).digest('hex');
const logicalMap = generated.logicalPageMap ?? [];
const pageMetrics = generated.pages ?? [];
const physicalMetricsConsistent = Number.isInteger(generated.pageCount) && generated.pageCount > 0 && pageMetrics.length === generated.pageCount;
const logicalMapConsistent = Number.isInteger(generated.sourcePageCount) && generated.sourcePageCount > 0 && logicalMap.length === generated.sourcePageCount && logicalMap.every((item, index) => item.logicalPage === index + 1 && item.physicalPage >= 1 && item.physicalPage <= generated.pageCount);
const physicalFor = logicalPage => logicalMap.find(item => item.logicalPage === Number(logicalPage))?.physicalPage ?? null;
const chapters = (navigation.parts ?? []).flatMap(part => part.chapters ?? []);
const chapterBoundaryFailures = chapters.filter(chapter => {
  const current = physicalFor(chapter.openingPage);
  const previous = physicalFor(chapter.openingPage - 1);
  return !(current && previous && current > previous);
});
const chapterStartsOnNewPage = chapters.length === Number(generated.chapterCount ?? 0) && chapters.length === 34 && chapterBoundaryFailures.length === 0 && generated.layout?.chapterStartsOnNewPage === true;

const checks = [
  ['header-pdf', pdf.subarray(0, 8).toString('ascii').startsWith('%PDF-1.'), 'Cabeçalho PDF válido'],
  ['eof', /%%EOF\s*$/.test(raw), 'EOF válido'],
  ['page-metrics', physicalMetricsConsistent, `Métricas de páginas físicas consistentes = ${generated.pageCount}`],
  ['logical-page-map', logicalMapConsistent, `Mapa lógico contínuo = ${generated.sourcePageCount} marcadores em ${generated.pageCount} páginas físicas`],
  ['chapter-new-page', chapterStartsOnNewPage, `Capítulos em nova folha física = ${chapters.length - chapterBoundaryFailures.length}/${chapters.length}`],
  ['condensation', generated.pageCount < generated.sourcePageCount, `Condensação editorial ativa: ${generated.sourcePageCount} lógicas → ${generated.pageCount} físicas`],
  ['tagged-struct-tree', has(/\/StructTreeRoot\b/), 'StructTreeRoot presente'],
  ['tagged-mark-info', has(/\/MarkInfo\b/), 'MarkInfo presente'],
  ['language', has(/\/Lang\b/), 'Idioma de documento presente'],
  ['xmp', has(/\/Metadata\b/), 'Stream XMP presente'],
  ['outlines', has(/\/Outlines\b/), 'Bookmarks/outlines presentes'],
  ['navigation-destinations', has(/\/Dests\b/) && has(/\/Names\b/), 'Destinos nomeados presentes; URLs permanecem textuais no PDF e interativas na edição web'],
  ['embedded-fonts', has(/\/FontFile2\b|\/FontFile3\b/), 'Fontes incorporadas/subsetadas'],
  ['no-base14-helvetica', !has(/\/BaseFont\s*\/(Helvetica|Times-Roman|Times-Bold|Courier)\b/), 'Sem Base14 como fonte de conteúdo'],
  ['unicode-cmap', has(/\/ToUnicode\b/), 'Mapeamento ToUnicode presente'],
  ['figure-alt', !has(/\/S\s*\/Figure\b/) || has(/\/Alt\b/), 'Figuras estruturadas possuem Alt'],
  ['deterministic', generated.deterministic === true, 'Geração determinística confirmada'],
  ['sha-match', generated.sha256 === sha256, 'SHA-256 do preflight coincide com o gerador'],
  ['typography', generated.bodyTypography?.sizePt >= 11.2 && generated.bodyTypography?.leadingPt >= 16, 'Corpo mínimo 11,2 pt e entrelinha mínima 16 pt'],
  ['residual-blank-area', Number(generated.layout?.measuredMaxResidualBlankAreaExcludingLastRegular ?? 1) <= 0.20, 'Área residual máxima não intencional dentro do limite editorial de 20%'],
  ['overflow', pageMetrics.every(page => page.overflow === false), 'Sem overflow declarado pelo motor de composição'],
  ['non-empty', pdf.byteLength > 100_000, 'Arquivo não vazio/truncado']
].map(([id, pass, description]) => ({ id, pass: Boolean(pass), description }));

const failures = checks.filter(check => !check.pass);
const report = {
  schemaVersion: 3,
  generatedAt: '2026-09-16T00:00:00.000Z',
  pdf: path.basename(pdfPath),
  sha256,
  bytes: pdf.byteLength,
  physicalPages: generated.pageCount,
  logicalPages: generated.sourcePageCount,
  chapterBoundary: {
    expected: chapters.length,
    compliant: chapters.length - chapterBoundaryFailures.length,
    failures: chapterBoundaryFailures.map(chapter => ({ chapter: chapter.chapter, openingPage: chapter.openingPage }))
  },
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
console.log(JSON.stringify({ status: 'PASS', sha256, physicalPages: generated.pageCount, logicalPages: generated.sourcePageCount, chapterStarts: `${report.chapterBoundary.compliant}/${report.chapterBoundary.expected}`, checks: checks.length }, null, 2));
