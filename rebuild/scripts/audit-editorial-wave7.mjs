import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pages = JSON.parse(fs.readFileSync(path.join(root, 'content', 'pages.json'), 'utf8'));
const semantic = JSON.parse(fs.readFileSync(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(root, 'content', 'editorial-wave7-review.json'), 'utf8'));
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'content', 'canonical-30x30.json'), 'utf8'));

const fail = message => {
  console.error(`EDITORIAL_WAVE7_AUDIT_FAIL ${message}`);
  process.exit(1);
};

if (!Array.isArray(pages) || pages.length !== 249) fail(`pages=${pages?.length ?? 'invalid'}`);
if (!Array.isArray(semantic.pages) || semantic.pages.length !== 249) fail(`semantic-pages=${semantic.pages?.length ?? 'invalid'}`);
if (review.schemaVersion !== 1 || review.wave !== '7' || review.pageCount !== 249) fail('invalid-review-header');
if (!Array.isArray(matrix.controls) || matrix.controls.length !== 30) fail(`canonical-30x30=${matrix.controls?.length ?? 'invalid'}`);
for (let index = 0; index < 30; index += 1) if (matrix.controls[index]?.id !== index + 1 || !matrix.controls[index]?.name) fail(`canonical-control=${index + 1}`);

for (let index = 0; index < pages.length; index += 1) {
  const page = pages[index];
  const expected = index + 1;
  if (page?.number !== expected) fail(`page-sequence expected=${expected} actual=${page?.number}`);
  if (typeof page.title !== 'string') fail(`page=${expected} missing-title`);
  if (!Array.isArray(page.paragraphs)) fail(`page=${expected} paragraphs-not-array`);
  if (page.paragraphs.some(item => typeof item !== 'string')) fail(`page=${expected} non-string-paragraph`);
}

if (!Array.isArray(review.batches) || review.batches.length !== 10) fail(`batches=${review.batches?.length ?? 'invalid'}`);
const covered = new Set();
for (const batch of review.batches) {
  if (!/^7\.(?:[1-9]|10)$/.test(String(batch.id))) fail(`invalid-batch-id=${batch.id}`);
  if (batch.status !== 'approved') fail(`batch-not-approved=${batch.id}:${batch.status}`);
  if (!Number.isInteger(batch.from) || !Number.isInteger(batch.to) || batch.from < 1 || batch.to > 249 || batch.from > batch.to) fail(`invalid-batch-range=${batch.id}`);
  for (let page = batch.from; page <= batch.to; page += 1) {
    if (covered.has(page)) fail(`batch-overlap=${page}`);
    covered.add(page);
  }
}
if (covered.size !== 249) fail(`batch-coverage=${covered.size}`);
for (let page = 1; page <= 249; page += 1) if (!covered.has(page)) fail(`batch-gap=${page}`);

if (!Array.isArray(review.reviewedPages) || review.reviewedPages.length !== 249) fail(`reviewed-pages=${review.reviewedPages?.length ?? 'invalid'}`);
const reviewed = new Set();
for (const item of review.reviewedPages) {
  if (!Number.isInteger(item.pageNumber) || item.pageNumber < 1 || item.pageNumber > 249) fail(`invalid-reviewed-page=${item.pageNumber}`);
  if (reviewed.has(item.pageNumber)) fail(`duplicate-reviewed-page=${item.pageNumber}`);
  if (item.status !== 'approved') fail(`review-page-not-approved=${item.pageNumber}:${item.status}`);
  reviewed.add(item.pageNumber);
}
for (let page = 1; page <= 249; page += 1) if (!reviewed.has(page)) fail(`review-gap=${page}`);

const findings = review.firstPassFindings ?? [];
const findingIds = new Set();
for (const finding of findings) {
  if (typeof finding.id !== 'string' || !finding.id.trim()) fail('finding-missing-id');
  if (findingIds.has(finding.id)) fail(`duplicate-finding=${finding.id}`);
  findingIds.add(finding.id);
  if (finding.status !== 'resolved') fail(`finding-open=${finding.id}:${finding.status}`);
  if (!Array.isArray(finding.pages) || !finding.pages.length) fail(`finding-pages=${finding.id}`);
}

if (review.corrections?.runtimeWave !== '7.10' || review.corrections?.coverage !== '1-249' || review.corrections?.doctrineChanged !== false) fail('invalid-corrections-summary');

const sourceLowercaseContinuations = pages.filter(page => {
  const first = page.paragraphs?.[0]?.trim();
  return page.number > 1 && first && /^[a-záàâãéêíóôõúç]/u.test(first);
}).map(page => page.number);
const sourceSuspiciousGlyphPages = pages.filter(page => page.paragraphs.some(text => /�|\.→|→\s*→\s*→/.test(text))).map(page => page.number);

console.log(`EDITORIAL_WAVE7_AUDIT_OK pages=249 batches=10 reviewed=249 findings=${findingIds.size} canonical-30x30=30 coverage=1-249 doctrine-changed=false source-lowercase-continuations=${sourceLowercaseContinuations.join(',') || 'none'} source-suspicious-glyphs=${sourceSuspiciousGlyphPages.join(',') || 'none'} runtime-finalizer=required visual-debt=wave8`);
