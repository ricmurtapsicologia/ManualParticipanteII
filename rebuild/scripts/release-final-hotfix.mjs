import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const fail = message => { throw new Error(`RELEASE_FINAL_HOTFIX_FAIL ${message}`); };

const pagePath = path.join(root, 'app', 'page.tsx');
let page = fs.readFileSync(pagePath, 'utf8');
const pdfAnchor = '<a className="manualDownload" href="/api/manual" download="Manual-do-Participante-CATS.pdf" data-testid="manual-download" aria-label="Baixar Manual do Participante CATS em PDF">⇩ <span>Baixar PDF</span></a>';
const epubAnchor = '<a className="manualDownload" href="/api/epub" download="Manual-do-Participante-CATS.epub" data-testid="epub-download" aria-label="Baixar Manual do Participante CATS em EPUB">⇩ <span>Baixar EPUB</span></a>';
if (!page.includes(epubAnchor)) {
  if (!page.includes(pdfAnchor)) fail('PDF download anchor not found');
  page = page.replace(pdfAnchor, `${pdfAnchor}${epubAnchor}`);
}
if (!page.includes('const requiredVoice =')) {
  const ttsBefore = "    const utterance = new SpeechSynthesisUtterance([current.title, ...current.blocks.map(block => block.text)].join('. '));\n    utterance.voice = selectPreferredVoice('Antônio', 'pt-BR'); utterance.lang = 'pt-BR'; utterance.rate = 0.96;";
  const ttsAfter = "    const utterance = new SpeechSynthesisUtterance([current.title, ...current.blocks.map(block => block.text)].join('. '));\n    let requiredVoice = null;\n    try { requiredVoice = selectPreferredVoice('Antônio', 'pt-BR'); } catch { return; }\n    if (!requiredVoice) return;\n    utterance.voice = requiredVoice; utterance.lang = 'pt-BR'; utterance.rate = 0.96;";
  if (!page.includes(ttsBefore)) fail('global TTS anchor missing');
  page = page.replace(ttsBefore, ttsAfter);
}
if (!page.includes('{pages.length} páginas')) fail('dynamic reader page count missing');
if (!page.includes('data-testid="epub-download"')) fail('EPUB CTA missing');
if (!page.includes('requiredVoice = selectPreferredVoice')) fail('strict global TTS guard missing');
fs.writeFileSync(pagePath, page);

const pdfPath = path.join(root, 'app', 'api', 'manual', 'route.ts');
const pdf = fs.readFileSync(pdfPath, 'utf8');
for (const token of [
  'const MARGIN_X = 70.87;',
  'const leading = opts.leading ?? 18',
  'firstLineIndent: 35.43',
  'AUTORIA INSTITUCIONAL',
  'PREFÁCIO DO COORDENADOR',
  "'X-CATS-Editorial-Edition': 'publication-grade-ite44-frontmatter-2026'",
  "centered('CATS'"
]) if (!pdf.includes(token)) fail(`PDF canonical token missing: ${token}`);

console.log('RELEASE_FINAL_HOTFIX_OK reader=dynamic epub=cta tts=Antonio-only pdf=ite44-cats');
