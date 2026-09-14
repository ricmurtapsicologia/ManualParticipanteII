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

const toolsBefore='<div className="tools"><button onClick={speak}';
const toolsAfter='<div className="tools"><a className="manualDownload" href="/api/manual" download="Manual-do-Participante-CATS.pdf" data-testid="manual-download" aria-label="Baixar Manual do Participante CATS em PDF">⇩ <span>Baixar PDF</span></a><button onClick={speak}';
if(source.includes(toolsBefore)) source=source.replace(toolsBefore,toolsAfter);
if(!source.includes('data-testid="manual-download"')) throw new Error('Wave10 manual download control not installed');

fs.writeFileSync(pagePath, source);
console.log('WAVE10_RUNTIME_PATCH_OK page-label=dynamic enrichment=page-number manual-download=pdf backstage=unchanged');
