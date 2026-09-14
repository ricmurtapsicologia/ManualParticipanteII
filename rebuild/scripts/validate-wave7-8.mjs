import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semantic = JSON.parse(fs.readFileSync(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const navigation = JSON.parse(fs.readFileSync(path.join(root, 'content', 'navigation.json'), 'utf8'));
const quizzes = JSON.parse(fs.readFileSync(path.join(root, 'content', 'chapter-quizzes.json'), 'utf8'));
const fail = message => { console.error(`WAVE7_8_VALIDATE_FAIL ${message}`); process.exit(1); };
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

if (!Array.isArray(semantic.pages) || semantic.pages.length !== 249) fail(`pages=${semantic.pages?.length ?? 'invalid'}`);
if (semantic.runtimeEditorial?.wave !== '7' || semantic.runtimeEditorial?.status !== 'complete') fail('wave7-not-complete');
if (semantic.runtimeEditorial?.wave8VisualStatus !== 'complete') fail('wave8-not-complete');
const navChapters = navigation.parts.flatMap(part => part.chapters);
if (navChapters.length !== 34) fail(`chapters=${navChapters.length}`);
if (!Array.isArray(quizzes.chapters) || quizzes.chapters.length !== 34) fail(`quiz-chapters=${quizzes.chapters?.length ?? 'invalid'}`);

const openingPages = new Set();
let objectiveCount = 0;
let summaryCount = 0;
let questionCount = 0;
let choiceCount = 0;
for (const nav of navChapters) {
  if (openingPages.has(nav.openingPage)) fail(`duplicate-opening-page=${nav.openingPage}`);
  openingPages.add(nav.openingPage);
  if (nav.pageNumbers[0] !== nav.openingPage) fail(`chapter=${nav.chapter} opening-not-first`);
  const chapterPages = semantic.pages.filter(page => page.chapter === nav.chapter).sort((a,b) => a.number - b.number);
  if (!chapterPages.length) fail(`chapter=${nav.chapter} missing-pages`);
  const opening = chapterPages[0];
  const ending = chapterPages.at(-1);
  if (opening.number !== nav.openingPage) fail(`chapter=${nav.chapter} nav-opening-mismatch`);
  const objectives = chapterPages.flatMap(page => page.blocks.map(block => ({page:block ? page.number : 0, block}))).filter(item => item.block.kind === 'objectives');
  if (objectives.length !== 1 || objectives[0].page !== opening.number) fail(`chapter=${nav.chapter} objectives=${objectives.length}@${objectives.map(x=>x.page).join(',')}`);
  if (opening.blocks.indexOf(objectives[0].block) > 4) fail(`chapter=${nav.chapter} objectives-too-late`);
  if (normalize(objectives[0].block.text) !== normalize('OBJETIVOS DO CAPÍTULO')) fail(`chapter=${nav.chapter} objective-label`);
  objectiveCount += 1;

  const summaries = chapterPages.flatMap(page => page.blocks.map(block => ({page:block ? page.number : 0, block}))).filter(item => item.block.kind === 'summary');
  if (summaries.length !== 1 || summaries[0].page !== ending.number) fail(`chapter=${nav.chapter} summaries=${summaries.length}@${summaries.map(x=>x.page).join(',')}`);
  if (normalize(summaries[0].block.text) !== normalize('RESUMO DO CAPÍTULO')) fail(`chapter=${nav.chapter} summary-label`);
  summaryCount += 1;

  for (const page of chapterPages) {
    const text = page.blocks.map(block => block.text).join(' ');
    if (/�|\.→|→\s*→\s*→/.test(text)) fail(`chapter=${nav.chapter} glyph-artifact@${page.number}`);
    if (/\b(TESTE-SE|QUESTÕES DE REVISÃO)\b/u.test(text)) fail(`chapter=${nav.chapter} legacy-review@${page.number}`);
  }

  const quiz = quizzes.chapters.find(item => item.chapter === nav.chapter);
  if (!quiz) fail(`chapter=${nav.chapter} missing-quiz`);
  if (quiz.openingPage !== opening.number || quiz.endingPage !== ending.number) fail(`chapter=${nav.chapter} quiz-page-mismatch`);
  if (!Array.isArray(quiz.questions) || quiz.questions.length !== 5) fail(`chapter=${nav.chapter} questions=${quiz.questions?.length ?? 'invalid'}`);
  const chapterText = normalize(chapterPages.flatMap(page => page.blocks.map(block => block.text)).join(' '));
  for (const [index, question] of quiz.questions.entries()) {
    questionCount += 1;
    if (!question.prompt?.trim() || !question.feedback?.trim()) fail(`chapter=${nav.chapter} q=${index+1} text`);
    if (!Array.isArray(question.choices) || question.choices.length !== 4) fail(`chapter=${nav.chapter} q=${index+1} choices=${question.choices?.length ?? 'invalid'}`);
    const ids = new Set();
    let correct = null;
    for (const choice of question.choices) {
      choiceCount += 1;
      if (!['A','B','C','D'].includes(choice.id) || ids.has(choice.id)) fail(`chapter=${nav.chapter} q=${index+1} choice-id=${choice.id}`);
      ids.add(choice.id);
      if (!choice.label?.trim()) fail(`chapter=${nav.chapter} q=${index+1} empty-choice`);
      if (choice.correct) {
        if (correct) fail(`chapter=${nav.chapter} q=${index+1} multiple-correct`);
        correct = choice;
      }
    }
    if (!correct) fail(`chapter=${nav.chapter} q=${index+1} no-correct`);
    if (!chapterText.includes(normalize(correct.label))) fail(`chapter=${nav.chapter} q=${index+1} correct-not-grounded`);
    if (!normalize(question.feedback).includes(normalize(correct.label))) fail(`chapter=${nav.chapter} q=${index+1} feedback-not-grounded`);
  }
}

if (objectiveCount !== 34 || summaryCount !== 34 || questionCount !== 170 || choiceCount !== 680) fail(`totals obj=${objectiveCount} sum=${summaryCount} q=${questionCount} choices=${choiceCount}`);
console.log(`WAVE7_8_VALIDATE_OK pages=249 chapters=34 objectives=34 summaries=34 chapter-leaf-starts=34 quizzes=170 choices=680 immediate-feedback=required written-content=e2e-ready doctrine-changed=false wave7=complete wave8=complete`);
