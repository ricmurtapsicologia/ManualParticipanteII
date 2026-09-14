import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, 'content', name), 'utf8'));
const readText = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const semantic = readJson('semantic-pages.json');
const learning = readJson('chapter-learning.json');
const quizzes = readJson('chapter-quizzes.json');
const navigation = readJson('navigation.json');
const app = readText('app/page.tsx');
const quizUi = readText('app/wave18.tsx');
const quizCss = readText('app/wave18.css');
const releaseUi = readText('app/wave20.tsx');
const releaseCss = readText('app/wave20.css');

assert(Array.isArray(semantic.pages) && semantic.pages.length === 249, `pages=${semantic.pages?.length}`);
assert(navigation.chapterCount === 34, `navigation chapters=${navigation.chapterCount}`);
assert(learning.chapters?.length === 34, `chapter-learning=${learning.chapters?.length}`);
assert(quizzes.chapters?.length === 34, `quizzes chapters=${quizzes.chapters?.length}`);

const allText = semantic.pages.flatMap(page => page.blocks.map(block => block.text)).join('\n');
const bodyText = semantic.pages.filter(page => page.number < 242 || page.number > 244).flatMap(page => page.blocks.map(block => block.text)).join('\n');
assert(!/\bITO\s*30(?:\/2026)?\b/iu.test(bodyText), 'ITO 30 meta-reference remains in body text');
assert(!/TESTE-SE|QUESTÕES DE REVISÃO|Resposta orientadora\s*[—-]/iu.test(allText), 'legacy review/test residue remains');
assert(!/_{8,}/u.test(allText), 'worksheet underline residue remains');
assert(!/\b(?:ChatGPT|OpenAI|Vercel|GitHub|branch|commit|placeholder|TODO|FIXME)\b/iu.test(allText), 'development/backstage residue remains');
assert(!/\b(?:wave|onda)\s*\d+/iu.test(allText), 'wave/onda residue remains in reader content');
assert(!/vers[aã]o(?:ões)?\s+em\s+andamento|vers[aã]o\s+digital\s+can[oô]nica|benchmark\s+externo/iu.test(allText), 'editorial backstage phrasing remains');
assert(!semantic.pages.flatMap(page => page.blocks).some(block => block.kind === 'review'), 'legacy review blocks remain');
assert(!semantic.pages.flatMap(page => page.blocks).some(block => /long-heading-demoted/iu.test(block.id) && /^\d+\.\s/u.test(block.text) && block.text.length > 150), 'fused long numeric heading remains');

