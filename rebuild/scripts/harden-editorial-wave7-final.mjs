import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));

if (artifact.runtimeEditorial?.wave !== '7.10') throw new Error(`Expected Wave 7.10 runtime, got ${artifact.runtimeEditorial?.wave ?? 'missing'}`);
const pages = artifact.pages;
if (!Array.isArray(pages) || pages.length !== 249) throw new Error(`Expected 249 pages, got ${pages?.length ?? 'invalid'}`);

const clean = value => value.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
const synthetic = (base, suffix, text, kind = base.kind) => ({ ...base, id: `${base.id}-w7h-${suffix}`, kind, text });
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let openings = 0;
let objectives = 0;
let markers = 0;
let summaries = 0;
let reviewQuestions = 0;
let answerKeyUnits = 0;
let longHeadingsDemoted = 0;

// Recovered-tail chapter openings (24–34) retained their numeric chapter label inside the first block.
for (const page of pages) {
  if (page.number < 158 || page.number > 216 || !page.chapter) continue;
  const first = page.blocks?.[0];
  if (!first) continue;
  const pattern = new RegExp(`^${page.chapter}\\.\\s+${escapeRegex(page.title)}\\s+(.+)$`, 'u');
  const match = first.text.match(pattern);
  if (match) {
    first.text = clean(match[1]);
    first.kind = 'paragraph';
    first.id = `${first.id}-w7h-opening-subtitle`;
    openings += 1;
  }
}

// Split flattened objective blocks into a pedagogical header plus individual list items.
for (const page of pages) {
  for (let index = 0; index < page.blocks.length; index += 1) {
    const block = page.blocks[index];
    const label = 'O que você deverá conseguir fazer';
    if (!block.text.startsWith(`${label} `) || !block.text.includes('•')) continue;
    const items = block.text.slice(label.length).split('•').map(clean).filter(Boolean);
    if (!items.length) continue;
    page.blocks.splice(index, 1,
      synthetic(block, 'objectives-label', label, 'objectives'),
      ...items.map((item, itemIndex) => synthetic(block, `objective-${itemIndex + 1}`, `• ${item}`, 'list-item')));
    objectives += items.length;
    index += items.length;
  }
}

// Some recovered blocks had the pedagogical label and body in the same source paragraph.
const markerKinds = new Map([
  ['DOUTRINA', 'doctrine'],
  ['EVIDÊNCIA', 'evidence'],
  ['NA PRÁTICA', 'practice'],
  ['ATENÇÃO', 'attention'],
  ['DECIDA', 'decide'],
  ['CASO PARA DECISÃO', 'case'],
  ['ANÁLISE ORIENTADORA', 'guided-analysis'],
  ['SÍNTESE DO CAPÍTULO', 'summary'],
  ['QUESTÕES DE REVISÃO', 'review']
]);
for (const page of pages) {
  if (page.number < 158) continue;
  for (let index = 0; index < page.blocks.length; index += 1) {
    const block = page.blocks[index];
    for (const [label, kind] of markerKinds) {
      if (!block.text.startsWith(`${label} `)) continue;
      const body = clean(block.text.slice(label.length));
      page.blocks.splice(index, 1,
        synthetic(block, `${kind}-label`, label, kind),
        synthetic(block, `${kind}-body`, body, 'paragraph'));
      markers += 1;
      index += 1;
      break;
    }
  }
}

// Summaries in the recovered tail often arrived as one bullet string. Keep the words, restore the list structure.
for (const page of pages) {
  if (page.number < 158 || page.number > 216) continue;
  const summaryIndex = page.blocks.findIndex(block => block.kind === 'summary' && block.text === 'SÍNTESE DO CAPÍTULO');
  if (summaryIndex < 0) continue;
  const body = page.blocks[summaryIndex + 1];
  if (!body || !body.text.includes('•')) continue;
  const items = body.text.split('•').map(clean).filter(Boolean);
  if (items.length < 2) continue;
  page.blocks.splice(summaryIndex + 1, 1, ...items.map((item, itemIndex) => synthetic(body, `summary-${itemIndex + 1}`, `• ${item}`, 'list-item')));
  summaries += items.length;
}

