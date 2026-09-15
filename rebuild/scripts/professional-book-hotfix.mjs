import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pdfPath = path.join(root, 'app', 'api', 'manual', 'route.ts');
let pdf = fs.readFileSync(pdfPath, 'utf8');
const fail = message => { throw new Error(`PROFESSIONAL_BOOK_HOTFIX_FAIL ${message}`); };
const replace = (before, after, label) => {
  if (pdf.includes(before)) pdf = pdf.replace(before, after);
  if (!pdf.includes(after)) fail(label);
};

replace('const MARGIN_X = 70.87;', 'const MARGIN_X = 58;', 'book-margin-x');
replace('const TOP_Y = 744;', 'const TOP_Y = 760;', 'book-margin-top');
replace('const BOTTOM_Y = 74;', 'const BOTTOM_Y = 64;', 'book-margin-bottom');
replace("const font = opts.font ?? 'F1'; const size = opts.size ?? 12; const leading = opts.leading ?? 18; const indent = opts.indent ?? 0;", "const font = opts.font ?? 'F3'; const size = opts.size ?? 11.2; const leading = opts.leading ?? 16; const indent = opts.indent ?? 0;", 'book-body-font');
pdf = pdf.replaceAll('firstLineIndent: 35.43', 'firstLineIndent: 22');
pdf = pdf.replaceAll('{ size: 12, leading: 18 }', '{ size: 11.2, leading: 16 }');
pdf = pdf.replaceAll('{ indent: 14, size: 12, leading: 18, firstLineIndent: 0 }', '{ indent: 14, size: 11.1, leading: 15.8, firstLineIndent: 0 }');
pdf = pdf.replaceAll('{ size: 12, leading: 18, justify: true, firstLineIndent: 22 }', '{ size: 11.2, leading: 16, justify: true, firstLineIndent: 22 }');
pdf = pdf.replace("if (item.kind === 'paragraph') return item.lines.length * item.leading + 7;", "if (item.kind === 'paragraph') return item.lines.length * item.leading + 5;");
pdf = pdf.replace('      y -= 7; continue;', '      y -= 5; continue;');
pdf = pdf.replace('clamp((maxW - textWidth(l, item.size, item.font)) / spaces, 0, 2.8)', 'clamp((maxW - textWidth(l, item.size, item.font)) / spaces, 0, 5.5)');

const coverPattern = /function renderCover\(\) \{[\s\S]*?\n\}\n\nfunction renderDivider/;
const coverReplacement = [
  'function renderCover() {',
  '  const c: string[] = [];',
  '  c.push(`${C.navy} rg 0 0 ${A4.w} ${A4.h} re f`);',
  '  c.push(`${C.orange} rg 0 ${A4.h - 12} ${A4.w} 12 re f`);',
  "  c.push(textCmd('CATS', 58, 720, 'F2', 70, C.white));",
  '  c.push(`${C.orange} rg 174 712 42 58 re f`);',
  "  c.push(textCmd('MANUAL DO PARTICIPANTE', 58, 665, 'F2', 10.5, C.orange));",
  "  c.push(textCmd('ATENDIMENTO A', 58, 590, 'F2', 34, C.white));",
  "  c.push(textCmd('TENTATIVAS DE', 58, 548, 'F2', 34, C.white));",
  "  c.push(textCmd('SUICIDIO', 58, 506, 'F2', 34, C.white));",
  '  c.push(`${C.orange} rg 58 478 250 4 re f`);',
  "  c.push(textCmd('Escuta, tecnica, seguranca e humanidade.', 58, 447, 'F3', 15.5, '0.760 0.845 0.825'));",
  "  c.push(line(74, 262, 520, 176, '0.090 0.360 0.355', 16));",
  "  c.push(line(82, 232, 514, 150, '0.040 0.270 0.275', 7));",
  '  c.push(circle(165, 300, 44, C.white));',
  '  c.push(`${C.orange} rg 127 329 76 20 re f`);',
  '  c.push(`${C.white} rg 104 160 122 112 re f`);',
  "  c.push(circle(298, 280, 38, '0.760 0.845 0.825'));",
  '  c.push(`0.760 0.845 0.825 rg 245 160 106 95 re f`);',
  '  c.push(circle(435, 300, 44, C.white));',
  '  c.push(`${C.orange} rg 397 329 76 20 re f`);',
  '  c.push(`${C.white} rg 374 160 122 112 re f`);',
  '  c.push(line(220, 250, 268, 220, C.orange, 10));',
  '  c.push(line(376, 250, 328, 220, C.orange, 10));',
  '  c.push(`${C.orange} rg 0 126 ${A4.w} 8 re f`);',
  "  c.push(textCmd('CORPO DE BOMBEIROS MILITAR DE MINAS GERAIS', 58, 91, 'F2', 9.2, C.white));",
  "  c.push(textCmd('GTO ATS  -  CATS  -  FORMACAO ESPECIALIZADA', 58, 70, 'F1', 7.8, '0.690 0.790 0.770'));",
  "  c.push(textCmd('CONHECIMENTO QUE SALVA VIDAS', 58, 43, 'F2', 8.6, C.orange));",
  "  c.push(textCmd('2026', 500, 43, 'F2', 11.5, C.white));",
  "  return c.join('\\n');",
  '}',
  '',
  'function renderDivider'
].join('\n');
if (!coverPattern.test(pdf)) fail('cover-pattern');
pdf = pdf.replace(coverPattern, coverReplacement);

