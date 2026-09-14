import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pagePath = path.join(root, 'app', 'page.tsx');
let source = fs.readFileSync(pagePath, 'utf8');

const labelBefore = '<span>Edição Digital Interativa • 249 páginas</span>';
const labelAfter = '<span>Edição Digital Interativa • {pages.length} páginas</span>';
if (source.includes(labelBefore)) source = source.replace(labelBefore, labelAfter);
if (!source.includes(labelAfter)) throw new Error('Wave10 dynamic public page-count label not installed');

const enrichmentBefore = `  const chapterEnrichment = currentChapter ? enrichment.chapters.find(item => item.chapter === currentChapter.chapter) ?? null : null;\n  const pageMicrolearning = chapterEnrichment?.microlearning.pageNumber === currentPageNumber ? chapterEnrichment.microlearning : null;\n  const pageTransfer = chapterEnrichment?.transfer.pageNumber === currentPageNumber ? chapterEnrichment.transfer : null;\n  const pageResource = chapterEnrichment?.resource.pageNumber === currentPageNumber ? chapterEnrichment.resource : null;`;
const enrichmentAfter = `  const pageMicrolearning = enrichment.chapters.find(item => item.microlearning.pageNumber === currentPageNumber)?.microlearning ?? null;\n  const pageTransfer = enrichment.chapters.find(item => item.transfer.pageNumber === currentPageNumber)?.transfer ?? null;\n  const pageResource = enrichment.chapters.find(item => item.resource.pageNumber === currentPageNumber)?.resource ?? null;`;
if (source.includes(enrichmentBefore)) source = source.replace(enrichmentBefore, enrichmentAfter);
if (!source.includes(enrichmentAfter)) throw new Error('Wave10 page-number enrichment rendering not installed');

fs.writeFileSync(pagePath, source);
console.log('WAVE10_RUNTIME_PATCH_OK page-label=dynamic enrichment=page-number backstage=unchanged');
