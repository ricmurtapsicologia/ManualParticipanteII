import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const contentDir = path.join(root, 'content');
const read = name => JSON.parse(fs.readFileSync(path.join(contentDir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(contentDir, name), `${JSON.stringify(value, null, 2)}\n`);
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const norm = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

const semantic = read('semantic-pages.json');
const multimedia = read('multimedia-manifest.json');
const originalPages = semantic.pages;
const oldCount = originalPages.length;

const majorKinds = new Set(['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review','heading']);
const forbiddenSection = text => /^(CENARIO|CASO DE TRANSFERENCIA|APLICACAO E TRANSFERENCIA|REVISAO CUMULATIVA)\b/u.test(norm(text));
const englishUrl = url => /(?:who\.int\/|iris\.who\.int\/|ncbi\.nlm\.nih\.gov\/|pubmed\.ncbi\.nlm\.nih\.gov\/)/iu.test(String(url ?? ''));
const removedOldNumbers = [];
const kept = [];

for (const source of originalPages) {
  const titleNorm = norm(source.title);
  if (/REVISAO CUMULATIVA/u.test(titleNorm)) { removedOldNumbers.push(source.number); continue; }

  let skipping = false;
  const blocks = [];
  const tactical = source.chapter === 23 || /ABORDAGEM TATICA/u.test(titleNorm) || /ABORDAGEM TATICA/u.test(norm(source.partTitle));

  for (const block of source.blocks ?? []) {
    const text = clean(block.text);
    const blockNorm = norm(text);
    const startsForbidden = block.kind === 'case' || forbiddenSection(text);
    if (startsForbidden) { skipping = true; continue; }
    if (skipping) {
      if (majorKinds.has(block.kind)) skipping = false;
      else continue;
    }
    if (forbiddenSection(text)) continue;
    if (block.kind === 'review') continue;
    if (block.kind === 'external-link' && (englishUrl(block.url) || /INGL[EÊ]S|ENGLISH|WHO\b/u.test(blockNorm))) continue;
    if (/^(ABRIR VIDEO|VIDEO|ASSISTA|VER VIDEO)\b/u.test(blockNorm)) continue;

    const next = { ...block, text };
    if (tactical && next.kind === 'heading') next.kind = 'paragraph';
    blocks.push(next);
  }

  const nextPage = { ...source, blocks };
  if (/CENARIO/u.test(titleNorm)) nextPage.title = source.chapter ? `Capítulo ${source.chapter} — continuação` : 'Continuação';

  const meaningful = clean([nextPage.title, ...blocks.map(block => block.text)].join(' '));
  const protectedPage = Boolean(source.cover || source.chapter || source.part || source.pageRole === 'chapter-opening' || source.pageRole === 'part-opening');
  if (!meaningful && !protectedPage) { removedOldNumbers.push(source.number); continue; }
  if (!clean(nextPage.title) && blocks.length === 0) { removedOldNumbers.push(source.number); continue; }
  kept.push(nextPage);
}

const numberMap = new Map();
kept.forEach((page, index) => { numberMap.set(page.number, index + 1); page.number = index + 1; });
semantic.pages = kept;
semantic.manifest = { ...(semantic.manifest ?? {}), pageCount: kept.length };
semantic.runtimeEditorial = {
  ...(semantic.runtimeEditorial ?? {}),
  publicPageCount: kept.length,
  cumulativeReview: 'removed-by-editorial-request',
  applicationTransfer: 'removed-by-editorial-request',
  scenarios: 'removed-by-editorial-request',
  blankPages: 'removed',
  tacticalBodyWeight: 'regular',
  videoAccess: 'removed',
  englishMaterialAccess: 'removed',
  publicationHotfix: '2026-09-14'
};

multimedia.resources = (multimedia.resources ?? [])
  .filter(resource => resource.kind !== 'video')
  .filter(resource => numberMap.has(resource.pageNumber))
  .map(resource => ({ ...resource, pageNumber: numberMap.get(resource.pageNumber) }));
multimedia.policy = { ...(multimedia.policy ?? {}), allowedKinds: (multimedia.policy?.allowedKinds ?? []).filter(kind => kind !== 'video') };
multimedia.publicPageCount = kept.length;

const firstPageForChapter = chapter => kept.find(page => page.chapter === chapter)?.number ?? null;
const addInfographic = (chapter, id, title, alt, steps, transverse) => {
  const pageNumber = firstPageForChapter(chapter);
  if (!pageNumber || multimedia.resources.some(resource => resource.id === id)) return;
  multimedia.resources.push({ id, kind:'infographic', pageNumber, title, src:'native://cats-infographic', alt, steps:steps.map((step,index)=>({order:index+1,title:step[0],detail:step[1]})), transverse });
};
addInfographic(23, 'cats-tactical-decision-flow', 'Abordagem tática • decisão proporcional ao risco', 'Fluxograma para organizar observação, confirmação de risco, oportunidade, intervenção e reavaliação na abordagem tática.', [
  ['Observar','Identificar comportamento, método, posição e ambiente.'],
  ['Confirmar','Separar indício, hipótese e condição efetivamente observada.'],
  ['Decidir','Avaliar iminência, segurança, oportunidade e proporcionalidade.'],
  ['Intervir','Executar somente a alternativa tecnicamente segura.'],
  ['Reavaliar','Atualizar a decisão quando a cena mudar.']
], 'A intervenção tática depende de risco real, oportunidade e segurança — não de uma distância ou sinal isolado.');
addInfographic(32, 'cats-psp-flow', 'Primeiros Socorros Psicológicos • sequência prática', 'Fluxograma de Primeiros Socorros Psicológicos com preparar, olhar, escutar e conectar.', [
  ['Preparar','Compreender evento, riscos, recursos e limites do papel.'],
  ['Olhar','Reconhecer segurança, necessidades urgentes e sofrimento intenso.'],
  ['Escutar','Acolher sem pressionar por narrativa detalhada.'],
  ['Conectar','Combinar próximo passo e aproximar a pessoa da rede adequada.']
], 'Apoio inicial é humano, prático e não invasivo; não substitui avaliação clínica quando ela é necessária.');

write('semantic-pages.json', semantic);
write('multimedia-manifest.json', multimedia);
console.log(`PUBLICATION_CONTENT_HOTFIX_OK pages=${oldCount}->${kept.length} removed=${removedOldNumbers.length} review=removed scenario=removed tactical=regular video=0 infographics=${multimedia.resources.filter(r=>r.kind==='infographic').length}`);