const footerAnchor = "  c.push(line(MARGIN_X, 53, A4.w - MARGIN_X, 53, C.line, 0.6));";
const densityBlock = [
  '  if (y < BOTTOM_Y - 0.5) throw new Error(`PDF_LAYOUT_OVERFLOW page=${index + 1} y=${y.toFixed(2)} bottom=${BOTTOM_Y}`);',
  '  const blankHeight = y - BOTTOM_Y;',
  '  if (blankHeight > FLOW_H * 0.20) {',
  '    const fillBottom = BOTTOM_Y + 8;',
  '    const fillTop = y - 10;',
  '    const fillHeight = Math.max(0, fillTop - fillBottom);',
  '    if (fillHeight > 24) {',
  '      c.push(`${C.paleTeal} rg ${MARGIN_X} ${fillBottom} ${CONTENT_W} ${fillHeight} re f`);',
  '      c.push(`${C.teal} RG 1.2 w ${MARGIN_X + 18} ${fillBottom + 18} m ${A4.w - MARGIN_X - 18} ${fillTop - 18} l S`);',
  '      c.push(circle(A4.w - MARGIN_X - 40, fillTop - 34, 18, C.white));',
  "      c.push(textCmd('CATS', MARGIN_X + 18, fillBottom + 19, 'F2', 8.1, C.teal));",
  "      c.push(textCmd('ESCUTA  -  TECNICA  -  SEGURANCA  -  HUMANIDADE', MARGIN_X + 62, fillBottom + 19, 'F1', 6.9, C.muted));",
  '    }',
  '  }',
  '  // PDF_BOOK_DENSITY_FILL: regular pages receive an editorial fill whenever residual blank area exceeds 20% of the text flow.',
  footerAnchor
].join('\n');
replace(footerAnchor, densityBlock, 'density-fill');

pdf = pdf.replace("'X-CATS-Editorial-Edition': 'publication-grade-ite44-frontmatter-2026'", "'X-CATS-Editorial-Edition': 'publication-grade-book-2026'");

for (const token of [
  'const MARGIN_X = 58;',
  "const font = opts.font ?? 'F3'; const size = opts.size ?? 11.2; const leading = opts.leading ?? 16",
  'firstLineIndent: 22',
  'PDF_LAYOUT_OVERFLOW',
  'PDF_BOOK_DENSITY_FILL',
  "'X-CATS-Editorial-Edition': 'publication-grade-book-2026'",
  "textCmd('CATS', 58, 720, 'F2', 70"
]) if (!pdf.includes(token)) fail(`contract:${token}`);

fs.writeFileSync(pdfPath, pdf);
console.log('PROFESSIONAL_BOOK_HOTFIX_OK cover=vector branding=strong body=Times11.2 justification=full density<=20pct overlap-guard=on');
