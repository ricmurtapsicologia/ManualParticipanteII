import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const quizPath = path.join(root, 'content', 'chapter-quizzes.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const pages = artifact.pages;

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const cleanFact = value => String(value ?? '').replace(/^•\s*/u, '').replace(/\s+/g, ' ').trim();
const prompts = [
  'Qual afirmação aparece como ideia-chave deste capítulo?',
  'Qual alternativa corresponde ao conteúdo apresentado neste capítulo?',
  'Qual opção sintetiza corretamente uma orientação deste capítulo?',
  'Qual afirmação está explicitamente alinhada aos objetivos ou ao resumo deste capítulo?',
  'Qual alternativa foi trabalhada como princípio neste capítulo?'
];

function sectionFacts(chapterPages, kind) {
  const facts = [];
  for (const page of chapterPages) {
    const start = page.blocks.findIndex(block => block.kind === kind);
    if (start < 0) continue;
    for (let i = start + 1; i < page.blocks.length; i += 1) {
      const block = page.blocks[i];
      if (['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review'].includes(block.kind) || block.kind === 'heading') break;
      const fact = cleanFact(block.text);
      if (fact && fact.length >= 18 && fact.length <= 260) facts.push(fact);
    }
  }
  return facts;
}

function fallbackFacts(chapterPages) {
  const facts = [];
  for (const page of chapterPages) {
    for (const block of page.blocks) {
      if (block.kind !== 'paragraph' && block.kind !== 'list-item') continue;
      const text = cleanFact(block.text);
      if (/^(Referências|Fontes nucleares|Resposta orientadora)/iu.test(text)) continue;
      for (const sentence of text.split(/(?<=[.!?])\s+/u)) {
        const fact = sentence.trim();
        if (fact.length >= 45 && fact.length <= 220 && !fact.includes('________________________________')) facts.push(fact);
      }
    }
  }
  return facts;
}

const chapterFacts = new Map();
const chapterPagesMap = new Map();
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const chapterPages = pages.filter(page => page.chapter === chapter).sort((a,b) => a.number - b.number);
  if (!chapterPages.length) throw new Error(`Missing chapter ${chapter}`);
  chapterPagesMap.set(chapter, chapterPages);
  const all = [...sectionFacts(chapterPages, 'summary'), ...sectionFacts(chapterPages, 'objectives'), ...fallbackFacts(chapterPages)];
  const unique = [];
  const seen = new Set();
  for (const fact of all) {
    const key = normalize(fact);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(fact);
    if (unique.length >= 12) break;
  }
  if (unique.length < 5) throw new Error(`Chapter ${chapter} has only ${unique.length} grounded facts`);
  chapterFacts.set(chapter, unique);
}

const chapters = [];
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const chapterPages = chapterPagesMap.get(chapter);
  const title = chapterPages[0].title;
  const currentText = normalize(chapterPages.flatMap(page => page.blocks.map(block => block.text)).join(' '));
  const correctFacts = chapterFacts.get(chapter).slice(0,5);
  const questions = [];
  for (let q = 0; q < 5; q += 1) {
    const correct = correctFacts[q];
    const distractors = [];
    for (let offset = 1; offset < 34 && distractors.length < 3; offset += 1) {
      const other = ((chapter - 1 + offset * 7 + q * 3) % 34) + 1;
      if (other === chapter) continue;
      for (const fact of chapterFacts.get(other)) {
        const key = normalize(fact);
        if (!key || currentText.includes(key) || distractors.some(item => normalize(item) === key)) continue;
        distractors.push(fact);
        break;
      }
    }
    if (distractors.length !== 3) throw new Error(`Chapter ${chapter} question ${q+1} could not build distractors`);
    const raw = [correct, ...distractors];
    const rotate = (chapter + q) % 4;
    const ordered = raw.map((_, index) => raw[(index + rotate) % 4]);
    questions.push({
      id: `c${chapter}q${q+1}`,
      prompt: prompts[q],
      choices: ordered.map((label, index) => ({ id: String.fromCharCode(65 + index), label, correct: label === correct })),
      feedback: `Resposta correta: ${correct}`
    });
  }
  chapters.push({ chapter, title, openingPage: chapterPages[0].number, endingPage: chapterPages.at(-1).number, questions });
}

const manifest = { schemaVersion: 1, wave: '8', source: 'semantic-pages.json', doctrineChanged: false, chapters };
fs.writeFileSync(quizPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`WAVE8_QUIZ_BUILD_OK chapters=${chapters.length} questions=${chapters.reduce((sum,item)=>sum+item.questions.length,0)} choices=${chapters.reduce((sum,item)=>sum+item.questions.reduce((s,q)=>s+q.choices.length,0),0)} grounded=true`);
