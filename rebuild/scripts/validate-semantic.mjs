import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const sourceText = await readFile(new URL('../content/pages.json', import.meta.url), 'utf8');
const sourcePages = JSON.parse(sourceText);
const semantic = JSON.parse(await readFile(new URL('../content/semantic-pages.json', import.meta.url), 'utf8'));
const schema = JSON.parse(await readFile(new URL('../content/semantic-schema.json', import.meta.url), 'utf8'));
const fail = message => { throw new Error(message); };

const EXPECTED_PART_CHAPTERS = new Map([
  [1, [1, 2, 3, 4, 5]],
  [2, [6, 7, 8, 9, 10, 11]],
  [3, [12, 13, 14, 15, 16, 17, 18, 19, 20]],
  [4, [21, 22, 23, 24, 25]],
  [5, [26, 27, 28, 29]],
  [6, [30, 31, 32]],
  [7, [33, 34]]
]);

const EXPECTED_PART_OPENING_PAGES = [7, 53, 95, 144, 166, 186, 202];
const EXPECTED_TRANSITION_NORMALIZATIONS = [
  { page: 53, sourcePart: 2, sourceChapter: 5, editorialPart: 2, editorialChapter: 0, reason: 'part-boundary-carries-previous-chapter' },
  { page: 95, sourcePart: 3, sourceChapter: 11, editorialPart: 3, editorialChapter: 0, reason: 'part-boundary-carries-previous-chapter' },
  { page: 144, sourcePart: 4, sourceChapter: 20, editorialPart: 4, editorialChapter: 0, reason: 'part-boundary-carries-previous-chapter' }
];

const sourceSha256 = createHash('sha256').update(sourceText).digest('hex');
if (schema.schemaVersion !== 2 || semantic.schemaVersion !== 2) fail('Semantic schema version must be 2');
if (semantic.editorialModel !== 'part>chapter>page>block') fail('Unexpected editorial model');
if (sourcePages.length !== 249 || semantic.pages.length !== 249 || semantic.manifest.pageCount !== 249) fail('Semantic migration must preserve exactly 249 pages');
if (semantic.source.sha256 !== sourceSha256) fail('Semantic source hash does not match pages.json');
if (semantic.source.preservation !== 'lossless-title-and-paragraph-text-and-source-taxonomy') fail('Wave 12 lossless preservation contract missing');
if (semantic.normalization?.strategy !== 'preserve-source-taxonomy-add-editorial-taxonomy') fail('Wave 12 taxonomy strategy missing');

let blockCount = 0;
let pedagogicalMarkerCount = 0;
const pedagogicalKinds = new Set(schema.pedagogicalBlockKinds);
const blockById = new Map();

for (let index = 0; index < sourcePages.length; index += 1) {
  const source = sourcePages[index];
  const target = semantic.pages[index];
  if (target.number !== source.number) fail(`Page number mismatch at index ${index}`);
  if (target.title !== source.title) fail(`Title changed at page ${source.number}`);
  if ((target.part ?? null) !== (source.part ?? null)) fail(`Source part changed at page ${source.number}`);
  if ((target.chapter ?? null) !== (source.chapter ?? null)) fail(`Source chapter changed at page ${source.number}`);
  if ((target.partTitle ?? '') !== (source.partTitle ?? '')) fail(`Source part title changed at page ${source.number}`);
  if (target.cover !== (source.cover === true)) fail(`Cover flag changed at page ${source.number}`);
  if (target.blocks.length !== source.paragraphs.length) fail(`Paragraph/block count mismatch at page ${source.number}`);
  if (!schema.pageRoles.includes(target.pageRole)) fail(`Unknown page role ${target.pageRole} at page ${source.number}`);

  for (let blockIndex = 0; blockIndex < source.paragraphs.length; blockIndex += 1) {
    const block = target.blocks[blockIndex];
    if (block.sourceIndex !== blockIndex) fail(`Source index mismatch at page ${source.number}, block ${blockIndex}`);
    if (block.text !== source.paragraphs[blockIndex]) fail(`Text changed at page ${source.number}, block ${blockIndex}`);
    if (!schema.blockKinds.includes(block.kind)) fail(`Unknown block kind ${block.kind} at page ${source.number}`);
    if (blockById.has(block.id)) fail(`Duplicate block id ${block.id}`);
    blockById.set(block.id, { page: source.number, block });
    if (pedagogicalKinds.has(block.kind)) pedagogicalMarkerCount += 1;
    blockCount += 1;
  }
}

