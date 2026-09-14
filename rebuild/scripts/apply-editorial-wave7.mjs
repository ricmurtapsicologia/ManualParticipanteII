import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));

if (['7.2', '7.10'].includes(artifact.runtimeEditorial?.wave)) {
  console.log(`EDITORIAL_WAVE7_APPLY_OK wave=${artifact.runtimeEditorial.wave} already-applied=true`);
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

function joinContinuation(previousNumber, nextNumber) {
  const previous = page(previousNumber);
  const next = page(nextNumber);
  const tail = previous.blocks.at(-1);
  const lead = next.blocks[0];
  if (!tail || !lead) throw new Error(`Missing continuation blocks ${previousNumber}→${nextNumber}`);
  previous.blocks[previous.blocks.length - 1] = synthetic(tail, `join-${nextNumber}`, clean(`${tail.text} ${lead.text}`), tail.kind);
  next.blocks.shift();
}

function splitOpeningSubtitle(number) {
  const p = page(number);
  const first = p.blocks[0];
  if (first?.text.startsWith(`${p.title} `)) {
    first.text = first.text.slice(p.title.length).trim();
    first.id = `${first.id}-w7-subtitle`;
    first.kind = 'paragraph';
  }
}

function recomposeQuestions(number, minQuestion, maxQuestion) {
  const p = page(number);
  for (let index = 0; index < p.blocks.length; index += 1) {
    const block = p.blocks[index];
    const match = block.text.trim().match(/^(\d+)\.\s/);
    if (!match) continue;
    const questionNo = Number(match[1]);
    if (questionNo < minQuestion || questionNo > maxQuestion) continue;
    let merged = block.text.trim();
    let consumed = 0;
    if (!merged.endsWith('?')) {
      for (let cursor = index + 1; cursor < p.blocks.length; cursor += 1) {
        const candidate = p.blocks[cursor].text.trim();
        if (/^\d+\.\s/.test(candidate) || /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ /•–—-]{3,}$/.test(candidate)) break;
        merged = clean(`${merged} ${candidate}`);
        consumed += 1;
        if (merged.endsWith('?')) break;
      }
    }
    if (!merged.endsWith('?')) merged = merged.replace(/[.!;:]$/, '') + '?';
    if (consumed > 0 || merged !== block.text.trim()) {
      p.blocks.splice(index, consumed + 1, synthetic(block, `question-${questionNo}`, merged, block.kind));
    }
  }
}

// Batch 7.1 — pages 1–25.
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
for (const pair of [[8, 9], [11, 12], [13, 14], [16, 17], [17, 18], [18, 19], [19, 20], [25, 26]]) joinContinuation(...pair);
for (const number of [8, 16, 22]) splitOpeningSubtitle(number);
{
  const p = page(6);
  const index = p.blocks.findIndex(block => block.text.startsWith('Sete partes, uma progressão:'));
  if (index >= 0) {
    const base = p.blocks[index];
    p.blocks.splice(index, 1,
      synthetic(base, 'map-progress', 'Sete partes, uma progressão: compreender → organizar → abordar → integrar.', 'paragraph'),
      synthetic(base, 'map-1', '1. Fenômeno', 'list-item'),
      synthetic(base, 'map-2', '2. Ocorrência', 'list-item'),
      synthetic(base, 'map-3', '3. Abordagem técnica', 'list-item'),
      synthetic(base, 'map-4', '4. Abordagem tática', 'list-item'),
      synthetic(base, 'map-5', '5. Pessoas e contextos', 'list-item'),
      synthetic(base, 'map-6', '6. Depois da crise', 'list-item'),
      synthetic(base, 'map-7', '7. Integração', 'list-item'),
      synthetic(base, 'map-cases-heading', 'Casos longitudinais', 'heading'),
      synthetic(base, 'map-cases', 'Personagens fictícios reaparecem para mostrar como decisões mudam quando nova informação chega.', 'paragraph'));
  }
}
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
for (const [number, min, max] of [[14,1,3],[15,4,5],[20,6,10]]) recomposeQuestions(number, min, max);

// Batch 7.2 — pages 26–50.
for (const pair of [[26,27],[29,30],[30,31],[31,32],[32,33],[33,34],[36,37],[37,38],[38,39],[39,40],[45,46],[46,47]]) joinContinuation(...pair);
for (const number of [29, 36]) splitOpeningSubtitle(number);
for (const [number, min, max] of [[28,11,15],[34,16,20],[41,21,25],[44,26,30],[46,31,35],[48,36,40]]) recomposeQuestions(number, min, max);

