import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const multimediaPath = path.join(root, 'content', 'multimedia-manifest.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const multimedia = JSON.parse(fs.readFileSync(multimediaPath, 'utf8'));
const removed = new Set([2, 4, 5]);
const originalCount = artifact.pages?.length;
if (!Array.isArray(artifact.pages) || originalCount !== 249) throw new Error(`Wave10 removal expected 249 pages, got ${originalCount ?? 'invalid'}`);

const mapPage = oldNumber => {
  if (!Number.isInteger(oldNumber) || removed.has(oldNumber)) return null;
  let shift = 0;
  for (const n of removed) if (n < oldNumber) shift += 1;
  return oldNumber - shift;
};
const mapList = values => (values ?? []).map(mapPage).filter(Number.isInteger);

const removedSnapshots = artifact.pages.filter(page => removed.has(page.number)).map(page => ({
  number: page.number,
  title: page.title,
  text: page.blocks?.map(block => block.text).join(' ') ?? ''
}));
if (removedSnapshots.length !== 3) throw new Error(`Wave10 expected three removable pages, got ${removedSnapshots.length}`);

artifact.pages = artifact.pages
  .filter(page => !removed.has(page.number))
  .map(page => ({ ...page, number: mapPage(page.number) }));

if (artifact.pages.length !== 246) throw new Error(`Wave10 expected 246 pages after removal, got ${artifact.pages.length}`);
artifact.pages.forEach((page, index) => {
  if (page.number !== index + 1) throw new Error(`Wave10 page sequence mismatch at index=${index} number=${page.number}`);
});

if (artifact.manifest) artifact.manifest.pageCount = 246;
if (artifact.navigation?.frontMatter) {
  artifact.navigation.frontMatter = artifact.navigation.frontMatter.map(section => {
    const pageNumbers = mapList(section.pageNumbers);
    return { ...section, pageNumbers, openingPage: pageNumbers[0] ?? null };
  }).filter(section => section.pageNumbers.length > 0);
}
if (artifact.navigation?.parts) {
  artifact.navigation.parts = artifact.navigation.parts.map(part => ({
    ...part,
    openingPages: mapList(part.openingPages),
    chapters: (part.chapters ?? []).map(chapter => {
      const pageNumbers = mapList(chapter.pageNumbers);
      return { ...chapter, pageNumbers, openingPage: mapPage(chapter.openingPage) ?? pageNumbers[0] ?? null };
    }),
    supplementarySections: (part.supplementarySections ?? []).map(section => {
      const pageNumbers = mapList(section.pageNumbers);
      return { ...section, pageNumbers, openingPage: mapPage(section.openingPage) ?? pageNumbers[0] ?? null };
    }).filter(section => section.pageNumbers.length > 0)
  }));
}

const bibliographyStandard = 'ABNT NBR 6023:2018, versão corrigida 2:2020';
artifact.runtimeEditorial = {
  ...(artifact.runtimeEditorial ?? {}),
  publicPageCount: 246,
  removedFrontMatterPages: [2, 4, 5],
  removalReason: 'author-approved final release cleanup',
  bibliographyStandard
};
artifact.bibliography = { ...(artifact.bibliography ?? {}), standard: bibliographyStandard };

if (!Array.isArray(multimedia.resources)) throw new Error('Wave10 multimedia resources missing');
const beforeMedia = multimedia.resources.length;
multimedia.resources = multimedia.resources
  .filter(resource => !removed.has(resource.pageNumber))
  .map(resource => ({ ...resource, pageNumber: mapPage(resource.pageNumber) }));
multimedia.publicPageCount = 246;
multimedia.removedFrontMatterPages = [2, 4, 5];

const removedText = removedSnapshots.map(item => item.text).join(' ');
const publicText = artifact.pages.map(page => [page.title, ...(page.blocks ?? []).map(block => block.text)].join(' ')).join('\n');
for (const residue of ['COMANDANTE-GERAL DO CBMMG', 'HIERARQUIA DE FONTES', 'Minutas V3.1 a V3.4']) {
  if (publicText.includes(residue)) throw new Error(`Wave10 removed-page residue remains: ${residue}`);
}
if (!/COMANDANTE-GERAL DO CBMMG/iu.test(removedText) || !/HIERARQUIA DE FONTES/iu.test(removedText)) throw new Error('Wave10 annex page fingerprints not found before removal');

fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
fs.writeFileSync(multimediaPath, `${JSON.stringify(multimedia, null, 2)}\n`);
console.log(`WAVE10_PAGE_REMOVAL_OK removed=2,4,5 pages=246 multimedia=${beforeMedia}->${multimedia.resources.length} remapped=true bibliography=ABNT-NBR-6023-2018-corrigida-2020`);