if (semantic.manifest.blockCount !== blockCount || blockCount !== 2224) fail(`Expected 2224 lossless blocks, got ${blockCount}`);
if (semantic.manifest.pedagogicalMarkerCount !== pedagogicalMarkerCount) fail('Pedagogical marker count mismatch');

const sourceChapterParts = new Map();
for (const page of semantic.pages) {
  const chapter = Number(page.chapter);
  if (!(chapter > 0)) continue;
  if (!sourceChapterParts.has(chapter)) sourceChapterParts.set(chapter, new Set());
  sourceChapterParts.get(chapter).add(page.part);
}
const sourceOverlaps = [...sourceChapterParts.entries()]
  .map(([chapter, parts]) => ({ chapter, parts: [...parts].sort((a, b) => a - b) }))
  .filter(item => item.parts.length > 1);
const expectedSourceOverlaps = [{ chapter: 5, parts: [1, 2] }, { chapter: 11, parts: [2, 3] }, { chapter: 20, parts: [3, 4] }];
if (JSON.stringify(sourceOverlaps) !== JSON.stringify(expectedSourceOverlaps)) fail(`Unexpected source overlaps: ${JSON.stringify(sourceOverlaps)}`);
if (JSON.stringify(semantic.manifest.sourceBoundaryChapterOverlaps) !== JSON.stringify(expectedSourceOverlaps)) fail('Source-overlap diagnostics were not preserved');

const normalizedChapterParts = new Map();
for (const page of semantic.pages) {
  const chapter = Number(page.editorial?.chapter);
  if (!(chapter > 0)) continue;
  if (!normalizedChapterParts.has(chapter)) normalizedChapterParts.set(chapter, new Set());
  normalizedChapterParts.get(chapter).add(page.editorial.part);
}
const normalizedOverlaps = [...normalizedChapterParts.entries()]
  .map(([chapter, parts]) => ({ chapter, parts: [...parts].sort((a, b) => a - b) }))
  .filter(item => item.parts.length > 1);
if (normalizedOverlaps.length !== 0) fail(`Normalized taxonomy still crosses part boundaries: ${JSON.stringify(normalizedOverlaps)}`);
if (semantic.manifest.normalizedBoundaryChapterOverlaps.length !== 0) fail('Manifest reports normalized chapter overlaps');

if (semantic.manifest.partCount !== 7) fail(`Expected 7 editorial parts, got ${semantic.manifest.partCount}`);
if (semantic.manifest.distinctChapterNumberCount !== 34) fail(`Expected 34 editorial chapters, got ${semantic.manifest.distinctChapterNumberCount}`);
if (semantic.manifest.tocPartCount !== 7 || semantic.manifest.tocChapterCount !== 34) fail('Hierarchical TOC must contain 7 parts and 34 chapters');

for (const [partNumber, expectedChapters] of EXPECTED_PART_CHAPTERS) {
  const part = semantic.navigation.parts.find(item => item.part === partNumber);
  if (!part) fail(`Missing part ${partNumber} in normalized navigation`);
  const actual = part.chapters.map(chapter => chapter.chapter);
  if (JSON.stringify(actual) !== JSON.stringify(expectedChapters)) fail(`Part ${partNumber} chapter taxonomy mismatch: ${JSON.stringify(actual)}`);
}

const openingPages = semantic.navigation.parts.flatMap(part => part.openingPages);
if (JSON.stringify(openingPages) !== JSON.stringify(EXPECTED_PART_OPENING_PAGES)) fail(`Unexpected part-opening pages: ${JSON.stringify(openingPages)}`);
for (const pageNumber of EXPECTED_PART_OPENING_PAGES) {
  const page = semantic.pages.find(item => item.number === pageNumber);
  if (!page || page.pageRole !== 'part-opening' || page.editorial.chapter !== 0) fail(`Page ${pageNumber} must be a normalized part opening`);
}

if (JSON.stringify(semantic.normalization.transitionNormalizations) !== JSON.stringify(EXPECTED_TRANSITION_NORMALIZATIONS)) {
  fail(`Unexpected transition normalization set: ${JSON.stringify(semantic.normalization.transitionNormalizations)}`);
}
if (semantic.manifest.transitionNormalizationCount !== 3) fail('Exactly three source taxonomy corrections are expected');

