import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));

if (artifact.runtimeEditorial?.wave === '7.10') {
  console.log('EDITORIAL_WAVE7_FINAL_APPLY_OK wave=7.10 already-applied=true');
  process.exit(0);
}
if (artifact.runtimeEditorial?.wave !== '7.2') {
  throw new Error(`Wave 7 final pass requires runtime wave 7.2, got ${artifact.runtimeEditorial?.wave ?? 'missing'}`);
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
const synthetic = (base, suffix, text, kind = base.kind) => ({ ...base, id: `${base.id}-w7f-${suffix}`, kind, text });

function normalizeTypography(text) {
  return text
    .replace(/(\p{L})-\s+(\p{Ll})/gu, '$1-$2')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function joinFragments(left, right) {
  const a = left.trimEnd();
  const b = right.trimStart();
  if (a.endsWith('-')) return `${a}${b}`;
  return clean(`${a} ${b}`);
}

function splitOpeningSubtitle(number) {
  const p = page(number);
  const first = p.blocks[0];
  if (!first || !p.title || first.text === p.title) return;
  if (first.text.startsWith(`${p.title} `)) {
    first.text = normalizeTypography(first.text.slice(p.title.length));
    first.id = `${first.id}-w7f-subtitle`;
    if (first.kind === 'heading') first.kind = 'paragraph';
  }
}

function joinCrossPageContinuation(previousNumber, nextNumber) {
  const previous = page(previousNumber);
  const next = page(nextNumber);
  if (previous.part !== next.part || previous.chapter !== next.chapter) return false;
  const lead = next.blocks[0];
  const tail = previous.blocks.at(-1);
  if (!lead || !tail) return false;
  if (!/^[a-záàâãéêíóôõúç]/u.test(lead.text.trim())) return false;
  previous.blocks[previous.blocks.length - 1] = synthetic(tail, `join-${nextNumber}`, normalizeTypography(joinFragments(tail.text, lead.text)), tail.kind);
  next.blocks.shift();
  return true;
}

function splitInlinePedagogicalMarker(p) {
  const markers = [
    'SITUAÇÃO DE ABERTURA',
    'O que você deverá conseguir fazer',
    'DOUTRINA',
    'EVIDÊNCIA',
    'NA PRÁTICA',
    'ATENÇÃO',
    'DECIDA',
    'LABORATÓRIO DE DECISÃO',
    'DEBRIEFING',
    'O QUE EU LEVO DESTE CAPÍTULO',
    'TESTE-SE',
    'LEITURA DA CENA',
    'ERRO A EVITAR',
    'COMPETÊNCIA',
    'CRITÉRIO DE SUCESSO',
    'FEEDBACK / DÚVIDA'
  ];
  for (let index = 0; index < p.blocks.length; index += 1) {
    const block = p.blocks[index];
    for (const marker of markers) {
      if (!block.text.startsWith(`${marker} `)) continue;
      const body = normalizeTypography(block.text.slice(marker.length));
      p.blocks.splice(index, 1,
        synthetic(block, `marker-${index}`, marker, 'heading'),
        synthetic(block, `marker-body-${index}`, body, 'paragraph'));
      index += 1;
      break;
    }
  }
}

function recomposeAssessmentQuestions(p) {
  const markers = new Set(['TESTE-SE', 'QUESTÕES DE REVISÃO']);
  let active = false;
  for (let index = 0; index < p.blocks.length; index += 1) {
    const block = p.blocks[index];
    const text = block.text.trim();
    if (markers.has(text)) {
      active = true;
      continue;
    }
    if (active && (/^Referências principais:/i.test(text) || /^APLICAÇÃO E TRANSFERÊNCIA/i.test(text) || /^SÍNTESE DO CAPÍTULO$/i.test(text))) {
      active = false;
      continue;
    }
    if (!active) continue;
    const match = text.match(/^(\d+)\.\s/);
    if (!match) continue;
    let merged = text;
    let consumed = 0;
    if (!merged.endsWith('?')) {
      for (let cursor = index + 1; cursor < p.blocks.length; cursor += 1) {
        const candidate = p.blocks[cursor].text.trim();
        if (/^\d+\.\s/.test(candidate) || /^Referências principais:/i.test(candidate) || /^APLICAÇÃO E TRANSFERÊNCIA/i.test(candidate)) break;
        merged = joinFragments(merged, candidate);
        consumed += 1;
        if (merged.trim().endsWith('?')) break;
      }
    }
    merged = normalizeTypography(merged);
    if (consumed > 0) {
      p.blocks.splice(index, consumed + 1, synthetic(block, `question-${match[1]}`, merged, block.kind));
    }
  }
}

function repairKnownInPageExtractionArtifacts() {
  // p.55: a heading was broken before “na linha”, while the body began in the same extracted block.
  {
    const p = page(55);
    const index = p.blocks.findIndex(block => block.text.startsWith('1. O primeiro contato pode ocorrer sem que a pessoa em crise esteja'));
    if (index >= 0 && p.blocks[index + 1]?.text.startsWith('na linha A ITO 30')) {
      p.blocks[index].text = normalizeTypography(`${p.blocks[index].text} na linha`);
      p.blocks[index + 1].text = normalizeTypography(p.blocks[index + 1].text.slice('na linha '.length));
    }
  }

  // p.68: the heading “com cuidado” was split from its explanatory paragraph.
  {
    const p = page(68);
    const index = p.blocks.findIndex(block => block.text.startsWith('4. Werther não é palavra para censurar; é razão para comunicar com'));
    if (index >= 0 && p.blocks[index + 1]?.text.startsWith('cuidado O chamado efeito Werther')) {
      p.blocks[index].text = normalizeTypography(`${p.blocks[index].text} cuidado`);
      p.blocks[index + 1].text = normalizeTypography(p.blocks[index + 1].text.slice('cuidado '.length));
    }
  }

  // p.74: the heading and first sentence of the body were flattened across two blocks.
  {
    const p = page(74);
    const index = p.blocks.findIndex(block => block.text.startsWith('5. Coleta de informações: ampliar conhecimento sem transformar a'));
    const prefix = 'pessoa em prontuário ambulante ';
    if (index >= 0 && p.blocks[index + 1]?.text.startsWith(prefix)) {
      p.blocks[index].text = normalizeTypography(`${p.blocks[index].text} pessoa em prontuário ambulante`);
      p.blocks[index + 1].text = normalizeTypography(p.blocks[index + 1].text.slice(prefix.length));
    }
  }

  // p.72: restore the didactic function map without adding content.
  {
    const p = page(72);
    const index = p.blocks.findIndex(block => block.text.startsWith('prioridades • segurança recursos • decisão Abordador'));
    if (index >= 0) {
      const base = p.blocks[index];
      p.blocks.splice(index, 1,
        synthetic(base, 'functions-command', 'Comando — prioridades • segurança • recursos • decisão', 'list-item'),
        synthetic(base, 'functions-approacher', 'Abordador — díade e comunicação', 'list-item'),
        synthetic(base, 'functions-assistant', 'Auxiliar — escuta, apoio e filtro', 'list-item'),
        synthetic(base, 'functions-safety', 'Segurança — EPI, riscos, rota de fuga', 'list-item'),
        synthetic(base, 'functions-tactical', 'Tática — prontidão e oportunidade', 'list-item'),
        synthetic(base, 'functions-info', 'Coleta de informação — dados úteis e verificação', 'list-item'),
        synthetic(base, 'functions-integration', 'Integração/APH — rede e continuidade', 'list-item'));
    }
  }
}

// Full-corpus non-doctrinal typography cleanup for the still-unreviewed Wave 7 range.
for (const p of pages) {
  if (p.number < 51) continue;
  for (const block of p.blocks) block.text = normalizeTypography(block.text);
}

// Recover chapter-opening hierarchy wherever extraction flattened title + subtitle.
for (let number = 51; number <= 249; number += 1) splitOpeningSubtitle(number);

repairKnownInPageExtractionArtifacts();

// Recompose page-boundary sentence fragments when both pages belong to the same chapter.
let joinedContinuations = 0;
for (let nextNumber = 52; nextNumber <= 249; nextNumber += 1) {
  if (joinCrossPageContinuation(nextNumber - 1, nextNumber)) joinedContinuations += 1;
}

// Recover semantic markers that were flattened with their explanatory text.
for (const p of pages) if (p.number >= 51) splitInlinePedagogicalMarker(p);

// Recompose all assessment questions in the remaining corpus, including later review sections.
for (const p of pages) if (p.number >= 51) recomposeAssessmentQuestions(p);

// Final typography pass after joins/splits.
for (const p of pages) {
  if (p.number < 51) continue;
  for (const block of p.blocks) block.text = normalizeTypography(block.text);
}

artifact.runtimeEditorial = {
  wave: '7.10',
  batch: '1-249',
  doctrineChanged: false,
  strategy: 'runtime-semantic-reflow-plus-full-corpus-structural-audit',
  joinedContinuations,
  visualDebtMovedToWave8: true,
  note: 'Wave 7 closed across all 249 pages: page-boundary continuity, heading hierarchy, assessment units, pedagogical marker separation and typography were normalized without changing institutional doctrine.'
};

fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`EDITORIAL_WAVE7_FINAL_APPLY_OK wave=7.10 pages=249 coverage=1-249 joined-continuations=${joinedContinuations} doctrine-changed=false visual-debt=wave8`);
