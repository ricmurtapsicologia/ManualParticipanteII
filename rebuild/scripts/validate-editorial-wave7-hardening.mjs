import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const artifact = JSON.parse(fs.readFileSync(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const fail = message => { console.error(`EDITORIAL_WAVE7_HARDEN_VALIDATE_FAIL ${message}`); process.exit(1); };
const pages = artifact.pages ?? [];
const byNumber = new Map(pages.map(page => [page.number, page]));
const page = number => byNumber.get(number);

if (artifact.runtimeEditorial?.wave !== '7.10') fail(`wave=${artifact.runtimeEditorial?.wave ?? 'missing'}`);
if (artifact.runtimeEditorial?.hardening?.version !== '7.10.1') fail(`hardening=${artifact.runtimeEditorial?.hardening?.version ?? 'missing'}`);
if (artifact.runtimeEditorial?.hardening?.doctrineChanged !== false) fail('doctrine-changed');

const recoveredOpenings = [158,162,167,172,177,181,187,191,195,203,211];
for (const number of recoveredOpenings) {
  const current = page(number);
  if (!current) fail(`missing-opening=${number}`);
  const first = current.blocks[0]?.text?.trim() ?? '';
  if (new RegExp(`^${current.chapter}\\.\\s`).test(first)) fail(`numeric-opening-prefix=${number}`);
  if (first.startsWith(`${current.title} `)) fail(`title-opening-prefix=${number}`);
}

// Objectives in recovered-tail chapter openings must be semantic boxes with individual list items.
for (const number of [158,162,167,172,177,181,187,191,195]) {
  const current = page(number);
  const objectiveIndex = current.blocks.findIndex(block => block.kind === 'objectives' && block.text === 'O que você deverá conseguir fazer');
  if (objectiveIndex < 0) fail(`objectives-label=${number}`);
  const listCount = current.blocks.slice(objectiveIndex + 1).filter(block => block.kind === 'list-item').length;
  if (listCount < 3) fail(`objectives-items=${number}:${listCount}`);
}

// Each recovered chapter review must have exactly three standalone questions and a standalone source line.
const reviewPages = [157,161,165,171,176,180,185,190,194,201,210,216];
let reviewQuestionTotal = 0;
for (const number of reviewPages) {
  const current = page(number);
  const reviewIndex = current.blocks.findIndex(block => block.kind === 'review' && block.text === 'QUESTÕES DE REVISÃO');
  if (reviewIndex < 0) fail(`review-label=${number}`);
  const tail = current.blocks.slice(reviewIndex + 1);
  const questions = tail.filter(block => /^\d+\.\s/u.test(block.text.trim()));
  if (questions.length !== 3) fail(`review-question-count=${number}:${questions.length}`);
  for (const question of questions) {
    if (!question.text.trim().endsWith('?')) fail(`review-question-punctuation=${number}:${question.text.slice(0,72)}`);
    if (/\s\d+\.\s/u.test(question.text.replace(/^\d+\.\s/u, ''))) fail(`review-question-merged=${number}:${question.text.slice(0,72)}`);
    if (/Fontes nucleares do capítulo:/u.test(question.text)) fail(`review-source-merged=${number}`);
  }
  const source = tail.find(block => block.text.startsWith('Fontes nucleares do capítulo:'));
  if (!source) fail(`review-source=${number}`);
  if (source.text.endsWith('?')) fail(`review-source-punctuation=${number}`);
  reviewQuestionTotal += questions.length;
}

// Recovered summaries should be actual list items, not one run-on bullet string.
for (const number of reviewPages) {
  const current = page(number);
  const summaryIndex = current.blocks.findIndex(block => block.kind === 'summary' && block.text === 'SÍNTESE DO CAPÍTULO');
  if (summaryIndex < 0) fail(`summary-label=${number}`);
  const summaryItems = current.blocks.slice(summaryIndex + 1).filter(block => block.kind === 'list-item' && block.text.startsWith('• '));
  if (summaryItems.length < 3) fail(`summary-items=${number}:${summaryItems.length}`);
}

// No recovered-tail body paragraph may remain rendered as a giant H3 because extraction fused section title + explanation.
for (let number = 158; number <= 216; number += 1) {
  for (const block of page(number).blocks) {
    if (block.kind === 'heading' && /^\d+\.\s/u.test(block.text) && block.text.length > 150) fail(`giant-heading=${number}:${block.text.slice(0,64)}`);
  }
}

// Answer key: all 34 chapter labels must exist as headings and no chapter heading may still contain question 1.
const labels = [];
for (let number = 217; number <= 239; number += 1) {
  for (const block of page(number).blocks) {
    if (block.kind === 'heading' && /^Capítulo \d+ —/u.test(block.text)) {
      if (/\s1\.\s/u.test(block.text)) fail(`answer-heading-merged=${number}:${block.text.slice(0,72)}`);
      labels.push(block.text);
    }
    if (/^\d+\.\s.+\?\s+Resposta orientadora\s+—/u.test(block.text)) fail(`answer-qa-merged=${number}:${block.text.slice(0,72)}`);
  }
}
const chapterNumbers = new Set(labels.map(label => Number(label.match(/^Capítulo (\d+) —/u)?.[1])).filter(Number.isFinite));
for (let chapter = 1; chapter <= 34; chapter += 1) if (!chapterNumbers.has(chapter)) fail(`answer-chapter-missing=${chapter}`);

console.log(`EDITORIAL_WAVE7_HARDEN_VALIDATE_OK version=7.10.1 openings=${recoveredOpenings.length} review-pages=${reviewPages.length} review-questions=${reviewQuestionTotal} answer-chapters=${chapterNumbers.size} doctrine-changed=false`);
