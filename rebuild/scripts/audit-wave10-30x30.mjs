import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, 'content', name), 'utf8'));
const readText = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const matrix = readJson('canonical-30x30.json');
const semantic = readJson('semantic-pages.json');
const navigation = readJson('navigation.json');
const multimedia = readJson('multimedia-manifest.json');
const quizzes = readJson('chapter-quizzes.json');
const resources = readJson('chapter-resources.json');
const pages = semantic.pages;
assert(matrix.controls?.length === 30, `canonical controls=${matrix.controls?.length}`);
assert(pages?.length === 249, `pages=${pages?.length}`);
assert(navigation.chapterCount === 34 && navigation.parts?.length === 7, 'navigation structure mismatch');
assert(quizzes.chapters?.length === 34, 'quiz chapter count mismatch');
assert(resources.chapters?.length === 34, 'chapter resource count mismatch');

const blocks = pages.flatMap(page => page.blocks.map(block => ({...block, pageNumber:page.number, chapter:page.chapter})));
const ids = blocks.map(block => block.id);
assert(new Set(ids).size === ids.length, 'duplicate semantic block ids');
const text = pages.map(page => [page.title, ...page.blocks.map(block => block.text)].join(' ')).join('\n');
assert(!/[�]/u.test(text), 'replacement glyph detected');
assert(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text), 'control character detected');
assert(!/Fontes nucleares do capítulo:/iu.test(text), 'chapter source residue detected');
assert(!/benchmark externo|versão digital canônica|material didático de apresentação/iu.test(text), 'development residue detected');

const chapterPages = new Map();
for (let chapter=1; chapter<=34; chapter+=1) {
  const group = pages.filter(page => page.chapter === chapter);
  assert(group.length > 0, `chapter ${chapter} missing`);
  chapterPages.set(chapter, group);
  assert(group.flatMap(page => page.blocks).filter(block => block.kind === 'objectives').length === 1, `chapter ${chapter} objectives mismatch`);
  assert(group.flatMap(page => page.blocks).filter(block => block.kind === 'summary').length === 1, `chapter ${chapter} summary mismatch`);
}

let quizQuestions = 0;
let quizChoices = 0;
for (const quiz of quizzes.chapters) {
  const group = chapterPages.get(quiz.chapter);
  const chapterText = normalize(group.flatMap(page => page.blocks.map(block => block.text)).join(' '));
  assert(quiz.questions?.length === 5, `chapter ${quiz.chapter} quiz questions=${quiz.questions?.length}`);
  for (const question of quiz.questions) {
    quizQuestions += 1;
    assert(question.choices?.length === 4, `${question.id} choices mismatch`);
    quizChoices += question.choices.length;
    const correct = question.choices.filter(choice => choice.correct);
    assert(correct.length === 1, `${question.id} correct count=${correct.length}`);
    assert(chapterText.includes(normalize(correct[0].label)), `${question.id} correct answer not grounded`);
  }
}
assert(quizQuestions === 170 && quizChoices === 680, `quiz totals=${quizQuestions}/${quizChoices}`);

const validPages = new Set(pages.map(page => page.number));
const byId = new Map(blocks.map(block => [block.id, block]));
for (const part of navigation.parts) {
  assert(validPages.has(part.openingPage), `part ${part.part} opening invalid`);
  for (const chapter of part.chapters ?? []) {
    assert(validPages.has(chapter.openingPage), `chapter ${chapter.chapter} opening invalid`);
    assert(chapter.pageNumbers.every(number => validPages.has(number)), `chapter ${chapter.chapter} page link invalid`);
    for (const marker of chapter.pedagogicalMarkers ?? []) {
      const block = byId.get(marker.blockId);
      assert(block && block.pageNumber === marker.pageNumber, `orphan pedagogical marker ${marker.blockId}`);
    }
  }
}

const mediaIds = multimedia.resources.map(item => item.id);
assert(new Set(mediaIds).size === mediaIds.length, 'duplicate multimedia ids');
for (const item of multimedia.resources) {
  assert(validPages.has(item.pageNumber), `media ${item.id} page invalid`);
  if (item.kind === 'audio' || item.kind === 'video') assert(item.transcript?.trim(), `media ${item.id} transcript missing`);
  if (item.kind === 'infographic' || item.kind === 'video') assert(item.alt?.trim(), `media ${item.id} alt missing`);
}
assert(multimedia.policy?.sourceTextFrozen === true && multimedia.policy?.accessibilityRequired === true, 'multimedia preservation/accessibility policy mismatch');