const navigationPages = [];
for (const section of semantic.navigation.frontMatter) navigationPages.push(...section.pageNumbers);
for (const part of semantic.navigation.parts) {
  navigationPages.push(...part.openingPages);
  for (const chapter of part.chapters) navigationPages.push(...chapter.pageNumbers);
  for (const section of part.supplementarySections) navigationPages.push(...section.pageNumbers);
}
const expectedNavigationPages = Array.from({ length: 248 }, (_, index) => index + 2);
const sortedNavigationPages = [...navigationPages].sort((a, b) => a - b);
if (navigationPages.length !== expectedNavigationPages.length) fail(`Navigation coverage length mismatch: ${navigationPages.length}`);
if (new Set(navigationPages).size !== navigationPages.length) fail('Normalized navigation contains duplicate page assignments');
if (JSON.stringify(sortedNavigationPages) !== JSON.stringify(expectedNavigationPages)) fail('Normalized navigation does not cover pages 2..249 exactly once');

const tocChapterEntries = semantic.navigation.toc.flatMap(part => part.children.filter(child => child.kind === 'chapter'));
if (tocChapterEntries.length !== 34) fail(`TOC chapter count mismatch: ${tocChapterEntries.length}`);
if (new Set(tocChapterEntries.map(entry => entry.chapter)).size !== 34) fail('TOC contains duplicate chapter entries');
if (tocChapterEntries.some(entry => !entry.title || !(entry.pageNumber > 0))) fail('TOC chapter entry missing title or page number');

let chapterMarkerRefs = 0;
for (const part of semantic.navigation.parts) {
  for (const chapter of part.chapters) {
    if (chapter.openingPage !== chapter.pageNumbers[0]) fail(`Chapter ${chapter.chapter} opening page mismatch`);
    if (JSON.stringify(chapter.continuationPages) !== JSON.stringify(chapter.pageNumbers.slice(1))) fail(`Chapter ${chapter.chapter} continuation pages mismatch`);
    const summaryCount = Object.values(chapter.pedagogicalCounts).reduce((sum, value) => sum + value, 0);
    if (summaryCount !== chapter.pedagogicalMarkers.length) fail(`Chapter ${chapter.chapter} pedagogical summary mismatch`);
    for (const marker of chapter.pedagogicalMarkers) {
      const ref = blockById.get(marker.blockId);
      if (!ref) fail(`Unknown pedagogical block reference ${marker.blockId}`);
      if (ref.page !== marker.pageNumber || ref.block.kind !== marker.kind || ref.block.text !== marker.text) fail(`Pedagogical marker reference mismatch ${marker.blockId}`);
      if (!pedagogicalKinds.has(marker.kind)) fail(`Non-pedagogical kind exposed as marker: ${marker.kind}`);
      chapterMarkerRefs += 1;
    }
  }
}
if (chapterMarkerRefs === 0) fail('No pedagogical markers recovered into chapter navigation');

if (semantic.manifest.pageRoles.cover !== 1) fail('Exactly one cover page is required');
if (semantic.manifest.pageRoles['front-matter'] !== 5) fail('Expected five front-matter pages');
if (semantic.manifest.pageRoles['part-opening'] !== 7) fail('Expected seven part-opening pages');
if (semantic.manifest.pageRoles['chapter-opening'] !== 34) fail('Expected 34 chapter-opening pages');
if (!semantic.manifest.pageRoles.continuation) fail('Continuation pages were not identified');
if (!semantic.manifest.pageRoles.supplementary) fail('Supplementary pages were not identified');

for (const requiredKind of ['objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review']) {
  if (!semantic.manifest.blockKinds[requiredKind]) fail(`Required semantic kind not detected: ${requiredKind}`);
}
for (const reservedKind of ['figure','diagram','audio','video','quiz','external-resource']) {
  if (!semantic.capabilities.reservedForLaterWaves.includes(reservedKind)) fail(`Future capability missing from semantic contract: ${reservedKind}`);
}

console.log(
  `SEMANTIC_V2_VALIDATE_OK pages=249 blocks=${blockCount} parts=7 chapters=34 ` +
  `part-openings=${openingPages.join(',')} normalized-transitions=53,95,144 ` +
  `toc=7>34 text=lossless source-taxonomy=preserved pedagogical-markers=${pedagogicalMarkerCount} ` +
  `source=${sourceSha256.slice(0, 12)}`
);