for (let chapter = 1; chapter <= 34; chapter += 1) {
  const pages = semantic.pages.filter(page => page.chapter === chapter).sort((a,b) => a.number - b.number);
  assert(pages.length > 0, `chapter ${chapter} missing`);
  assert(pages.flatMap(page => page.blocks).filter(block => block.kind === 'objectives').length === 1, `chapter ${chapter} objectives`);
  assert(pages.flatMap(page => page.blocks).filter(block => block.kind === 'summary').length === 1, `chapter ${chapter} summary`);
  const learningItem = learning.chapters.find(item => item.chapter === chapter);
  assert(learningItem, `chapter ${chapter} learning missing`);
  assert(learningItem.openingPage === pages[0].number && learningItem.endingPage === pages.at(-1).number, `chapter ${chapter} learning bounds`);
  assert(String(learningItem.application).length > 20, `chapter ${chapter} application too short`);
  assert(String(learningItem.transfer).length > 20, `chapter ${chapter} transfer too short`);
  assert(String(learningItem.microPrompt).length > 25 && String(learningItem.microAnswer).length > 20, `chapter ${chapter} microlearning incomplete`);
  assert(/^https:\/\//u.test(learningItem.resource?.url ?? ''), `chapter ${chapter} resource URL invalid`);
  assert(String(learningItem.resource?.label ?? '').length > 8, `chapter ${chapter} resource label missing`);
  const quiz = quizzes.chapters.find(item => item.chapter === chapter);
  assert(quiz?.questions?.length === 5, `chapter ${chapter} quiz questions=${quiz?.questions?.length}`);
  assert(quiz.questions.every(question => question.choices?.length === 4), `chapter ${chapter} quiz choices`);
}
assert(new Set(learning.chapters.map(item => item.resource.url)).size >= 8, 'external resources lack thematic diversity');

const chapter16 = semantic.pages.filter(page => page.chapter === 16);
assert(chapter16.length > 0 && chapter16.every(page => page.title === 'Ferramentas de diálogo na abordagem de dissuasão'), 'chapter 16 title not normalized');

const pspText = norm(semantic.pages.filter(page => page.chapter === 32).flatMap(page => page.blocks.map(block => block.text)).join(' '));
for (const term of ['preparar','olhar','escutar','conectar']) assert(pspText.includes(term), `PSP missing ${term}`);
assert(pspText.includes('nao e psicoterapia'), 'PSP must distinguish psychotherapy');
assert(pspText.includes('nao exige relato detalhado'), 'PSP must reject compulsory detailed recounting');
assert(pspText.includes('rede formal'), 'PSP formal network criterion missing');
assert(pspText.includes('posvencao'), 'PSP posvention missing');

const cumulative = semantic.pages.filter(page => page.number >= 217 && page.number <= 239);
assert(cumulative.length === 23 && cumulative.every(page => page.title === 'Revisão cumulativa'), 'cumulative review pages not rebuilt');
const cumulativeChapters = cumulative.flatMap(page => page.blocks.filter(block => block.kind === 'heading' && /^Capítulo\s+\d+\s+—/u.test(block.text)));
assert(cumulativeChapters.length === 34, `cumulative chapter coverage=${cumulativeChapters.length}`);

const refPages = semantic.pages.filter(page => page.number >= 242 && page.number <= 244);
assert(refPages.length === 3 && refPages.every(page => page.title === 'Referências'), 'reference pages title invalid');
const refs = refPages.flatMap(page => page.blocks);
assert(refs.length >= 12 && refs.every(block => block.kind === 'reference'), `references=${refs.length}`);
const refText = refs.map(block => block.text).join('\n');
assert(!/\b(?:PowerPoint|PPT)\b|\bAula\s*:|Plano de Ensino|material did[aá]tico de apresenta[cç][aã]o|benchmark/iu.test(refText), 'non-bibliographic presentation material remains in references');
assert(!/v3\.6|vers[aã]o digital can[oô]nica/iu.test(refText), 'draft/canonical residue remains in references');
assert(refText.includes('Disponível em:') && refText.includes('Acesso em:'), 'online ABNT access fields missing');

assert(app.includes("chapter-learning.json"), 'chapter learning manifest not wired into frontend');
assert(app.includes('<ChapterLearningCard'), 'chapter learning component not rendered');
assert(app.includes("className=\"referenceEntry\""), 'ABNT reference presentation not wired');
assert(!/data-(?:wave|editorial-wave|design-wave|wave78-status|design-system|design-subwave|semantic-renderer|multimedia-wave|reader-wave)=/u.test(app), 'internal release metadata remains in frontend');
assert(releaseUi.includes('Aplicação e transferência') && releaseUi.includes('Microlearning') && releaseUi.includes('Aprofundamento'), 'chapter learning UI incomplete');
assert(releaseUi.includes('target="_blank"') && releaseUi.includes('noopener'), 'external link safety incomplete');
assert(quizUi.includes('Questão') && quizUi.includes('feedback'), 'quiz UI missing didactic structure');
assert(!/font-weight:\s*(?:700|750|800|900)/u.test(quizCss + '\n' + releaseCss), 'excessive bold remains in chapter learning/quiz CSS');
assert(releaseCss.includes('.referenceEntry') && releaseCss.includes('text-align:left'), 'ABNT reference CSS missing');

assert(semantic.runtimeEditorial?.status === 'release-candidate', `release status=${semantic.runtimeEditorial?.status}`);
assert(semantic.runtimeEditorial?.chapterMicrolearning === 34, 'microlearning metadata !=34');
assert(semantic.runtimeEditorial?.chapterExternalResources === 34, 'chapter resources metadata !=34');
assert(semantic.runtimeEditorial?.references === 'ABNT-NBR-6023-2025', 'ABNT metadata missing');

console.log(`WAVE10_VALIDATE_OK pages=249 chapters=34 objectives=34 summaries=34 quizzes=170 choices=680 microlearning=34 links=34 cumulative=34 references=${refs.length} psp=enhanced frontend-backstage=clean abnt=6023:2025 release-candidate=PASS`);
