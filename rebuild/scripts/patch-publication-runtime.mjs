import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const replace=(value,before,after,label)=>{
  if(value.includes(before)) value=value.replace(before,after);
  if(!value.includes(after)) throw new Error(`PUBLICATION_PATCH_FAIL ${label}`);
  return value;
};

const pagePath=path.join(root,'app','page.tsx');
let page=fs.readFileSync(pagePath,'utf8');
page=replace(page,'<span>Edição Digital Interativa • 249 páginas</span>','<span>Edição Digital Interativa • {pages.length} páginas</span>','dynamic-page-count');
const legacyEnrichment=[
'  const chapterEnrichment = currentChapter ? enrichment.chapters.find(item => item.chapter === currentChapter.chapter) ?? null : null;',
'  const pageMicrolearning = chapterEnrichment?.microlearning.pageNumber === currentPageNumber ? chapterEnrichment.microlearning : null;',
'  const pageTransfer = chapterEnrichment?.transfer.pageNumber === currentPageNumber ? chapterEnrichment.transfer : null;',
'  const pageResource = chapterEnrichment?.resource.pageNumber === currentPageNumber ? chapterEnrichment.resource : null;'
].join('\n');
const oldPatchedEnrichment=[
'  const pageMicrolearning = enrichment.chapters.find(item => item.microlearning.pageNumber === currentPageNumber)?.microlearning ?? null;',
'  const pageTransfer = enrichment.chapters.find(item => item.transfer.pageNumber === currentPageNumber)?.transfer ?? null;',
'  const pageResource = enrichment.chapters.find(item => item.resource.pageNumber === currentPageNumber)?.resource ?? null;'
].join('\n');
const cleanEnrichment=[
'  const pageMicrolearning = enrichment.chapters.find(item => item.microlearning.pageNumber === currentPageNumber)?.microlearning ?? null;',
'  const pageResource = enrichment.chapters.find(item => item.resource.pageNumber === currentPageNumber)?.resource ?? null;'
].join('\n');
if(page.includes(legacyEnrichment)) page=page.replace(legacyEnrichment,cleanEnrichment);
if(page.includes(oldPatchedEnrichment)) page=page.replace(oldPatchedEnrichment,cleanEnrichment);
if(!page.includes(cleanEnrichment)) throw new Error('PUBLICATION_PATCH_FAIL enrichment');
page=page.replace("import { VideoResourceCard, type Wave55VideoResource } from './wave55';\n",'');
page=page.replace("import { ChapterMicrolearningCard, ApplicationTransferCard, ChapterResourceCard, type ChapterEnrichment } from './wave10';","import { ChapterMicrolearningCard, ChapterResourceCard, type ChapterEnrichment } from './wave10';");
page=page.replace("  if (resource.kind === 'video' && resource.src === 'native://ats-system-video' && resource.transcript && resource.steps?.length) return <VideoResourceCard key={resource.id} resource={resource as Wave55VideoResource} />;\n",'');
page=page.replace("if (resource.kind !== 'infographic' || resource.src !== 'native://ats-system-macro' || !resource.steps?.length) return null;","if (resource.kind !== 'infographic' || !['native://ats-system-macro','native://cats-infographic'].includes(resource.src) || !resource.steps?.length) return null;");
page=page.replace('{pageMicrolearning && <ChapterMicrolearningCard data={pageMicrolearning} />}','{pageMicrolearning && <ChapterMicrolearningCard key={pageMicrolearning.id} data={pageMicrolearning} />}');
page=page.replace('{pageTransfer && <ApplicationTransferCard data={pageTransfer} />}','');
page=page.replace('{currentQuiz && <ChapterQuiz quiz={currentQuiz} />}','{currentQuiz && <ChapterQuiz key={currentQuiz.chapter} quiz={currentQuiz} />}');
const toolsBefore='<div className="tools"><button onClick={speak}';
const toolsAfter='<div className="tools"><a className="manualDownload" href="/api/manual" download="Manual-do-Participante-CATS.pdf" data-testid="manual-download" aria-label="Baixar Manual do Participante CATS em PDF">⇩ <span>Baixar PDF</span></a><button onClick={speak}';
if(page.includes(toolsBefore)) page=page.replace(toolsBefore,toolsAfter);
if(page.includes('VideoResourceCard')||page.includes('ApplicationTransferCard')||page.includes('pageTransfer')) throw new Error('PUBLICATION_PATCH_FAIL video-transfer-residue');
if(!page.includes('key={currentQuiz.chapter}')||!page.includes('native://cats-infographic')||!page.includes('data-testid="manual-download"')) throw new Error('PUBLICATION_PATCH_FAIL reader-contract');
fs.writeFileSync(pagePath,page);