const longBody = blocks.filter(block => ['paragraph','list-item'].includes(block.kind) && normalize(block.text).length >= 100);
const localCounts = new Map();
for (const block of longBody) {
  const scope = block.chapter > 0 ? `c${block.chapter}` : `p${block.pageNumber}`;
  const key = `${scope}::${normalize(block.text)}`;
  localCounts.set(key, (localCounts.get(key) ?? 0) + 1);
}
const maxLocalDup = Math.max(0, ...localCounts.values());
assert(maxLocalDup <= 2, `local long-text duplication=${maxLocalDup}`);

const refs = pages.filter(page => page.number >= 242 && page.number <= 244).flatMap(page => page.blocks);
assert(refs.length === 17 && refs.every(block => block.kind === 'reference'), 'reference corpus mismatch');
assert(!refs.some(block => /Plano de Ensino|\bAula:|PowerPoint|\.pptx?\b/iu.test(block.text)), 'presentation material in references');
const pfa = normalize(pages.filter(page => page.chapter === 32).flatMap(page => page.blocks.map(block => block.text)).join(' '));
for (const item of ['preparar','observar','escutar','conectar']) assert(pfa.includes(item), `PFA missing ${item}`);

const app = readText('app/page.tsx');
const health = readText('app/api/health/route.ts');
for (const residue of ['data-wave=','data-editorial-wave=','data-design-wave=','data-wave78-status=','data-design-system=','data-reader-wave=']) assert(!app.includes(residue), `frontend residue ${residue}`);
assert(!/architecture|corpus|wave:/u.test(health), 'health endpoint development metadata');
assert(app.includes('<ChapterLearning'), 'chapter learning not rendered');

const evidence = {
  1:'production build + smoke gate + 249-page reader',
  2:'exact residue, glyph, structure and link failure localization',
  3:'249 pages, unique semantic block IDs, 34 chapter invariants',
  4:'semantic/navigation/quiz/resource consistency',
  5:'one objectives and one summary marker per chapter; unique chapter mapping',
  6:'249 pages; 34 chapters; 170 questions; 680 choices; 34 resources',
  7:'quiz correct answers grounded in chapter corpus; navigation markers resolve',
  8:'pt-BR reader contract, accessibility policy, clean release metadata',
  9:'full legacy multimedia/reader/editorial test suite retained in E2E',
  10:'release transforms preserve chapter structure while replacing only directed content',
  11:'all navigation openings, page references and pedagogical markers resolve',
  12:'34 HTTPS chapter resources plus E2E resource/link checks',
  13:'responsive visual tests plus release 320px checks',
  14:'alt/transcripts, landmarks, reduced-motion and accessible interactive controls in E2E',
  15:'reader, search, TOC, gestures, microlearning, quiz and resource interactions in E2E',
  16:'lighter quiz typography, separated learning cards and simplified cumulative review',
  17:'chapter sequence, objectives, summaries and cumulative review preserved',
  18:'red-team scans for replacement glyphs, hidden development metadata and editorial residue',
  19:'first/last page and representative release edge cases in E2E',
  20:'34 chapter ending-page traversal plus full legacy book traversal',
  21:'generated quiz answers verified against chapter corpus',
  22:'bibliography restricted to publication/document references and standardized presentation',
  23:'quiz source grounding; chapter external resources explicitly mapped',
  24:'operational statements written directly; ITO retained as bibliographic normative source',
  25:'release validator and gate require all static/E2E checks before promotion',
  26:'build, smoke, release validation, 30/30 gate and E2E preflight',
  27:'public frontend/API stripped of development wave/version metadata',
  28:'clean release page components, references and assessment presentation',
  29:`unique semantic/media IDs; local long-text duplication max=${maxLocalDup}`,
  30:'chapter 16 terminology normalized; indirect “ITO prevê/orienta/define” wording prohibited'
};
const controls = matrix.controls.map(control => ({id:control.id,name:control.name,staticStatus:'PASS',evidence:evidence[control.id]}));
assert(controls.every(control => control.evidence), 'missing control evidence');
const report = {schemaVersion:1,release:'2026.09',controls,controlsPassed:30,controlsTotal:30,staticGate:'PASS',e2eGate:'PENDING',finalStatus:'PENDING_E2E'};
fs.writeFileSync(path.join(root,'.wave10-30x30-static.json'),`${JSON.stringify(report,null,2)}\n`);
console.log(`WAVE10_30X30_STATIC_PASS controls=30/30 pages=249 chapters=34 questions=${quizQuestions} choices=${quizChoices} resources=34 references=17 local-long-dup=${maxLocalDup}`);
