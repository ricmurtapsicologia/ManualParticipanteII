import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const replace = (value, before, after, label) => {
  if (value.includes(before)) value = value.replace(before, after);
  if (!value.includes(after)) throw new Error(`Publication runtime patch missing: ${label}`);
  return value;
};

const pagePath = path.join(root, 'app', 'page.tsx');
let source = fs.readFileSync(pagePath, 'utf8');
source = replace(source, '<span>Edição Digital Interativa • 249 páginas</span>', '<span>Edição Digital Interativa • {pages.length} páginas</span>', 'dynamic page count');

const enrichmentBefore = `  const chapterEnrichment = currentChapter ? enrichment.chapters.find(item => item.chapter === currentChapter.chapter) ?? null : null;\n  const pageMicrolearning = chapterEnrichment?.microlearning.pageNumber === currentPageNumber ? chapterEnrichment.microlearning : null;\n  const pageTransfer = chapterEnrichment?.transfer.pageNumber === currentPageNumber ? chapterEnrichment.transfer : null;\n  const pageResource = chapterEnrichment?.resource.pageNumber === currentPageNumber ? chapterEnrichment.resource : null;`;
const enrichmentLegacyPatched = `  const pageMicrolearning = enrichment.chapters.find(item => item.microlearning.pageNumber === currentPageNumber)?.microlearning ?? null;\n  const pageTransfer = enrichment.chapters.find(item => item.transfer.pageNumber === currentPageNumber)?.transfer ?? null;\n  const pageResource = enrichment.chapters.find(item => item.resource.pageNumber === currentPageNumber)?.resource ?? null;`;
const enrichmentAfter = `  const pageMicrolearning = enrichment.chapters.find(item => item.microlearning.pageNumber === currentPageNumber)?.microlearning ?? null;\n  const pageResource = enrichment.chapters.find(item => item.resource.pageNumber === currentPageNumber)?.resource ?? null;`;
if (source.includes(enrichmentBefore)) source = source.replace(enrichmentBefore, enrichmentAfter);
if (source.includes(enrichmentLegacyPatched)) source = source.replace(enrichmentLegacyPatched, enrichmentAfter);
if (!source.includes(enrichmentAfter) || source.includes('pageTransfer =')) throw new Error('Transfer-card runtime removal not installed');

source = source.replace("import { VideoResourceCard, type Wave55VideoResource } from './wave55';\n", '');
source = source.replace("import { ChapterMicrolearningCard, ApplicationTransferCard, ChapterResourceCard, type ChapterEnrichment } from './wave10';", "import { ChapterMicrolearningCard, ChapterResourceCard, type ChapterEnrichment } from './wave10';");
source = source.replace("  if (resource.kind === 'video' && resource.src === 'native://ats-system-video' && resource.transcript && resource.steps?.length) return <VideoResourceCard key={resource.id} resource={resource as Wave55VideoResource} />;\n", '');
source = source.replace("if (resource.kind !== 'infographic' || resource.src !== 'native://ats-system-macro' || !resource.steps?.length) return null;", "if (resource.kind !== 'infographic' || !['native://ats-system-macro','native://cats-infographic'].includes(resource.src) || !resource.steps?.length) return null;");
source = source.replace('{pageMicrolearning && <ChapterMicrolearningCard data={pageMicrolearning} />}', '{pageMicrolearning && <ChapterMicrolearningCard key={pageMicrolearning.id} data={pageMicrolearning} />}');
source = source.replace('{pageTransfer && <ApplicationTransferCard data={pageTransfer} />}', '');
source = source.replace('{currentQuiz && <ChapterQuiz quiz={currentQuiz} />}', '{currentQuiz && <ChapterQuiz key={currentQuiz.chapter} quiz={currentQuiz} />}');
if (source.includes('VideoResourceCard') || source.includes('ApplicationTransferCard') || source.includes('pageTransfer')) throw new Error('Video/transfer UI residue remains');
if (!source.includes("native://cats-infographic")) throw new Error('Native infographic runtime support missing');
if (!source.includes('key={currentQuiz.chapter}')) throw new Error('Chapter quiz remount key missing');

