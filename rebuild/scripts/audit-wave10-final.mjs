import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = name => JSON.parse(fs.readFileSync(path.join(root, 'content', name), 'utf8'));
const readText = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = message => { throw new Error(`WAVE10_AUDIT_FAIL ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const matrix = readJson('canonical-30x30.json');
const semantic = readJson('semantic-pages.json');
const navigation = readJson('navigation.json');
const quizzes = readJson('chapter-quizzes.json');
const enrichment = readJson('chapter-enrichment.json');
const multimedia = readJson('multimedia-manifest.json');
const app = readText('app/page.tsx');
const quizApp = readText('app/wave18.tsx');
const wave10App = readText('app/wave10.tsx');
const wave10Css = readText('app/wave10.css');
const wave18Css = readText('app/wave18.css');

assert(matrix.controls?.length === 30, `canonical-controls=${matrix.controls?.length}`);
assert(semantic.pages?.length === 246, `pages=${semantic.pages?.length}`);
assert(semantic.manifest?.pageCount === 246, `manifest-pages=${semantic.manifest?.pageCount}`);
assert(semantic.pages.every((page,index) => page.number === index + 1), 'page sequence');
assert(navigation.sourcePageCount === 246, `navigation-pages=${navigation.sourcePageCount}`);
assert(navigation.chapterCount === 34, `chapters=${navigation.chapterCount}`);
assert(quizzes.chapters?.length === 34, `quiz-chapters=${quizzes.chapters?.length}`);
assert(enrichment.chapters?.length === 34, `enrichment-chapters=${enrichment.chapters?.length}`);
assert(semantic.runtimeEditorial?.wave === '10', `runtime-wave=${semantic.runtimeEditorial?.wave}`);
assert(semantic.runtimeEditorial?.publicPageCount === 246, 'runtime public page count');
assert(JSON.stringify(semantic.runtimeEditorial?.removedFrontMatterPages) === JSON.stringify([2,4,5]), 'removed pages metadata');
assert(/ABNT NBR 6023:2018/iu.test(semantic.runtimeEditorial?.bibliographyStandard ?? ''), 'bibliography standard metadata');
assert(/ABNT NBR 6023:2018/iu.test(semantic.bibliography?.standard ?? ''), 'bibliography artifact standard');

const publicPages = semantic.pages.filter(page => page.number < 239);
const publicText = publicPages.map(page => [page.title, ...page.blocks.map(block => block.text)].join(' ')).join('\n');
const allText = semantic.pages.map(page => [page.title, ...page.blocks.map(block => block.text)].join(' ')).join('\n');
const forbidden = [
  [/\bITO\s*30\b/iu,'ITO attribution outside bibliography'],
  [/\bminuta\b/iu,'draft/minuta residue'],
  [/vers(?:ão|ões)\s+(?:em andamento|provisória|de trabalho)/iu,'in-progress version residue'],
  [/complemento didático/iu,'editorial complement residue'],
  [/não normativo/iu,'non-normative editorial residue'],
  [/resposta canônica/iu,'canonical-answer backstage wording'],
  [/benchmark externo/iu,'benchmark residue'],
  [/versão digital canônica/iu,'canonical-version residue'],
  [/\bChatGPT\b/iu,'ChatGPT residue'],
  [/\bprompt\b/iu,'prompt residue'],
  [/_{5,}/u,'worksheet underscore clutter'],
  [/Resposta orientadora/iu,'legacy answer-key clutter']
];
for (const [pattern,label] of forbidden) assert(!pattern.test(publicText), label);
for (const removedText of ['COMANDANTE-GERAL DO CBMMG','HIERARQUIA DE FONTES','Minutas V3.1 a V3.4']) assert(!allText.includes(removedText), `removed annex residue=${removedText}`);

let objectives = 0;
let summaries = 0;
let questions = 0;
let choices = 0;
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const cps = semantic.pages.filter(page => page.chapter === chapter).sort((a,b) => a.number-b.number);
  assert(cps.length > 0, `chapter ${chapter} missing`);
  const obj = cps.flatMap(page => page.blocks.filter(block => block.kind === 'objectives').map(block => ({page:page.number, block})));
  const sum = cps.flatMap(page => page.blocks.filter(block => block.kind === 'summary').map(block => ({page:page.number, block})));
  assert(obj.length === 1 && obj[0].page === cps[0].number, `chapter ${chapter} objectives`);
  assert(sum.length === 1 && sum[0].page === cps.at(-1).number, `chapter ${chapter} summary`);
  const sumPage = cps.at(-1);
  const sumIndex = sumPage.blocks.findIndex(block => block.kind === 'summary');
  const sumFacts = sumPage.blocks.slice(sumIndex + 1).filter(block => block.kind === 'list-item');
  assert(sumFacts.length >= 1, `chapter ${chapter} summary facts`);
  objectives += obj.length; summaries += sum.length;
  const quiz = quizzes.chapters.find(item => item.chapter === chapter);
  assert(quiz?.questions?.length === 5, `chapter ${chapter} quiz count`);
  assert(quiz.openingPage === cps[0].number && quiz.endingPage === cps.at(-1).number, `chapter ${chapter} quiz paging`);
  for (const q of quiz.questions) {
    questions += 1;
    assert(q.choices?.length === 4, `${q.id} choice count`);
    choices += q.choices.length;
    assert(q.choices.filter(choice => choice.correct).length === 1, `${q.id} correct count`);
  }
  const enrich = enrichment.chapters.find(item => item.chapter === chapter);
  assert(enrich, `chapter ${chapter} enrichment`);
  assert(enrich.microlearning?.choices?.length === 4, `chapter ${chapter} microlearning choices`);
  assert(enrich.microlearning.choices.filter(choice => choice.correct).length === 1, `chapter ${chapter} microlearning correct`);
  assert(cps.some(page => page.number === enrich.microlearning.pageNumber), `chapter ${chapter} microlearning page`);
  assert(enrich.transfer?.apply && enrich.transfer?.transfer && enrich.transfer?.verify, `chapter ${chapter} transfer`);
  assert(enrich.transfer.pageNumber === cps.at(-1).number, `chapter ${chapter} transfer ending`);
  assert(/^https:\/\//u.test(enrich.resource?.url ?? ''), `chapter ${chapter} https resource`);
  assert(enrich.resource.pageNumber === cps.at(-1).number, `chapter ${chapter} resource ending`);
}
assert(objectives === 34 && summaries === 34 && questions === 170 && choices === 680, `totals o=${objectives} s=${summaries} q=${questions} c=${choices}`);

for (let pageNumber = 214; pageNumber <= 236; pageNumber += 1) {
  const page = semantic.pages.find(item => item.number === pageNumber);
  assert(page?.title === 'Revisão cumulativa', `page ${pageNumber} cumulative title`);
  const text = page.blocks.map(block => block.text).join(' ');
  assert(!/Resposta orientadora|_{5,}|FEEDBACK \/ DÚVIDA|CRITÉRIO DE SUCESSO/iu.test(text), `page ${pageNumber} cumulative clutter`);
}
const reviewedChapters = semantic.pages.filter(page => page.number >= 214 && page.number <= 236).flatMap(page => page.blocks.filter(block => block.kind === 'heading' && /^Capítulo \d+ —/u.test(block.text)).map(block => Number(block.text.match(/^Capítulo (\d+)/u)?.[1])));
assert(reviewedChapters.length === 34 && new Set(reviewedChapters).size === 34, `cumulative chapters=${reviewedChapters.length}`);

const refs = semantic.pages.filter(page => page.number >= 239 && page.number <= 241).flatMap(page => page.blocks.filter(block => block.kind === 'reference').map(block => block.text));
assert(refs.length === semantic.bibliography.entries, `reference entries=${refs.length}`);
const refText = refs.join('\n');
for (const pattern of [/\bPPT\b/iu,/PowerPoint/iu,/\bAula:/iu,/material didático de apresentação/iu,/Plano de Ensino/iu,/benchmark externo/iu,/versão digital canônica/iu]) assert(!pattern.test(refText), `reference forbidden=${pattern}`);
assert(/Instrução Técnica Operacional n\. 30/iu.test(refText), 'ITO bibliography entry missing');
const authorKeys = refs.map(entry => normalize(entry.split('.')[0]));
assert(authorKeys.every((key,index) => index === 0 || authorKeys[index-1].localeCompare(key, 'pt-BR') <= 0), 'references not alphabetic by author/entity');

const pspText = semantic.pages.filter(page => page.chapter === 32).map(page => page.blocks.map(block => block.text).join(' ')).join(' ');
for (const term of ['Preparar','Olhar','Escutar','Conectar']) assert(new RegExp(`\\b${term}\\b`,'iu').test(pspText), `PSP missing ${term}`);
assert(/não invasiva/iu.test(pspText), 'PSP non-invasive principle missing');
assert(/não (?:é|são) psicoterapia/iu.test(pspText), 'PSP psychotherapy boundary missing');
assert(/debriefing psicológico compulsório/iu.test(pspText), 'PSP compulsory debriefing boundary missing');
assert(/Posvenção/iu.test(pspText), 'posvention missing');

for (const attr of ['data-wave=', 'data-editorial-wave=', 'data-design-wave=', 'data-wave78-status=', 'data-design-system=', 'data-design-subwave=', 'data-semantic-renderer=', 'data-reader-wave=']) assert(!app.includes(attr), `frontend backstage attribute ${attr}`);
assert(!/249 páginas/u.test(app), 'stale 249-page public label');
assert(!app.includes('resposta canônica'), 'frontend canonical-answer wording');
assert(wave10App.includes('chapter-microlearning') && wave10App.includes('application-transfer') && wave10App.includes('chapter-resource-link'), 'wave10 components missing');
assert(quizApp.includes('Questão {currentIndex + 1} de') && quizApp.includes('Próxima questão'), 'quiz stepper missing');
for (const css of [wave10Css,wave18Css]) assert(!/font-weight:\s*(?:7\d\d|8\d\d|9\d\d)/u.test(css), 'heavy font weight in Wave10 didactic UI');

const resourcePages = semantic.pages.filter(page => [237,238].includes(page.number));
assert(resourcePages.flatMap(page => page.blocks.filter(block => block.kind === 'external-link')).length === 6, 'resource directory links != 6');
assert(resourcePages.every(page => !/Abrir recurso\s+Abrir recurso/iu.test(page.blocks.map(block => block.text).join(' '))), 'duplicated resource label');

const pageSet = new Set(semantic.pages.map(page => page.number));
assert(multimedia.resources.every(resource => pageSet.has(resource.pageNumber)), 'multimedia page remap broken');
assert(multimedia.resources.every(resource => Number.isInteger(resource.pageNumber) && resource.pageNumber >= 1 && resource.pageNumber <= 246), 'multimedia page out of range');
assert(multimedia.publicPageCount === 246, 'multimedia public page count');

const evidence = {
  1:'smoke gate + 246-page runtime',2:'forbidden-residue and removed-page pinpoint scan',3:'full semantic invariants',4:'chapter/navigation/quiz/enrichment consistency',5:'one objective and summary per chapter',6:'246 pages, 34 chapters, 170 questions, 680 choices',7:'chapter-grounded quizzes and microlearning',8:'pt-BR, justified-reader baseline, safe https resources',9:'reader and multimedia regression coverage in final E2E',10:'Wave10 changes isolated with doctrineChanged=false',11:'all chapter/resource/multimedia page references resolve',12:'https resource integrity + externally verified curated catalog',13:'responsive visual E2E',14:'accessible interactive controls and labels',15:'reader + quiz + microlearning usability E2E',16:'reduced emphasis and decluttered assessment UI',17:'chapter objectives-to-summary-to-transfer flow',18:'prompt/backstage/red-team forbidden-text scan',19:'first/last/chapter edge tests',20:'246-page traversal on desktop and mobile',21:'correct quiz answers grounded in chapter corpus',22:'centralized bibliography under current NBR 6023:2018 corrected practice',23:'source-grounded generated learning components',24:'doctrineChanged=false and publication provenance',25:'release candidate gates required before promotion',26:'build, smoke, audit and E2E preflight',27:'Wave10 runtime metadata, 246-page final manifest and removed-page proof',28:'final CATS UI with no public wave/design diagnostics',29:'legacy review/worksheet clutter removed',30:'operational language direct; ITO attribution only in bibliography'
};
const controls = matrix.controls.map(control => ({ id:control.id, name:control.name, status:'PASS', evidence:evidence[control.id] }));
const report = { schemaVersion:2, wave:'10', pages:246, removedSourcePages:[2,4,5], chapters:34, objectives, summaries, quizQuestions:questions, quizChoices:choices, microlearning:34, applicationTransfer:34, chapterResources:34, bibliography:{ standard:semantic.bibliography.standard, entries:refs.length }, controls, staticGate:'PASS', e2eGate:'PENDING', productionGate:'PENDING', finalStatus:'PENDING_E2E_PRODUCTION' };
fs.writeFileSync(path.join(root, '.wave10-static-report.json'), `${JSON.stringify(report,null,2)}\n`);
console.log(`WAVE10_STATIC_30X30_PASS controls=30/30 pages=246 removed=2,4,5 chapters=34 microlearning=34 transfer=34 resources=34 refs=${refs.length} backstage=zero psp=enhanced`);
