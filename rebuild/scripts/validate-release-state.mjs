import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const readJson = url => readFile(url, 'utf8').then(JSON.parse);
const fail = message => { throw new Error(message); };

const sourceUrl = new URL('../content/pages.json', import.meta.url);
const sourceText = await readFile(sourceUrl, 'utf8');
const source = JSON.parse(sourceText);
const [semantic, navigation, quizzes] = await Promise.all([
  readJson(new URL('../content/semantic-pages.json', import.meta.url)),
  readJson(new URL('../content/navigation.json', import.meta.url)),
  readJson(new URL('../content/chapter-quizzes.json', import.meta.url))
]);

const sourceSha256 = createHash('sha256').update(sourceText).digest('hex');
const RELEASE_PAGES = 223;
const SOURCE_PAGES = 249;
const CHAPTERS = 34;

if (!Array.isArray(source) || source.length !== SOURCE_PAGES) fail(`Canonical source must preserve ${SOURCE_PAGES} pages, got ${source?.length ?? 'invalid'}`);
if (!source.every((page, index) => page.number === index + 1)) fail('Canonical source page sequence is not contiguous 1..249');
if (new Set(source.map(page => page.number)).size !== SOURCE_PAGES) fail('Canonical source contains duplicate page numbers');

if (semantic.schemaVersion !== 2) fail(`Semantic schema must be 2, got ${semantic.schemaVersion}`);
if (semantic.source?.pageCount !== SOURCE_PAGES) fail(`Semantic provenance must point to ${SOURCE_PAGES} source pages`);
if (semantic.source?.sha256 !== sourceSha256) fail('Semantic provenance hash does not match pages.json');
if (!Array.isArray(semantic.pages) || semantic.pages.length !== RELEASE_PAGES) fail(`Published semantic artifact must contain ${RELEASE_PAGES} pages, got ${semantic.pages?.length ?? 'invalid'}`);
if (!semantic.pages.every((page, index) => page.number === index + 1)) fail('Published semantic page sequence is not contiguous 1..223');
if (semantic.pages.some(page => !String(page.title ?? '').trim())) fail('Published semantic artifact contains untitled page');
if (semantic.pages.some(page => (page.blocks ?? []).some(block => String(block.text ?? '').includes('�')))) fail('Replacement-glyph artifact detected in published text');

const semanticChapters = [...new Set(semantic.pages.map(page => Number(page.chapter)).filter(chapter => chapter > 0))].sort((a,b) => a-b);
const expectedChapters = Array.from({ length: CHAPTERS }, (_, index) => index + 1);
if (JSON.stringify(semanticChapters) !== JSON.stringify(expectedChapters)) fail(`Published semantic chapter sequence mismatch: ${semanticChapters.join(',')}`);

if (navigation.schemaVersion !== 1) fail(`Navigation schema must be 1, got ${navigation.schemaVersion}`);
if (navigation.sourcePageCount !== RELEASE_PAGES) fail(`Navigation must cover ${RELEASE_PAGES} published pages, got ${navigation.sourcePageCount}`);
if (navigation.sourceSha256 !== sourceSha256) fail('Navigation provenance hash does not match pages.json');
if (!Array.isArray(navigation.parts) || navigation.parts.length !== 7) fail(`Expected 7 parts, got ${navigation.parts?.length ?? 'invalid'}`);
const navChapters = navigation.parts.flatMap(part => part.chapters ?? []);
if (navChapters.length !== CHAPTERS) fail(`Expected ${CHAPTERS} navigation chapters, got ${navChapters.length}`);
if (JSON.stringify(navChapters.map(item => Number(item.chapter))) !== JSON.stringify(expectedChapters)) fail('Navigation chapter sequence is not 1..34');
for (const chapter of navChapters) {
  if (!Array.isArray(chapter.pageNumbers) || !chapter.pageNumbers.length) fail(`Chapter ${chapter.chapter} has no page coverage`);
  if (chapter.openingPage !== chapter.pageNumbers[0]) fail(`Chapter ${chapter.chapter} opening page mismatch`);
  if (chapter.pageNumbers.some(page => page < 1 || page > RELEASE_PAGES)) fail(`Chapter ${chapter.chapter} references page outside 1..223`);
}

if (!Array.isArray(quizzes.chapters) || quizzes.chapters.length !== CHAPTERS) fail(`Expected ${CHAPTERS} quiz chapters, got ${quizzes.chapters?.length ?? 'invalid'}`);
let questionCount = 0;
let choiceCount = 0;
for (const quiz of quizzes.chapters) {
  if (!Array.isArray(quiz.questions) || quiz.questions.length !== 5) fail(`Chapter ${quiz.chapter} must contain 5 quiz questions`);
  questionCount += quiz.questions.length;
  for (const question of quiz.questions) {
    if (!String(question.prompt ?? '').trim() || !String(question.feedback ?? '').trim()) fail(`Chapter ${quiz.chapter} has incomplete quiz question`);
    if (!Array.isArray(question.choices) || question.choices.length !== 4) fail(`Chapter ${quiz.chapter} question must contain 4 alternatives`);
    if (question.choices.filter(choice => choice.correct).length !== 1) fail(`Chapter ${quiz.chapter} question must contain exactly one correct alternative`);
    choiceCount += question.choices.length;
  }
}
if (questionCount !== 170 || choiceCount !== 680) fail(`Quiz totals mismatch q=${questionCount} choices=${choiceCount}`);

console.log(`RELEASE_STATE_VALIDATE_OK source=${SOURCE_PAGES} published=${RELEASE_PAGES} parts=7 chapters=${CHAPTERS} quizzes=${questionCount} choices=${choiceCount} source=${sourceSha256.slice(0,12)}`);