const toolsBefore='<div className="tools"><button onClick={speak}';
const toolsAfter='<div className="tools"><a className="manualDownload" href="/api/manual" download="Manual-do-Participante-CATS.pdf" data-testid="manual-download" aria-label="Baixar Manual do Participante CATS em PDF">⇩ <span>Baixar PDF</span></a><button onClick={speak}';
if(source.includes(toolsBefore)) source=source.replace(toolsBefore,toolsAfter);
if(!source.includes('data-testid="manual-download"')) throw new Error('Manual download control not installed');
fs.writeFileSync(pagePath, source);

const manualRoutePath = path.join(root, 'app', 'api', 'manual', 'route.ts');
let manualRoute = fs.readFileSync(manualRoutePath, 'utf8');
manualRoute = replace(manualRoute, "if (source.title && normalize(source.title) !== normalize(current?.title ?? '')) add({ kind: 'heading', text: source.title, level: 2 }, meta);", "if (source.title) add({ kind: 'heading', text: source.title, level: 2 }, meta);", 'stable PDF title renderer');
manualRoute = replace(manualRoute, 'const MARGIN_X = 54;', 'const MARGIN_X = 70.87;', 'ITE44 horizontal margins');
manualRoute = replace(manualRoute, 'const TOP_Y = 764;', 'const TOP_Y = 744;', 'ITE44 top margin');
manualRoute = replace(manualRoute, 'const BOTTOM_Y = 72;', 'const BOTTOM_Y = 74;', 'ITE44 bottom margin');
manualRoute = replace(manualRoute, "type ParagraphItem = { kind: 'paragraph'; lines: string[]; font: Font; size: number; leading: number; color: string; indent?: number; justify?: boolean; maxWidth?: number };", "type ParagraphItem = { kind: 'paragraph'; lines: string[]; font: Font; size: number; leading: number; color: string; indent?: number; firstLineIndent?: number; justify?: boolean; maxWidth?: number };", 'first-line indent type');

const itemHeightBefore = `function itemHeight(item: Item) {\n  if (item.kind === 'paragraph') return item.lines.length * item.leading + 7;\n  if (item.kind === 'heading') return item.level === 1 ? 54 : item.level === 2 ? 34 : 25;\n  if (item.kind === 'kicker') return 20;`;
const itemHeightAfter = `function itemHeight(item: Item) {\n  if (item.kind === 'paragraph') return item.lines.length * item.leading + 7;\n  if (item.kind === 'heading') {\n    const size = item.level === 1 ? 22 : item.level === 2 ? 14.5 : 11.5;\n    const font: Font = 'F2';\n    const maxW = item.level === 1 ? CONTENT_W : CONTENT_W - 10;\n    const leading = item.level === 1 ? 27 : item.level === 2 ? 19 : 15;\n    const maxLines = item.level === 1 ? 3 : 4;\n    return Math.min(maxLines, wrapWidth(item.text, maxW, size, font).length) * leading + 10;\n  }\n  if (item.kind === 'kicker') return 20;`;
manualRoute = replace(manualRoute, itemHeightBefore, itemHeightAfter, 'dynamic heading height');

const paragraphDefaultsBefore = `    const font = opts.font ?? 'F3'; const size = opts.size ?? 10.4; const leading = opts.leading ?? 15.2; const indent = opts.indent ?? 0;\n    const maxWidth = opts.maxWidth ?? (CONTENT_W - indent);`;
const paragraphDefaultsAfter = `    const font = opts.font ?? 'F1'; const size = opts.size ?? 12; const leading = opts.leading ?? 18; const indent = opts.indent ?? 0;\n    const firstLineIndent = opts.firstLineIndent ?? 0;\n    const maxWidth = opts.maxWidth ?? (CONTENT_W - indent - firstLineIndent);`;
manualRoute = replace(manualRoute, paragraphDefaultsBefore, paragraphDefaultsAfter, 'ITE44 body typography');
manualRoute = replace(manualRoute, "const item: ParagraphItem = { kind: 'paragraph', lines: chunk, font, size, leading, color: opts.color ?? C.ink, indent, justify: opts.justify ?? true, maxWidth };", "const item: ParagraphItem = { kind: 'paragraph', lines: chunk, font, size, leading, color: opts.color ?? C.ink, indent, firstLineIndent, justify: opts.justify ?? true, maxWidth };", 'paragraph first-line data');
manualRoute = manualRoute.replace("{ size: 11.2, leading: 17.2 }", "{ size: 12, leading: 18 }");
manualRoute = manualRoute.replace("{ indent: 14, size: 10.1, leading: 14.6 }", "{ indent: 14, size: 12, leading: 18, firstLineIndent: 0 }");
manualRoute = manualRoute.replace("{ size: 10.35, leading: 15.1, justify: true }", "{ size: 12, leading: 18, justify: true, firstLineIndent: 35.43 }");

