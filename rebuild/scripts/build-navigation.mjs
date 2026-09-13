import { readFile, writeFile } from 'node:fs/promises';

const semantic = JSON.parse(await readFile(new URL('../content/semantic-pages.json', import.meta.url), 'utf8'));

const parts = semantic.navigation.parts.map(part => ({
  id: part.id,
  part: part.part,
  title: part.title,
  openingPage: part.openingPages[0] ?? part.chapters[0]?.openingPage ?? part.supplementarySections[0]?.openingPage ?? null,
  chapters: part.chapters.map(chapter => ({
    chapter: chapter.chapter,
    title: chapter.title,
    openingPage: chapter.openingPage,
    pageNumbers: chapter.pageNumbers,
    pedagogicalMarkers: chapter.pedagogicalMarkers.map(marker => ({
      kind: marker.kind,
      pageNumber: marker.pageNumber,
      blockId: marker.blockId
    }))
  })),
  supplementarySections: part.supplementarySections.map(section => ({
    id: section.id,
    title: section.title,
    openingPage: section.openingPage,
    pageNumbers: section.pageNumbers
  }))
}));

const artifact = {
  schemaVersion: 1,
  sourceSemanticSchemaVersion: semantic.schemaVersion,
  sourcePageCount: semantic.manifest.pageCount,
  sourceSha256: semantic.source.sha256,
  chapterCount: semantic.manifest.tocChapterCount,
  pedagogicalMarkerCount: semantic.manifest.pedagogicalMarkerCount,
  generatedFrom: 'content/semantic-pages.json',
  frontMatter: semantic.navigation.frontMatter,
  parts
};

await writeFile(new URL('../content/navigation.json', import.meta.url), `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(`NAVIGATION_BUILD_OK parts=${parts.length} chapters=${artifact.chapterCount} markers=${artifact.pedagogicalMarkerCount} pages=${artifact.sourcePageCount}`);
