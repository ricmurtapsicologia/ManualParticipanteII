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

const sourceChapterPairs = [...new Set(
  sourcePages
    .filter(page => Number(page.chapter) > 0)
    .map(page => `${page.part ?? 0}:${page.chapter}`)
)];
if (semantic.manifest.partCount !== 7) fail(`Expected 7 editorial parts, got ${semantic.manifest.partCount}`);
if (semantic.manifest.sourceChapterCount !== sourceChapterPairs.length) fail('Source chapter-count preservation mismatch');
if (JSON.stringify(semantic.manifest.sourceChapterPairs) !== JSON.stringify(sourceChapterPairs)) fail('Source chapter-pair preservation mismatch');
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

const chapterNote = semantic.manifest.sourceChapterCount === 34
  ? 'source-chapters=34'
  : `source-chapters=${semantic.manifest.sourceChapterCount} anomaly=queued-for-wave2`;

console.log(
  `SEMANTIC_VALIDATE_OK pages=249 parts=7 ${chapterNote} blocks=${blockCount} ` +
  `text=lossless navigation=complete source=${sourceSha256.slice(0, 12)}`
);
