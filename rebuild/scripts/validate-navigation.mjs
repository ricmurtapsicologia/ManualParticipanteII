import { readFile } from 'node:fs/promises';

const fail = message => { throw new Error(message); };
const navigation = JSON.parse(await readFile(new URL('../content/navigation.json', import.meta.url), 'utf8'));
const semantic = JSON.parse(await readFile(new URL('../content/semantic-pages.json', import.meta.url), 'utf8'));
const pageCount = semantic.manifest?.pageCount ?? semantic.pages?.length;

if (navigation.schemaVersion !== 1) fail('Navigation schema must be 1');
if (navigation.sourceSemanticSchemaVersion !== 2) fail('Navigation must derive from semantic schema 2');
if (![249, 246].includes(pageCount)) fail(`Unexpected semantic page count ${pageCount}`);
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
for (const section of navigation.frontMatter) countMarkers(section.pedagogicalMarkers ?? []);
for (const part of navigation.parts) {
  if (!(part.openingPage >= 1 && part.openingPage <= pageCount)) fail(`Invalid part opening for part ${part.part}`);
  partOpenings.push(part.openingPage);
  countMarkers(part.pedagogicalMarkers ?? []);
  for (const chapter of part.chapters) {
    chapterNumbers.push(chapter.chapter);
    if (!chapter.pageNumbers.includes(chapter.openingPage)) fail(`Opening page missing from chapter ${chapter.chapter}`);
    for (const pageNumber of chapter.pageNumbers) if (!(pageNumber >= 1 && pageNumber <= pageCount)) fail(`Invalid page ${pageNumber}`);
    for (const marker of chapter.pedagogicalMarkers) {
      if (!chapter.pageNumbers.includes(marker.pageNumber)) fail(`Marker page outside chapter ${chapter.chapter}`);
      if (!marker.blockId || !marker.kind) fail(`Invalid marker in chapter ${chapter.chapter}`);
    }
    countMarkers(chapter.pedagogicalMarkers);
  }
  supplementaryCount += part.supplementarySections.length;
  for (const section of part.supplementarySections) {
    for (const marker of section.pedagogicalMarkers ?? []) if (!section.pageNumbers.includes(marker.pageNumber)) fail(`Marker page outside supplement ${section.id}`);
    countMarkers(section.pedagogicalMarkers ?? []);
  }
}

const expectedChapters = Array.from({ length: 34 }, (_, index) => index + 1);
if (JSON.stringify(chapterNumbers) !== JSON.stringify(expectedChapters)) fail(`Chapter sequence mismatch: ${chapterNumbers.join(',')}`);
const expectedPartOpenings = pageCount === 246 ? [4,50,92,141,163,183,199] : [7,53,95,144,166,186,202];
if (JSON.stringify(partOpenings) !== JSON.stringify(expectedPartOpenings)) fail(`Part openings mismatch: ${partOpenings.join(',')}`);
if (markerCount !== navigation.pedagogicalMarkerCount) fail(`Marker count mismatch: actual=${markerCount} metadata=${navigation.pedagogicalMarkerCount}`);
if (supplementaryCount !== 5) fail(`Expected 5 supplementary sections, got ${supplementaryCount}`);
if (navigation.frontMatter.length !== 1 || navigation.frontMatter[0].openingPage !== 2) fail('Front matter navigation mismatch');

const serialized = JSON.stringify(navigation);
if (serialized.includes('"text":')) fail('Compact navigation must not duplicate source block text');
if (Buffer.byteLength(serialized, 'utf8') > 120000) fail('Compact navigation artifact exceeded 120 KB');

console.log(`NAVIGATION_VALIDATE_OK pages=${pageCount} parts=7 chapters=34 markers=${markerCount} supplements=5 front=1 bytes=${Buffer.byteLength(serialized, 'utf8')}`);