const pdfPath=path.join(root,'app','api','manual','route.ts');
let pdf=fs.readFileSync(pdfPath,'utf8');
pdf=replace(pdf,"if (source.title && normalize(source.title) !== normalize(current?.title ?? '')) add({ kind: 'heading', text: source.title, level: 2 }, meta);","if (source.title) add({ kind: 'heading', text: source.title, level: 2 }, meta);",'pdf-title');
pdf=replace(pdf,'const MARGIN_X = 54;','const MARGIN_X = 70.87;','pdf-margin-x');
pdf=replace(pdf,'const TOP_Y = 764;','const TOP_Y = 744;','pdf-margin-top');
pdf=replace(pdf,'const BOTTOM_Y = 72;','const BOTTOM_Y = 74;','pdf-margin-bottom');
pdf=replace(pdf,"type ParagraphItem = { kind: 'paragraph'; lines: string[]; font: Font; size: number; leading: number; color: string; indent?: number; justify?: boolean; maxWidth?: number };","type ParagraphItem = { kind: 'paragraph'; lines: string[]; font: Font; size: number; leading: number; color: string; indent?: number; firstLineIndent?: number; justify?: boolean; maxWidth?: number };",'pdf-paragraph-type');

const oldHeight=[
'function itemHeight(item: Item) {',
"  if (item.kind === 'paragraph') return item.lines.length * item.leading + 7;",
"  if (item.kind === 'heading') return item.level === 1 ? 54 : item.level === 2 ? 34 : 25;",
"  if (item.kind === 'kicker') return 20;"
].join('\n');
const newHeight=[
'function itemHeight(item: Item) {',
"  if (item.kind === 'paragraph') return item.lines.length * item.leading + 7;",
"  if (item.kind === 'heading') {",
"    const size = item.level === 1 ? 22 : item.level === 2 ? 14.5 : 11.5;",
"    const font: Font = 'F2';",
"    const maxW = item.level === 1 ? CONTENT_W : CONTENT_W - 10;",
"    const leading = item.level === 1 ? 27 : item.level === 2 ? 19 : 15;",
"    const maxLines = item.level === 1 ? 3 : 4;",
"    return Math.min(maxLines, wrapWidth(item.text, maxW, size, font).length) * leading + 10;",
'  }',
"  if (item.kind === 'kicker') return 20;"
].join('\n');
pdf=replace(pdf,oldHeight,newHeight,'pdf-dynamic-heading-height');
const oldDefaults=[
"    const font = opts.font ?? 'F3'; const size = opts.size ?? 10.4; const leading = opts.leading ?? 15.2; const indent = opts.indent ?? 0;",
'    const maxWidth = opts.maxWidth ?? (CONTENT_W - indent);'
].join('\n');
const newDefaults=[
"    const font = opts.font ?? 'F1'; const size = opts.size ?? 12; const leading = opts.leading ?? 18; const indent = opts.indent ?? 0;",
'    const firstLineIndent = opts.firstLineIndent ?? 0;',
'    const maxWidth = opts.maxWidth ?? (CONTENT_W - indent - firstLineIndent);'
].join('\n');
pdf=replace(pdf,oldDefaults,newDefaults,'pdf-ite44-body');
pdf=replace(pdf,"const item: ParagraphItem = { kind: 'paragraph', lines: chunk, font, size, leading, color: opts.color ?? C.ink, indent, justify: opts.justify ?? true, maxWidth };","const item: ParagraphItem = { kind: 'paragraph', lines: chunk, font, size, leading, color: opts.color ?? C.ink, indent, firstLineIndent, justify: opts.justify ?? true, maxWidth };",'pdf-first-line-data');
pdf=pdf.replace("{ size: 11.2, leading: 17.2 }","{ size: 12, leading: 18 }");
pdf=pdf.replace("{ indent: 14, size: 10.1, leading: 14.6 }","{ indent: 14, size: 12, leading: 18, firstLineIndent: 0 }");
pdf=pdf.replace("{ size: 10.35, leading: 15.1, justify: true }","{ size: 12, leading: 18, justify: true, firstLineIndent: 35.43 }");
pdf=replace(pdf,"      const font: Font = item.level === 1 ? 'F4' : 'F2';","      const font: Font = 'F2';",'pdf-heading-font');
const oldParagraphRender=[
'      const x = MARGIN_X + (item.indent ?? 0); const maxW = item.maxWidth ?? (CONTENT_W - (item.indent ?? 0));',
'      for (let i = 0; i < item.lines.length; i++) {',
'        const l = item.lines[i]; const isLast = i === item.lines.length - 1; const spaces = (l.match(/ /g) || []).length;',
'        let tw = 0;',
'        if (item.justify && !isLast && spaces > 0 && l.length > 28) tw = clamp((maxW - textWidth(l, item.size, item.font)) / spaces, 0, 2.8);',
'        c.push(textCmd(l, x, y, item.font, item.size, item.color, tw)); y -= item.leading;',
'      }'
].join('\n');
const newParagraphRender=[
'      const xBase = MARGIN_X + (item.indent ?? 0); const maxW = item.maxWidth ?? (CONTENT_W - (item.indent ?? 0));',
'      for (let i = 0; i < item.lines.length; i++) {',
'        const l = item.lines[i]; const isLast = i === item.lines.length - 1; const spaces = (l.match(/ /g) || []).length;',
'        let tw = 0;',
'        if (item.justify && !isLast && spaces > 0 && l.length > 28) tw = clamp((maxW - textWidth(l, item.size, item.font)) / spaces, 0, 2.8);',
'        const x = xBase + (i === 0 ? (item.firstLineIndent ?? 0) : 0);',
'        c.push(textCmd(l, x, y, item.font, item.size, item.color, tw)); y -= item.leading;',
'      }'
].join('\n');
pdf=replace(pdf,oldParagraphRender,newParagraphRender,'pdf-first-line-render');
const oldCoverAccent=[
"  c.push(circle(485, 700, 150, '0.035 0.270 0.280'));",
"  c.push(circle(520, 730, 86, '0.045 0.335 0.340'));",
'  c.push(`${C.orange} rg 54 78 5 186 re f`);'
].join('\n');
const newCoverAccent='  c.push(`${C.orange} rg 70.87 78 5 186 re f`);';
if(pdf.includes(oldCoverAccent)) pdf=pdf.replace(oldCoverAccent,newCoverAccent);
const oldCoverDrawing=[
'  c.push(`${C.orange} rg 112 258 292 32 re f`);',
'  c.push(`${C.navy} rg 142 264 232 22 re f`);',
'  c.push(`${C.orange} rg 227 287 62 28 re f`);',
'  c.push(`${C.deep} rg 132 218 252 43 re f`);',
'  c.push(`${C.navy} rg 164 183 188 36 re f`);'
].join('\n');
const newCoverLogo=[
'  c.push(box(118, 230, 360, 116, C.navy, C.orange));',
"  c.push(centered('CATS', 298, 287, 'F2', 42, C.orange));",
"  c.push(centered('ATENDIMENTO A TENTATIVAS DE SUICIDIO', 298, 252, 'F2', 8.2, C.white));"
].join('\n');
pdf=replace(pdf,oldCoverDrawing,newCoverLogo,'pdf-cover-logo');
pdf=pdf.replace("'X-CATS-Editorial-Edition': 'publication-grade-2026'","'X-CATS-Editorial-Edition': 'publication-grade-ite44-2026'");
if(!pdf.includes('const MARGIN_X = 70.87;')||!pdf.includes('const leading = opts.leading ?? 18')||!pdf.includes('firstLineIndent: 35.43')||!pdf.includes('Math.min(maxLines, wrapWidth(item.text')||!pdf.includes("publication-grade-ite44-2026")) throw new Error('PUBLICATION_PATCH_FAIL pdf-contract');
fs.writeFileSync(pdfPath,pdf);
console.log('PUBLICATION_RUNTIME_PATCH_OK reader=clean quiz=reset infographics=enabled pdf=ITE44 overlap-safe cover=CATS');
