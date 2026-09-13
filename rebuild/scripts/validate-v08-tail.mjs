import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rebuildRoot = resolve(here, '..');
const outDir = join(rebuildRoot, 'recovery');
const canonical = JSON.parse(await readFile(join(rebuildRoot, 'content', 'pages.json'), 'utf8'));
const source = JSON.parse(await readFile(join(outDir, 'v08-tail-source.json'), 'utf8'));

const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const words = value => new Set(normalize(value).split(' ').filter(word => word.length >= 3));
const flatten = page => [page.title, ...(page.paragraphs ?? [])].join(' ');
const page155Canonical = canonical.find(page => page.number === 155);
const page155Pdf = source.extractedPages.find(page => page.number === 155);
if (!page155Canonical || !page155Pdf) throw new Error('Missing page 155 boundary source');

const sourceWords = words(flatten(page155Pdf));
const canonicalWords = words(flatten(page155Canonical));
const intersection = [...sourceWords].filter(word => canonicalWords.has(word));
const coverage = sourceWords.size ? intersection.length / sourceWords.size : 0;
const reverseCoverage = canonicalWords.size ? intersection.length / canonicalWords.size : 0;
const anchors = [
  'Panorama dos suicídios e lesões autoprovocadas',
  'Instrução Técnica Operacional n. 30',
  'Plano de Ensino',
  'Primeiros Socorros Psicológicos',
  'Tratado de suicidologia',
  'Crise suicida',
  'Emergências psiquiátricas'
];
const canonicalNorm = normalize(flatten(page155Canonical));
const anchorChecks = anchors.map(anchor => ({ anchor, present: canonicalNorm.includes(normalize(anchor)) }));
const anchorHits = anchorChecks.filter(item => item.present).length;

const candidatePages = source.extractedPages.filter(page => page.number >= 156 && page.number <= 159);
const sequenceOk = candidatePages.length === 4 && candidatePages.every((page, index) => page.number === 156 + index);
const contentOk = candidatePages.every(page => page.title && Array.isArray(page.paragraphs) && page.paragraphs.length > 0 && !JSON.stringify(page).includes('\uFFFD'));
const pdfMetadataOk = source.pdfPages === 159 && /^[a-f0-9]{64}$/.test(source.pdfSha256 ?? '') && source.driveFileId;
const boundaryPass = coverage >= 0.88 && anchorHits >= 5;
const safeCandidate = Boolean(sequenceOk && contentOk && pdfMetadataOk && boundaryPass);

const report = {
  schema: 1,
  sourceTitle: source.sourceTitle,
  driveFileId: source.driveFileId,
  pdfSha256: source.pdfSha256,
  pdfPages: source.pdfPages,
  canonicalBoundaryPage: 155,
  canonicalTitle: page155Canonical.title,
  pdfTitle: page155Pdf.title,
  sourceWordCount: sourceWords.size,
  canonicalWordCount: canonicalWords.size,
  sharedWordCount: intersection.length,
  sourceCoverage: Number(coverage.toFixed(4)),
  canonicalCoverage: Number(reverseCoverage.toFixed(4)),
  anchors: anchorChecks,
  anchorHits,
  candidateSequence: candidatePages.map(page => page.number),
  candidateParagraphCounts: candidatePages.map(page => ({ number: page.number, paragraphs: page.paragraphs.length })),
  sequenceOk,
  contentOk,
  pdfMetadataOk: Boolean(pdfMetadataOk),
  boundaryPass,
  safeCandidate
};
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'v08-tail-validation.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# v0.8 tail boundary validation', '',
  `Source: ${source.sourceTitle}`,
  `Boundary page: 155`,
  `Source word coverage in canonical: ${(coverage * 100).toFixed(1)}%`,
  `Anchor hits: ${anchorHits}/${anchors.length}`,
  `Candidate pages: ${candidatePages.map(page => page.number).join(', ')}`,
  `Safe candidate: ${safeCandidate ? 'YES' : 'NO'}`
];
await writeFile(join(outDir, 'v08-tail-validation.md'), `${lines.join('\n')}\n`);
console.log(`V08_TAIL_VALIDATE safe=${safeCandidate} coverage=${coverage.toFixed(4)} anchors=${anchorHits}/${anchors.length} pages=${candidatePages.map(p=>p.number).join(',')}`);
if (!safeCandidate) process.exitCode = 2;
