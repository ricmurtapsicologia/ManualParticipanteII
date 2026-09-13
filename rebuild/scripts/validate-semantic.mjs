import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const sourceText = await readFile(new URL('../content/pages.json', import.meta.url), 'utf8');
const sourcePages = JSON.parse(sourceText);
const semantic = JSON.parse(await readFile(new URL('../content/semantic-pages.json', import.meta.url), 'utf8'));
const schema = JSON.parse(await readFile(new URL('../content/semantic-schema.json', import.meta.url), 'utf8'));
const fail = message => { throw new Error(message); };

const sourceSha256 = createHash('sha256').update(sourceText).digest('hex');
if (schema.schemaVersion !== 1 || semantic.schemaVersion !== 1) fail('Semantic schema version must be 1');
if (semantic.editorialModel !== 'part>chapter>page>block') fail('Unexpected editorial model');
if (sourcePages.length !== 249 || semantic.pages.length !== 249 || semantic.manifest.pageCount !== 249) fail('Semantic migration must preserve exactly 249 pages');
if (semantic.source.sha256 !== sourceSha256) fail('Semantic source hash does not match pages.json');
if (semantic.source.preservation !== 'lossless-title-and-paragraph-text') fail('Lossless preservation contract missing');

let blockCount = 0;
for (let index = 0; index < sourcePages.length; index += 1) {
  const source = sourcePages[index];
  const target = semantic.pages[index];
  if (target.number !== source.number) fail(`Page number mismatch at index ${index}`);
  if (target.title !== source.title) fail(`Title changed at page ${source.number}`);
  if ((target.part ?? null) !== (source.part ?? null)) fail(`Part changed at page ${source.number}`);
  if ((target.chapter ?? null) !== (source.chapter ?? null)) fail(`Chapter changed at page ${source.number}`);
  if ((target.partTitle ?? '') !== (source.partTitle ?? '')) fail(`Part title changed at page ${source.number}`);
  if (target.blocks.length !== source.paragraphs.length) fail(`Paragraph/block count mismatch at page ${source.number}`);
  for (let blockIndex = 0; blockIndex < source.paragraphs.length; blockIndex += 1) {
    const block = target.blocks[blockIndex];
    if (block.sourceIndex !== blockIndex) fail(`Source index mismatch at page ${source.number}, block ${blockIndex}`);
    if (block.text !== source.paragraphs[blockIndex]) fail(`Text changed at page ${source.number}, block ${blockIndex}`);
    if (!schema.blockKinds.includes(block.kind)) fail(`Unknown block kind ${block.kind} at page ${source.number}`);
    blockCount += 1;
  }
}
if (semantic.manifest.blockCount !== blockCount) fail('Block-count manifest mismatch');

const navigationPages = [];
for (const part of semantic.navigation.parts) {
  for (const chapter of part.chapters) navigationPages.push(...chapter.pageNumbers);
}
const expectedNavigationPages = sourcePages.filter(page => !page.cover).map(page => page.number);
if (navigationPages.length !== expectedNavigationPages.length) fail('Navigation page coverage length mismatch');
for (let i = 0; i < expectedNavigationPages.length; i += 1) {
  if (navigationPages[i] !== expectedNavigationPages[i]) fail(`Navigation coverage mismatch near page ${expectedNavigationPages[i]}`);
}

const chapterParts = new Map();
for (const page of sourcePages) {
  const chapter = Number(page.chapter);
  if (!(chapter > 0)) continue;
  if (!chapterParts.has(chapter)) chapterParts.set(chapter, new Set());
  chapterParts.get(chapter).add(page.part ?? 0);
}
const distinctChapterNumbers = [...chapterParts.keys()].sort((a, b) => a - b);
const sourceChapterPairs = [];
for (const chapter of distinctChapterNumbers) {
  for (const part of [...chapterParts.get(chapter)].sort((a, b) => a - b)) sourceChapterPairs.push(`${part}:${chapter}`);
}
const overlaps = distinctChapterNumbers
  .map(chapter => ({ chapter, parts: [...chapterParts.get(chapter)].sort((a, b) => a - b) }))
  .filter(item => item.parts.length > 1);

if (semantic.manifest.partCount !== 7) fail(`Expected 7 editorial parts, got ${semantic.manifest.partCount}`);
if (semantic.manifest.distinctChapterNumberCount !== 34) fail(`Expected 34 distinct chapter numbers, got ${semantic.manifest.distinctChapterNumberCount}`);
if (JSON.stringify(semantic.manifest.distinctChapterNumbers) !== JSON.stringify(distinctChapterNumbers)) fail('Distinct chapter-number preservation mismatch');
if (semantic.manifest.sourceChapterPairCount !== sourceChapterPairs.length) fail('Chapter/part pair count mismatch');
if (JSON.stringify(semantic.manifest.sourceChapterPairs) !== JSON.stringify(sourceChapterPairs)) fail('Chapter/part pair preservation mismatch');
if (JSON.stringify(semantic.manifest.boundaryChapterOverlaps) !== JSON.stringify(overlaps)) fail('Boundary chapter-overlap diagnostics mismatch');
if (JSON.stringify(overlaps) !== JSON.stringify([{ chapter: 5, parts: [1, 2] }, { chapter: 11, parts: [2, 3] }, { chapter: 20, parts: [3, 4] }])) fail(`Unexpected transition overlaps: ${JSON.stringify(overlaps)}`);

if (semantic.manifest.pageRoles.cover !== 1) fail('Exactly one cover page is required');
if (!semantic.manifest.pageRoles.continuation) fail('Continuation pages were not identified');
if (!semantic.manifest.pageRoles['chapter-opening']) fail('Chapter openings were not identified');
if (!semantic.manifest.pageRoles['part-transition']) fail('Part transitions were not identified');

for (const requiredKind of ['objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review']) {
  if (!semantic.manifest.blockKinds[requiredKind]) fail(`Required semantic kind not detected: ${requiredKind}`);
}
for (const reservedKind of ['figure','diagram','audio','video','quiz','external-resource']) {
  if (!semantic.capabilities.reservedForLaterWaves.includes(reservedKind)) fail(`Future capability missing from semantic contract: ${reservedKind}`);
}

console.log(
  `SEMANTIC_VALIDATE_OK pages=249 parts=7 chapters=34 chapter-part-pairs=${sourceChapterPairs.length} ` +
  `overlaps=5:[1,2];11:[2,3];20:[3,4] blocks=${blockCount} text=lossless navigation=complete ` +
  `source=${sourceSha256.slice(0, 12)}`
);
