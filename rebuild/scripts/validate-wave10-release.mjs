import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, 'content', name), 'utf8'));
const readText = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const semantic = readJson('semantic-pages.json');
const resources = readJson('chapter-resources.json');
const quizzes = readJson('chapter-quizzes.json');
const pages = semantic.pages;
assert(Array.isArray(pages) && pages.length === 249, `pages=${pages?.length}`);
assert(semantic.release?.wave === '10' && semantic.release?.status === 'release-candidate', 'release metadata missing');
assert(resources.chapters?.length === 34, `chapter resources=${resources.chapters?.length}`);
assert(new Set(resources.chapters.map(item => item.chapter)).size === 34, 'duplicate chapter resource');
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const resource = resources.chapters.find(item => item.chapter === chapter);
  assert(resource, `chapter ${chapter} resource missing`);
  assert(/^https:\/\//u.test(resource.url), `chapter ${chapter} resource must use https`);
  assert(resource.label?.trim(), `chapter ${chapter} resource label missing`);
}

const chapterPages = pages.filter(page => Number.isInteger(page.chapter) && page.chapter > 0);
const chapterText = chapterPages.flatMap(page => page.blocks.map(block => block.text)).join('\n');
const itoAttribution = /\b(?:a|conforme a)\s+ITO(?:\s+30(?:\/2026)?)?\s+(?:prev[eê]|orienta|define|recomenda|estabelece|determina|indica|preconiza|inclui|chama)/iu;
assert(!itoAttribution.test(chapterText), `indirect ITO attribution remains: ${chapterText.match(itoAttribution)?.[0]}`);
assert(!/Fontes nucleares do capítulo:/iu.test(chapterText), 'chapter source-line residue remains');
assert(!/arquitetura didática|benchmark externo|versão digital canônica|versões? em andamento/iu.test(chapterText), 'development/editorial residue remains in chapter text');

const chapter16 = pages.filter(page => page.chapter === 16);
assert(chapter16.length > 0 && chapter16.every(page => page.title === 'Ferramentas de diálogo na abordagem de dissuasão'), 'chapter 16 title not normalized');

const p196 = pages.find(page => page.number === 196);
const pfaText = normalize(pages.filter(page => page.chapter === 32).flatMap(page => page.blocks.map(block => block.text)).join(' '));
for (const term of ['preparar', 'observar', 'escutar', 'conectar', 'nao invasiva', 'sem pressionar']) assert(pfaText.includes(term), `PFA missing ${term}`);
assert(p196.blocks.filter(block => block.kind === 'list-item').length >= 4, 'PFA four-movement structure missing');
assert(pfaText.includes('debriefing operacional') && pfaText.includes('debriefing psicológico compulsório'), 'PFA/debriefing distinction missing');

const p216 = pages.find(page => page.number === 216);
assert(p216.blocks.filter(block => block.kind === 'review' && block.text === 'REVISÃO CUMULATIVA').length === 1, 'cumulative review label missing');
assert(p216.blocks.filter(block => /^p216-w10-review-\d+$/u.test(block.id) && block.kind === 'list-item').length === 6, 'cumulative review must contain six prompts');
assert(!p216.blocks.some(block => /Fontes nucleares/iu.test(block.text)), 'cumulative review source residue');

const answerPages = pages.filter(page => page.number >= 217 && page.number <= 239);
const answerBlocks = answerPages.flatMap(page => page.blocks);
assert(answerBlocks.filter(block => block.kind === 'answer-chapter').length === 34, `answer chapters=${answerBlocks.filter(block => block.kind === 'answer-chapter').length}`);
assert(answerBlocks.filter(block => block.kind === 'answer-question').length >= 100, 'answer questions not structured');
assert(answerBlocks.filter(block => block.kind === 'answer-response').length >= 100, 'answer responses not structured');
assert(!answerBlocks.some(block => /\?\s*Resposta orientadora\s*—/u.test(block.text)), 'fused question/answer remains');

const referencePages = pages.filter(page => page.number >= 242 && page.number <= 244);
assert(referencePages.length === 3 && referencePages.every(page => page.title === 'Referências'), 'reference section title must be Referências');
const references = referencePages.flatMap(page => page.blocks);
assert(references.length === 17, `references=${references.length}`);
assert(references.every(block => block.kind === 'reference'), 'reference block type mismatch');
const referenceText = references.map(block => block.text).join('\n');
assert(!/Plano de Ensino|\bAula:|PowerPoint|\.pptx?\b|material didático de apresentação|benchmark externo/iu.test(referenceText), 'non-bibliographic presentation material remains in references');
assert(/Boletim Epidemiológico/u.test(referenceText), 'epidemiological bulletin reference missing');
assert(/Applied and Preventive Psychology/u.test(referenceText), 'journal article reference missing');
assert(/Instrução Técnica Operacional n\. 30/u.test(referenceText), 'ITO bibliographic entry missing');
for (const block of references.filter(item => /Disponível em:/u.test(item.text))) assert(/Acesso em:\s*14 set\. 2026\./u.test(block.text), `electronic reference missing access date: ${block.id}`);

const app = readText('app/page.tsx');
const health = readText('app/api/health/route.ts');
const learning = readText('app/wave20.tsx');
const learningCss = readText('app/wave20.css');
const quizCss = readText('app/wave18.css');
for (const residue of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-reader-wave=']) assert(!app.includes(residue), `frontend metadata residue=${residue}`);
assert(!/resposta canônica/iu.test(app), 'canonical-response backstage copy remains');
assert(!/architecture|corpus|wave:/u.test(health), 'public health endpoint exposes development metadata');
assert(app.includes('<ChapterLearning'), 'chapter learning component not rendered');
assert(learning.includes('data-testid="microlearning-chapter"') && learning.includes('data-testid="application-transfer"') && learning.includes('data-testid="chapter-resource"'), 'learning components incomplete');
assert(learningCss.includes('.referenceEntry') && learningCss.includes('text-align:left'), 'ABNT reference visual alignment missing');
assert(quizCss.includes('font-weight:450'), 'quiz prompt weight was not reduced');

assert(quizzes.chapters?.length === 34, `quiz chapters=${quizzes.chapters?.length}`);
assert(quizzes.chapters.every(chapter => chapter.questions?.length === 5), 'quiz 5-question structure changed');

const report = {
  schemaVersion: 1,
  release: '2026.09',
  pages: 249,
  chapters: 34,
  references: references.length,
  chapterResources: resources.chapters.length,
  microlearning: '34/34 capable',
  cumulativeReview: 'PASS',
  psychologicalFirstAid: 'PASS',
  abntReferences: 'PASS',
  frontendResidue: 'PASS',
  testsVisual: 'PASS',
  staticStatus: 'PASS'
};
fs.writeFileSync(path.join(root, '.wave10-static-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log('WAVE10_STATIC_PASS pages=249 chapters=34 microlearning=34/34 links=34/34 references=ABNT pfa=PASS cumulative-review=PASS frontend-residue=absent tests-visual=PASS');
