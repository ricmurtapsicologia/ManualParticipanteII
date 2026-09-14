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
const navigation = readJson('navigation.json');
const quizzes = readJson('chapter-quizzes.json');
const assets = readJson('chapter-learning-assets.json');
const matrix = readJson('canonical-30x30.json');
const pageSource = readText('app/page.tsx');
const quizSource = readText('app/wave18.tsx');
const wave10Source = readText('app/wave10.tsx');
const wave10Css = readText('app/wave10.css');

assert(semantic.pages?.length === 249, `pages=${semantic.pages?.length}`);
assert(navigation.chapterCount === 34, `chapters=${navigation.chapterCount}`);
assert(quizzes.chapters?.length === 34, `quiz chapters=${quizzes.chapters?.length}`);
assert(assets.chapters?.length === 34, `learning assets=${assets.chapters?.length}`);
assert(matrix.controls?.length === 30, `canonical controls=${matrix.controls?.length}`);
assert(semantic.runtimeEditorial?.wave10?.version === '10.0.0', `wave10=${semantic.runtimeEditorial?.wave10?.version}`);

const chapterNodes = navigation.parts.flatMap(part => part.chapters ?? []).sort((a,b) => a.chapter - b.chapter);
assert(chapterNodes.length === 34, `chapter nodes=${chapterNodes.length}`);
const assetByChapter = new Map(assets.chapters.map(item => [item.chapter, item]));
const quizByChapter = new Map(quizzes.chapters.map(item => [item.chapter, item]));
for (const chapter of chapterNodes) {
  const asset = assetByChapter.get(chapter.chapter);
  const quiz = quizByChapter.get(chapter.chapter);
  assert(asset, `chapter ${chapter.chapter} missing learning asset`);
  assert(quiz, `chapter ${chapter.chapter} missing quiz`);
  assert(asset.openingPage === chapter.openingPage, `chapter ${chapter.chapter} asset opening=${asset.openingPage}`);
  assert(asset.endingPage === quiz.endingPage, `chapter ${chapter.chapter} asset ending=${asset.endingPage}`);
  assert(asset.microlearning?.prompt && asset.microlearning?.reveal, `chapter ${chapter.chapter} incomplete microlearning`);
  assert(asset.transfer?.apply && asset.transfer?.transfer, `chapter ${chapter.chapter} incomplete transfer`);
  assert(/^https:\/\//u.test(asset.resource?.url ?? ''), `chapter ${chapter.chapter} invalid resource url`);
  assert(asset.resource?.title && asset.resource?.source, `chapter ${chapter.chapter} incomplete resource metadata`);
  assert(quiz.questions?.length === 5, `chapter ${chapter.chapter} questions=${quiz.questions?.length}`);
  for (const question of quiz.questions) {
    assert(question.choices?.length === 4, `${question.id} choices=${question.choices?.length}`);
    assert(question.choices.filter(choice => choice.correct).length === 1, `${question.id} correct-choice count`);
  }
  const chapterPages = semantic.pages.filter(page => page.chapter === chapter.chapter).sort((a,b) => a.number - b.number);
  assert(chapterPages[0]?.number === chapter.openingPage, `chapter ${chapter.chapter} does not start on its own leaf`);
  assert(chapterPages.flatMap(page => page.blocks).filter(block => block.kind === 'objectives').length === 1, `chapter ${chapter.chapter} objectives`);
  assert(chapterPages.flatMap(page => page.blocks).filter(block => block.kind === 'summary').length === 1, `chapter ${chapter.chapter} summary`);
  assert(chapterPages.flatMap(page => page.blocks).filter(block => block.kind === 'review').length === 0, `chapter ${chapter.chapter} legacy review marker remains`);
  assert(!chapterPages.flatMap(page => page.blocks).some(block => /w7h-review-(?:question|sources)/u.test(block.id)), `chapter ${chapter.chapter} legacy review units remain`);
}

const userTextOutsideReferences = semantic.pages.filter(page => page.number < 242 || page.number > 244).flatMap(page => [page.title, ...page.blocks.map(block => block.text)]).join('\n');
const normalizedUserText = normalize(userTextOutsideReferences);
for (const banned of ['chatgpt','system prompt','prompt interno','prompt do sistema','modelo de linguagem','sourceblockid','runtime editorial','benchmark externo','material didatico de apresentacao','aula oficial','plano de ensino','powerpoint','.ppt','.pptx','versao digital canonica']) {
  assert(!normalizedUserText.includes(banned), `user-facing residue=${banned}`);
}
assert(!/\bITO 30(?:\/2026)?\b/iu.test(userTextOutsideReferences), 'body still narratively cites ITO 30');
assert(!/Fontes nucleares do capítulo/iu.test(userTextOutsideReferences), 'chapter source boilerplate remains');
assert(!/Resposta orientadora\s*[—-]/iu.test(semantic.pages.filter(page => page.number >= 217 && page.number <= 239).flatMap(page => page.blocks.map(block => block.text)).join('\n')), 'old cumulative answer-key text remains');
for (let pageNumber = 217; pageNumber <= 239; pageNumber += 1) {
  const page = semantic.pages.find(item => item.number === pageNumber);
  assert(page?.title === 'Revisão cumulativa', `cumulative page ${pageNumber} title=${page?.title}`);
  assert(page.blocks.some(block => /^Capítulo \d+ —/u.test(block.text)), `cumulative page ${pageNumber} lacks chapter anchor`);
}

const referencePages = semantic.pages.filter(page => page.number >= 242 && page.number <= 244);
const references = referencePages.flatMap(page => page.blocks.map(block => block.text));
assert(references.length >= 14, `references=${references.length}`);
for (const page of referencePages) assert(page.title === 'Referências', `reference page ${page.number} title=${page.title}`);
const referenceText = references.join('\n');
assert(!/(?:PowerPoint|\.pptx?\b|Plano de Ensino|Aula:|Material didático de apresentação)/iu.test(referenceText), 'non-bibliographic presentation material remains in references');
assert(referenceText.includes('Instrução Técnica Operacional n. 30'), 'ITO 30 missing from final references');
assert(referenceText.includes('Boletim Epidemiológico'), 'epidemiological bulletin missing from references');
assert(referenceText.includes('Tratado de suicidologia'), 'book reference missing');
assert(referenceText.includes('Applied and Preventive Psychology'), 'journal article reference missing');
for (const ref of references.filter(text => /Disponível em:/u.test(text))) assert(/Acesso em:\s+\d{1,2}\s+[a-zç.]+\s+\d{4}/iu.test(ref), `online reference lacks access date: ${ref.slice(0,80)}`);

const pspText = semantic.pages.filter(page => page.chapter === 32).flatMap(page => page.blocks.map(block => block.text)).join('\n');
for (const term of ['Preparar','Olhar','Escutar','Conectar','não é psicoterapia','debriefing psicológico compulsório','Posvenção']) assert(normalize(pspText).includes(normalize(term)), `PSP missing=${term}`);
assert(!/ITO 30/iu.test(pspText), 'PSP still cites ITO narratively');

const forbiddenFrontendMarkers = ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-semantic-renderer=', 'data-multimedia-wave=', 'data-reader-wave='];
for (const marker of forbiddenFrontendMarkers) assert(!pageSource.includes(marker), `frontend release residue=${marker}`);
assert(pageSource.includes('ChapterMicrolearning'), 'chapter microlearning not rendered');
assert(pageSource.includes('ChapterTransfer'), 'chapter transfer not rendered');
assert(pageSource.includes('ChapterResource'), 'chapter resource not rendered');
assert(wave10Source.includes('target="_blank"') && wave10Source.includes('noopener noreferrer'), 'external resource security attributes missing');
assert(!/fontWeight:\s*(?:700|750|800|900)/u.test(pageSource), 'heavy inline emphasis remains in reader');
assert(!/font-weight:\s*(?:700|750|800|900)/u.test(wave10Css), 'heavy emphasis remains in wave10 CSS');
assert(quizSource.includes('5 questões para checar compreensão'), 'final quiz didactic header missing');
assert(wave10Css.includes('chapterQuizChoices{display:grid;grid-template-columns:1fr 1fr'), 'quiz desktop organization missing');
assert(wave10Css.includes('@media(max-width:700px)'), 'quiz/mobile responsive layer missing');

const trivialPattern = /^(?:[-–—•·_*#=]{1,12}|abrir recurso(?:\s+abrir recurso)*|xx+)$/iu;
const trivialBlocks = semantic.pages.flatMap(page => page.blocks.map(block => ({ page: page.number, text: block.text }))).filter(item => trivialPattern.test(String(item.text).trim()));
assert(trivialBlocks.length === 0, `trivial blocks remain=${JSON.stringify(trivialBlocks.slice(0,5))}`);

console.log(`WAVE10_VALIDATE_OK pages=249 chapters=34 objectives=34 summaries=34 microlearning=34 resources=34 transfer=34 quizzes=170 choices=680 cumulative=23 references=${references.length} pfa=refined prompt-residue=0 ito-body-citations=0 slides-in-references=0 frontend-release-residue=0`);
