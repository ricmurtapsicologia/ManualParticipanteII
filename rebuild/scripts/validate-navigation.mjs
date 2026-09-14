import { readFile } from 'node:fs/promises';

const fail = message => { throw new Error(message); };
const navigation = JSON.parse(await readFile(new URL('../content/navigation.json', import.meta.url), 'utf8'));
const semantic = JSON.parse(await readFile(new URL('../content/semantic-pages.json', import.meta.url), 'utf8'));
const pageCount = semantic.manifest?.pageCount ?? semantic.pages?.length;

if (navigation.schemaVersion !== 1) fail('Navigation schema must be 1');
if (navigation.sourceSemanticSchemaVersion !== 2) fail('Navigation must derive from semantic schema 2');
if (!Number.isInteger(pageCount) || pageCount < 200 || pageCount > 249) fail(`Unexpected semantic page count ${pageCount}`);
if (!Array.isArray(semantic.pages) || semantic.pages.length !== pageCount) fail('Semantic page array/count mismatch');
if (!semantic.pages.every((page,index) => page.number === index + 1)) fail('Semantic page sequence is not contiguous');
if (navigation.sourcePageCount !== pageCount) fail(`Navigation page count ${navigation.sourcePageCount} != semantic ${pageCount}`);
if (navigation.sourceSha256 !== semantic.source.sha256) fail('Navigation source hash mismatch');
if (navigation.parts.length !== 7) fail(`Expected 7 parts, got ${navigation.parts.length}`);
if (navigation.chapterCount !== 34) fail(`Expected 34 chapters, got ${navigation.chapterCount}`);
if (!Number.isInteger(navigation.pedagogicalMarkerCount) || navigation.pedagogicalMarkerCount < 150) fail(`Unexpected pedagogical marker count: ${navigation.pedagogicalMarkerCount}`);

const chapterNumbers = [];
const partOpenings = [];
let markerCount = 0;
let supplementaryCount = 0;
const countMarkers = markers => { markerCount += markers.length; };
for (const section of navigation.frontMatter) {
  if (!section.pageNumbers?.length) fail(`Empty front-matter section ${section.id}`);
  if (section.openingPage !== section.pageNumbers[0]) fail(`Front-matter opening mismatch ${section.id}`);
  for (const pageNumber of section.pageNumbers) if (!(pageNumber >= 1 && pageNumber <= pageCount)) fail(`Invalid front-matter page ${pageNumber}`);
  countMarkers(section.pedagogicalMarkers ?? []);
}
for (const part of navigation.parts) {
  if (!(part.openingPage >= 1 && part.openingPage <= pageCount)) fail(`Invalid part opening for part ${part.part}`);
  partOpenings.push(part.openingPage);
  countMarkers(part.pedagogicalMarkers ?? []);
  for (const chapter of part.chapters) {
    chapterNumbers.push(chapter.chapter);
    if (!chapter.pageNumbers.length) fail(`Chapter ${chapter.chapter} has no pages`);
    if (chapter.openingPage !== chapter.pageNumbers[0]) fail(`Opening page mismatch chapter ${chapter.chapter}`);
    for (const pageNumber of chapter.pageNumbers) if (!(pageNumber >= 1 && pageNumber <= pageCount)) fail(`Invalid page ${pageNumber}`);
    for (const marker of chapter.pedagogicalMarkers) {
      if (!chapter.pageNumbers.includes(marker.pageNumber)) fail(`Marker page outside chapter ${chapter.chapter}`);
      if (!marker.blockId || !marker.kind) fail(`Invalid marker in chapter ${chapter.chapter}`);
    }
    countMarkers(chapter.pedagogicalMarkers);
  }
  supplementaryCount += part.supplementarySections.length;
  for (const section of part.supplementarySections) {
    if (!section.pageNumbers.length) fail(`Empty supplement ${section.id}`);
    if (section.openingPage !== section.pageNumbers[0]) fail(`Supplement opening mismatch ${section.id}`);
    for (const pageNumber of section.pageNumbers) if (!(pageNumber >= 1 && pageNumber <= pageCount)) fail(`Invalid supplement page ${pageNumber}`);
    for (const marker of section.pedagogicalMarkers ?? []) if (!section.pageNumbers.includes(marker.pageNumber)) fail(`Marker page outside supplement ${section.id}`);
    countMarkers(section.pedagogicalMarkers ?? []);
  }
}

const expectedChapters = Array.from({ length: 34 }, (_, index) => index + 1);
if (JSON.stringify(chapterNumbers) !== JSON.stringify(expectedChapters)) fail(`Chapter sequence mismatch: ${chapterNumbers.join(',')}`);
const expectedPartOpenings = (semantic.navigation?.parts ?? []).map(part => part.openingPages?.[0] ?? part.chapters?.[0]?.openingPage ?? part.supplementarySections?.[0]?.openingPage ?? null);
if (JSON.stringify(partOpenings) !== JSON.stringify(expectedPartOpenings)) fail(`Part openings mismatch: ${partOpenings.join(',')}`);
if (markerCount !== navigation.pedagogicalMarkerCount) fail(`Marker count mismatch: actual=${markerCount} metadata=${navigation.pedagogicalMarkerCount}`);
if (supplementaryCount < 1 || supplementaryCount > 5) fail(`Unexpected supplementary sections: ${supplementaryCount}`);
if (navigation.frontMatter.length !== 1 || navigation.frontMatter[0].openingPage !== 2) fail('Front matter navigation mismatch');

const serialized = JSON.stringify(navigation);
if (serialized.includes('"text":')) fail('Compact navigation must not duplicate source block text');
if (Buffer.byteLength(serialized, 'utf8') > 120000) fail('Compact navigation artifact exceeded 120 KB');

console.log(`NAVIGATION_VALIDATE_OK pages=${pageCount} parts=7 chapters=34 markers=${markerCount} supplements=${supplementaryCount} front=1 bytes=${Buffer.byteLength(serialized, 'utf8')}`);
