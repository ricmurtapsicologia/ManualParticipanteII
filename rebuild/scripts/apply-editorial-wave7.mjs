import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));

if (artifact.runtimeEditorial?.wave === '7.1') {
  console.log('EDITORIAL_WAVE7_APPLY_OK wave=7.1 already-applied=true');
  process.exit(0);
}

const pages = artifact.pages;
if (!Array.isArray(pages) || pages.length !== 249) throw new Error(`Expected 249 semantic pages, got ${pages?.length ?? 'invalid'}`);
const byNumber = new Map(pages.map(page => [page.number, page]));
const page = number => {
  const found = byNumber.get(number);
  if (!found) throw new Error(`Missing page ${number}`);
  return found;
};
const clean = value => value.replace(/\s+/g, ' ').trim();
const synthetic = (base, suffix, text, kind = base.kind) => ({ ...base, id: `${base.id}-w7-${suffix}`, kind, text });

// p.3 — separate the instructional heading from its body without changing doctrine.
{
  const p = page(3);
  const index = p.blocks.findIndex(block => block.text.startsWith('Como usar este manual '));
  if (index >= 0) {
    const base = p.blocks[index];
    const body = base.text.slice('Como usar este manual'.length).trim();
    p.blocks.splice(index, 1,
      synthetic(base, 'how-heading', 'Como usar este manual', 'heading'),
      synthetic(base, 'how-body', body, 'paragraph'));
  }
}

// p.4→5 — the only orphan page in the first batch: move the entire numbered item to p.5.
{
  const p4 = page(4);
  const p5 = page(5);
  const headingIndex = p4.blocks.findIndex(block => block.text.startsWith('1. ITO 30 vigente e demais normas aplicáveis'));
  const continuation = p5.blocks[0];
  if (headingIndex >= 0 && continuation && /^[a-záàâãéêíóôõúç]/u.test(continuation.text.trim())) {
    const heading = p4.blocks[headingIndex];
    const body = p4.blocks[headingIndex + 1];
    if (!body) throw new Error('Page 4 expected body after hierarchy heading');
    const merged = synthetic(body, 'p5-complete', clean(`${body.text} ${continuation.text}`), 'paragraph');
    p4.blocks.splice(headingIndex, 2);
    p5.blocks.splice(0, 1, heading, merged);
  }
}

// General first-batch continuation repair: finish the paragraph/box on the preceding page.
for (const [previousNumber, nextNumber] of [[8, 9], [11, 12], [13, 14], [16, 17], [17, 18], [18, 19], [19, 20], [25, 26]]) {
  const previous = page(previousNumber);
  const next = page(nextNumber);
  const tail = previous.blocks.at(-1);
  const lead = next.blocks[0];
  if (!tail || !lead) throw new Error(`Missing continuation blocks ${previousNumber}→${nextNumber}`);
  if (/^[a-záàâãéêíóôõúç“”]/u.test(lead.text.trim())) {
    previous.blocks[previous.blocks.length - 1] = synthetic(tail, `join-${nextNumber}`, clean(`${tail.text} ${lead.text}`), tail.kind);
    next.blocks.shift();
  }
}

// Chapter-opening title/subtitle separation: the page title is already rendered by the reader.
for (const number of [8, 16, 22]) {
  const p = page(number);
  const first = p.blocks[0];
  if (first?.text.startsWith(`${p.title} `)) {
    first.text = first.text.slice(p.title.length).trim();
    first.id = `${first.id}-w7-subtitle`;
    first.kind = 'paragraph';
  }
}

// p.6 — recover the map as a readable sequence instead of a compressed extraction artifact.
{
  const p = page(6);
  const index = p.blocks.findIndex(block => block.text.startsWith('Sete partes, uma progressão:'));
  if (index >= 0) {
    const base = p.blocks[index];
    const replacements = [
      synthetic(base, 'map-progress', 'Sete partes, uma progressão: compreender → organizar → abordar → integrar.', 'paragraph'),
      synthetic(base, 'map-1', '1. Fenômeno', 'list-item'),
      synthetic(base, 'map-2', '2. Ocorrência', 'list-item'),
      synthetic(base, 'map-3', '3. Abordagem técnica', 'list-item'),
      synthetic(base, 'map-4', '4. Abordagem tática', 'list-item'),
      synthetic(base, 'map-5', '5. Pessoas e contextos', 'list-item'),
      synthetic(base, 'map-6', '6. Depois da crise', 'list-item'),
      synthetic(base, 'map-7', '7. Integração', 'list-item'),
      synthetic(base, 'map-cases-heading', 'Casos longitudinais', 'heading'),
      synthetic(base, 'map-cases', 'Personagens fictícios reaparecem para mostrar como decisões mudam quando nova informação chega.', 'paragraph')
    ];
    p.blocks.splice(index, 1, ...replacements);
  }
}

// p.24 — restore the complete numbered heading and start its paragraph cleanly.
{
  const p = page(24);
  const headingIndex = p.blocks.findIndex(block => block.text === '4. Violência autoprovocada notificada não é igual a suicídio');
  if (headingIndex >= 0) {
    const heading = p.blocks[headingIndex];
    const body = p.blocks[headingIndex + 1];
    if (body?.text.startsWith('consumado ')) {
      heading.text = `${heading.text} consumado`;
      heading.id = `${heading.id}-w7-complete`;
      body.text = body.text.slice('consumado '.length);
      body.id = `${body.id}-w7-body`;
    }
  }
}

// Recompose assessment questions that were split only by source pagination/extraction.
for (const number of [14, 15, 20]) {
  const p = page(number);
  for (let index = 0; index < p.blocks.length; index += 1) {
    const block = p.blocks[index];
    const match = block.text.trim().match(/^(\d+)\.\s/);
    if (!match) continue;
    const questionNo = Number(match[1]);
    if (questionNo < 1 || questionNo > 10 || block.text.trim().endsWith('?')) continue;
    let merged = block.text.trim();
    let consumed = 0;
    for (let cursor = index + 1; cursor < p.blocks.length; cursor += 1) {
      const candidate = p.blocks[cursor].text.trim();
      if (/^\d+\.\s/.test(candidate) || /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ /•–—-]{3,}$/.test(candidate)) break;
      merged = clean(`${merged} ${candidate}`);
      consumed += 1;
      if (merged.endsWith('?')) break;
    }
    if (consumed > 0 && merged.endsWith('?')) {
      p.blocks.splice(index, consumed + 1, synthetic(block, `question-${questionNo}`, merged, block.kind));
    }
  }
}

artifact.runtimeEditorial = {
  wave: '7.1',
  batch: '1-25',
  doctrineChanged: false,
  strategy: 'runtime-semantic-reflow',
  note: 'Repairs extraction/page-boundary artifacts and hierarchy while preserving institutional meaning.'
};
fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log('EDITORIAL_WAVE7_APPLY_OK wave=7.1 pages=249 doctrine-changed=false repairs=hierarchy,continuations,map,questions');