// p.34→35 — keep page 35 useful by moving the complete feedback unit instead of leaving an orphan fragment.
{
  const p34 = page(34);
  const p35 = page(35);
  const index = p34.blocks.findIndex(block => block.text.includes('FEEDBACK / DÚVIDA'));
  const continuation = p35.blocks[0];
  if (index >= 0 && continuation) {
    const base = p34.blocks[index];
    const marker = 'FEEDBACK / DÚVIDA';
    const markerIndex = base.text.indexOf(marker);
    const before = clean(base.text.slice(0, markerIndex));
    const feedbackStart = clean(base.text.slice(markerIndex + marker.length));
    const feedback = clean(`${feedbackStart} ${continuation.text}`);
    const replacement = [];
    if (before) replacement.push(synthetic(base, 'p34-criterion', before, base.kind));
    p34.blocks.splice(index, 1, ...replacement);
    p35.blocks.splice(0, 1,
      synthetic(base, 'p35-feedback-heading', marker, 'heading'),
      synthetic(base, 'p35-feedback-body', feedback, 'paragraph'));
  }
}

// p.34 — references were split by extraction, not by meaning.
{
  const p = page(34);
  const index = p.blocks.findIndex(block => block.text.startsWith('Referências principais:') && !block.text.trim().endsWith('.'));
  if (index >= 0 && p.blocks[index + 1]) {
    const base = p.blocks[index];
    p.blocks.splice(index, 2, synthetic(base, 'references-complete', clean(`${base.text} ${p.blocks[index + 1].text}`), base.kind));
  }
}

// p.41 — recover the hierarchy that was flattened into the feedback paragraph.
{
  const p = page(41);
  const index = p.blocks.findIndex(block => block.text.includes('Pensar além do procedimento'));
  if (index >= 0) {
    const base = p.blocks[index];
    const marker1 = 'Pensar além do procedimento';
    const marker2 = 'Aprofundamento 1 — Pensar o suicídio como fenômeno complexo';
    const first = base.text.indexOf(marker1);
    const second = base.text.indexOf(marker2);
    if (first >= 0 && second > first) {
      const feedback = clean(base.text.slice(0, first));
      const bridge = clean(base.text.slice(first + marker1.length, second));
      const subtitle = clean(base.text.slice(second + marker2.length));
      const replacement = [];
      if (feedback) replacement.push(synthetic(base, 'p41-feedback', feedback, 'paragraph'));
      replacement.push(
        synthetic(base, 'p41-thinking-heading', marker1, 'heading'),
        synthetic(base, 'p41-thinking-body', bridge, 'paragraph'),
        synthetic(base, 'p41-deepening-heading', marker2, 'heading'),
        synthetic(base, 'p41-deepening-subtitle', subtitle, 'paragraph'));
      p.blocks.splice(index, 1, ...replacement);
    }
  }
}

// p.44 and p.46 — separate interlude headings from their subtitles.
for (const [number, heading] of [
  [44, 'Aprofundamento 2 — Alfabetização epidemiológica para o CATS'],
  [46, 'Aprofundamento 3 — Modelos cognitivos: utilidade e limites']
]) {
  const p = page(number);
  const index = p.blocks.findIndex(block => block.text.startsWith(`${heading} `));
  if (index >= 0) {
    const base = p.blocks[index];
    const subtitle = base.text.slice(heading.length).trim();
    p.blocks.splice(index, 1,
      synthetic(base, `p${number}-deepening-heading`, heading, 'heading'),
      synthetic(base, `p${number}-deepening-subtitle`, subtitle, 'paragraph'));
  }
}

artifact.runtimeEditorial = {
  wave: '7.2',
  batch: '1-50',
  doctrineChanged: false,
  strategy: 'runtime-semantic-reflow',
  note: 'Repairs extraction/page-boundary artifacts, hierarchy and assessment units while preserving institutional meaning.'
};
fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log('EDITORIAL_WAVE7_APPLY_OK wave=7.2 pages=249 doctrine-changed=false batches=1-50 repairs=hierarchy,continuations,map,questions,interludes');