const headingFontBefore = "      const font: Font = item.level === 1 ? 'F4' : 'F2';";
const headingFontAfter = "      const font: Font = 'F2';";
manualRoute = replace(manualRoute, headingFontBefore, headingFontAfter, 'sans-serif title typography');
const paragraphRenderBefore = `      const x = MARGIN_X + (item.indent ?? 0); const maxW = item.maxWidth ?? (CONTENT_W - (item.indent ?? 0));\n      for (let i = 0; i < item.lines.length; i++) {\n        const l = item.lines[i]; const isLast = i === item.lines.length - 1; const spaces = (l.match(/ /g) || []).length;\n        let tw = 0;\n        if (item.justify && !isLast && spaces > 0 && l.length > 28) tw = clamp((maxW - textWidth(l, item.size, item.font)) / spaces, 0, 2.8);\n        c.push(textCmd(l, x, y, item.font, item.size, item.color, tw)); y -= item.leading;\n      }`;
const paragraphRenderAfter = `      const xBase = MARGIN_X + (item.indent ?? 0); const maxW = item.maxWidth ?? (CONTENT_W - (item.indent ?? 0));\n      for (let i = 0; i < item.lines.length; i++) {\n        const l = item.lines[i]; const isLast = i === item.lines.length - 1; const spaces = (l.match(/ /g) || []).length;\n        let tw = 0;\n        if (item.justify && !isLast && spaces > 0 && l.length > 28) tw = clamp((maxW - textWidth(l, item.size, item.font)) / spaces, 0, 2.8);\n        const x = xBase + (i === 0 ? (item.firstLineIndent ?? 0) : 0);\n        c.push(textCmd(l, x, y, item.font, item.size, item.color, tw)); y -= item.leading;\n      }`;
manualRoute = replace(manualRoute, paragraphRenderBefore, paragraphRenderAfter, 'first-line rendering');

const coverShapes = `  c.push(circle(485, 700, 150, '0.035 0.270 0.280'));\n  c.push(circle(520, 730, 86, '0.045 0.335 0.340'));\n  c.push(\`${C.orange} rg 54 78 5 186 re f\`);`;
const coverWordmark = `  c.push(\`${C.orange} rg 70.87 78 5 186 re f\`);`;
if (manualRoute.includes(coverShapes)) manualRoute = manualRoute.replace(coverShapes, coverWordmark);
const coverDrawing = `  c.push(\`${C.orange} rg 112 258 292 32 re f\`);\n  c.push(\`${C.navy} rg 142 264 232 22 re f\`);\n  c.push(\`${C.orange} rg 227 287 62 28 re f\`);\n  c.push(\`${C.deep} rg 132 218 252 43 re f\`);\n  c.push(\`${C.navy} rg 164 183 188 36 re f\`);`;
const coverLogo = `  c.push(box(118, 230, 360, 116, C.navy, C.orange));\n  c.push(centered('CATS', 298, 287, 'F2', 42, C.orange));\n  c.push(centered('ATENDIMENTO A TENTATIVAS DE SUICIDIO', 298, 252, 'F2', 8.2, C.white));`;
manualRoute = replace(manualRoute, coverDrawing, coverLogo, 'CATS PDF wordmark');
manualRoute = manualRoute.replace("'X-CATS-Editorial-Edition': 'publication-grade-2026'", "'X-CATS-Editorial-Edition': 'publication-grade-ite44-2026'");
if (!manualRoute.includes('leading: 18') || !manualRoute.includes('firstLineIndent: 35.43') || !manualRoute.includes('dynamic heading height') && !manualRoute.includes('Math.min(maxLines')) throw new Error('ITE44 PDF contract incomplete');
fs.writeFileSync(manualRoutePath, manualRoute);

console.log('WAVE10_RUNTIME_PATCH_OK page-count=dynamic transfer=removed video=removed quiz=chapter-reset infographics=native pdf=ITE44-1.5-overlap-safe cover=CATS-wordmark');