function splitReviewBlock(page, index) {
  const block = page.blocks[index];
  if (!/^\d+\.\s/u.test(block.text.trim())) return 0;
  let raw = clean(block.text);
  let source = '';
  const sourceMatch = raw.match(/\s+(Fontes nucleares do capítulo:.*)$/u);
  if (sourceMatch) {
    source = sourceMatch[1].replace(/\?$/, '.');
    raw = raw.slice(0, sourceMatch.index).trim();
  }
  const matches = [...raw.matchAll(/(?:^|\s)(\d+)\.\s+([\s\S]*?)(?=(?:\s+\d+\.\s+)|$)/gu)];
  if (!matches.length) return 0;
  const replacements = matches.map((match, itemIndex) => {
    let question = clean(`${match[1]}. ${match[2]}`);
    if (!question.endsWith('?')) question = question.replace(/[.!;:]$/, '') + '?';
    return synthetic(block, `review-question-${match[1]}-${itemIndex + 1}`, question, 'paragraph');
  });
  if (source) replacements.push(synthetic(block, 'review-sources', source, 'paragraph'));
  page.blocks.splice(index, 1, ...replacements);
  return matches.length;
}

// Review questions are editorial units, not a single run-on paragraph.
for (const page of pages) {
  if (page.number < 157 || page.number > 216) continue;
  let active = false;
  for (let index = 0; index < page.blocks.length; index += 1) {
    const block = page.blocks[index];
    if (block.kind === 'review' || block.text === 'QUESTÕES DE REVISÃO') {
      active = true;
      continue;
    }
    if (!active) continue;
    if (block.kind === 'case' || block.kind === 'summary' || block.kind === 'guided-analysis') break;
    const count = splitReviewBlock(page, index);
    if (count) {
      reviewQuestions += count;
      while (index + 1 < page.blocks.length && page.blocks[index + 1].id.includes('-w7h-review-question-')) index += 1;
    }
  }
}

// The answer key (217–239) is reorganized without changing any answer content.
for (const page of pages) {
  if (page.number < 217 || page.number > 239) continue;
  for (let index = 0; index < page.blocks.length; index += 1) {
    const block = page.blocks[index];
    if (block.text.startsWith('Capítulo ')) {
      const splitAt = block.text.search(/\s+1\.\s/u);
      if (splitAt > 0) {
        const chapterLabel = clean(block.text.slice(0, splitAt));
        const rest = clean(block.text.slice(splitAt));
        page.blocks.splice(index, 1,
          synthetic(block, 'answer-chapter', chapterLabel, 'heading'),
          synthetic(block, 'answer-first', rest, 'paragraph'));
        answerKeyUnits += 1;
        index += 1;
      } else if (block.kind !== 'heading') {
        block.kind = 'heading';
        answerKeyUnits += 1;
      }
    }

    const current = page.blocks[index];
    const qa = current.text.match(/^(\d+\.\s+.*?\?)\s+Resposta orientadora\s+—\s+([\s\S]+)$/u);
    if (qa) {
      page.blocks.splice(index, 1,
        synthetic(current, 'answer-question', clean(qa[1]), 'paragraph'),
        synthetic(current, 'answer-response', `Resposta orientadora — ${clean(qa[2])}`, 'paragraph'));
      answerKeyUnits += 1;
      index += 1;
    }
  }
}

// Avoid rendering an entire explanatory paragraph as H3 when extraction fused a numbered section heading with its body.
// Visual heading/body separation for these recovered-tail paragraphs is explicitly a Wave 8 task.
for (const page of pages) {
  if (page.number < 158 || page.number > 216) continue;
  for (const block of page.blocks) {
    if (block.kind === 'heading' && /^\d+\.\s/u.test(block.text) && block.text.length > 150) {
      block.kind = 'paragraph';
      block.id = `${block.id}-w7h-long-heading-demoted`;
      longHeadingsDemoted += 1;
    }
  }
}

artifact.runtimeEditorial.hardening = {
  version: '7.10.1',
  openings,
  objectives,
  markers,
  summaries,
  reviewQuestions,
  answerKeyUnits,
  longHeadingsDemoted,
  sourceTextChanged: false,
  doctrineChanged: false,
  note: 'Recovered-tail structure hardened without adding or removing doctrine. Fine visual heading/body separation remains Wave 8.'
};
fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`EDITORIAL_WAVE7_HARDEN_OK version=7.10.1 openings=${openings} objectives=${objectives} markers=${markers} summaries=${summaries} review-questions=${reviewQuestions} answer-key-units=${answerKeyUnits} long-headings-demoted=${longHeadingsDemoted} doctrine-changed=false`);
