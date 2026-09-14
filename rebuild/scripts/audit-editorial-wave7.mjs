import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pages = JSON.parse(fs.readFileSync(path.join(root, 'content', 'pages.json'), 'utf8'));
const semantic = JSON.parse(fs.readFileSync(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(root, 'content', 'editorial-wave7-review.json'), 'utf8'));

const fail = message => {
  console.error(`EDITORIAL_WAVE7_AUDIT_FAIL ${message}`);
  process.exit(1);
};

if (!Array.isArray(pages) || pages.length !== 249) fail(`pages=${pages?.length ?? 'invalid'}`);
if (!Array.isArray(semantic.pages) || semantic.pages.length !== 249) fail(`semantic-pages=${semantic.pages?.length ?? 'invalid'}`);
if (review.schemaVersion !== 1 || review.wave !== '7' || review.pageCount !== 249) fail('invalid review manifest header');

for (let index = 0; index < pages.length; index += 1) {
  const page = pages[index];
  const expected = index + 1;
  if (page?.number !== expected) fail(`page sequence expected=${expected} actual=${page?.number}`);
  if (typeof page.title !== 'string') fail(`page=${expected} missing title`);
  if (!Array.isArray(page.paragraphs)) fail(`page=${expected} paragraphs must be array`);
  if (page.paragraphs.some(item => typeof item !== 'string')) fail(`page=${expected} non-string paragraph`);
}

const covered = new Set();
for (const batch of review.batches ?? []) {
  if (!/^7\.(?:[1-9]|10)$/.test(String(batch.id))) fail(`invalid batch id=${batch.id}`);
  if (!Number.isInteger(batch.from) || !Number.isInteger(batch.to) || batch.from < 1 || batch.to > 249 || batch.from > batch.to) fail(`invalid batch range id=${batch.id}`);
  for (let page = batch.from; page <= batch.to; page += 1) {
    if (covered.has(page)) fail(`batch overlap page=${page}`);
    covered.add(page);
  }
}
if (covered.size !== 249) fail(`batch coverage=${covered.size}`);
for (let page = 1; page <= 249; page += 1) if (!covered.has(page)) fail(`batch gap page=${page}`);

const findingIds = new Set();
for (const finding of review.firstPassFindings ?? []) {
  if (typeof finding.id !== 'string' || !finding.id.trim()) fail('finding missing id');
  if (findingIds.has(finding.id)) fail(`duplicate finding=${finding.id}`);
  findingIds.add(finding.id);
  if (!Array.isArray(finding.pages) || !finding.pages.length) fail(`finding=${finding.id} missing pages`);
  for (const page of finding.pages) if (!Number.isInteger(page) || page < 1 || page > 249) fail(`finding=${finding.id} invalid page=${page}`);
}

const reviewedPages = review.reviewedPages ?? [];
const reviewedIds = new Set();
for (const item of reviewedPages) {
  if (!Number.isInteger(item.pageNumber) || item.pageNumber < 1 || item.pageNumber > 249) fail(`invalid reviewed page=${item.pageNumber}`);
  if (reviewedIds.has(item.pageNumber)) fail(`duplicate reviewed page=${item.pageNumber}`);
  reviewedIds.add(item.pageNumber);
  const allowed = new Set(['pending', 'in-review', 'approved', 'requires-content-change', 'requires-doctrinal-validation']);
  if (!allowed.has(item.status)) fail(`page=${item.pageNumber} invalid review status=${item.status}`);
}

const heuristicOrphans = pages.filter(page => page.number > 1 && page.paragraphs.length === 1 && page.paragraphs[0].trim().length < 220).map(page => page.number);
const lowercaseContinuations = pages.filter(page => {
  const first = page.paragraphs?.[0]?.trim();
  return page.number > 1 && first && /^[a-záàâãéêíóôõúç]/u.test(first);
}).map(page => page.number);
const suspiciousGlyphPages = pages.filter(page => page.paragraphs.some(text => /�|\.→|→\s*→\s*→/.test(text))).map(page => page.number);

console.log(`EDITORIAL_WAVE7_AUDIT_OK pages=249 batches=${review.batches.length} reviewed=${reviewedPages.length} findings=${findingIds.size} heuristic-orphans=${heuristicOrphans.join(',') || 'none'} lowercase-continuations=${lowercaseContinuations.join(',') || 'none'} suspicious-glyphs=${suspiciousGlyphPages.join(',') || 'none'} canonical-30x30=${review.policy?.canonical3030Gate ?? 'unknown'}`);
