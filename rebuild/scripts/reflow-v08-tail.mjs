import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const ROOT = new URL('../', import.meta.url);
const pagesUrl = new URL('content/pages.json', ROOT);
const provenanceUrl = new URL('content/provenance.json', ROOT);
const recoveryBase = new URL('recovery/', ROOT);

const SOURCE_SHA256 = '892511fd392b8a3cbca876803244e3297c683f214f79f44823a3e29ff56e6be8';
const PDF_SHA256 = '7a8d9a0a0614e18af812ffe1c172b48a87e609b66ec8631eec15cb1ea15becbb';
const ANCHOR = '5. Eletricidade: proximidade pode ferir sem contato direto';
const ALLOCATIONS = [2, 4, 4, 1, 5, 5, 4, 5, 1, 4, 4, 7, 1, 8, 6, 23, 2, 3, 3, 2];

const sections = [
  { heading: ANCHOR, pages: 2, part: 4, partTitle: 'Abordagem tática e riscos', chapter: 23, title: 'Água, enforcamento, incêndio, eletricidade e intoxicação' },
  { heading: '24. Arma branca, arma de fogo e risco de violência', pages: 4, part: 4, partTitle: 'Abordagem tática e riscos', chapter: 24, title: 'Arma branca, arma de fogo e risco de violência' },
  { heading: '25. Entrada, contenção, lesões, APH e presunção de óbito', pages: 4, part: 4, partTitle: 'Abordagem tática e riscos', chapter: 25, title: 'Entrada, contenção, lesões, APH e presunção de óbito' },
  { heading: 'PARTE 5 — PESSOAS E CONTEXTOS', pages: 1, part: 5, partTitle: 'Pessoas e contextos', chapter: 0, title: 'PARTE 5 — PESSOAS E CONTEXTOS' },
  { heading: '26. Crianças e adolescentes', pages: 5, part: 5, partTitle: 'Pessoas e contextos', chapter: 26, title: 'Crianças e adolescentes' },
  { heading: '27. Pessoas idosas, pessoas com deficiência e neurodivergentes', pages: 5, part: 5, partTitle: 'Pessoas e contextos', chapter: 27, title: 'Pessoas idosas, pessoas com deficiência e neurodivergentes' },
  { heading: '28. Intoxicação, agitação e alterações do pensamento', pages: 4, part: 5, partTitle: 'Pessoas e contextos', chapter: 28, title: 'Intoxicação, agitação e alterações do pensamento' },
  { heading: '29. Mulheres, violência doméstica, cultura, espiritualidade e contexto social', pages: 5, part: 5, partTitle: 'Pessoas e contextos', chapter: 29, title: 'Mulheres, violência doméstica, cultura, espiritualidade e contexto social' },
  { heading: 'PARTE 6 — DEPOIS DA CRISE', pages: 1, part: 6, partTitle: 'Depois da crise', chapter: 0, title: 'PARTE 6 — DEPOIS DA CRISE' },
  { heading: '30. Desistência, resgate, encaminhamento e registro', pages: 4, part: 6, partTitle: 'Depois da crise', chapter: 30, title: 'Desistência, resgate, encaminhamento e registro' },
  { heading: '31. Comunicação responsável, imprensa, Werther e Papageno', pages: 4, part: 6, partTitle: 'Depois da crise', chapter: 31, title: 'Comunicação responsável, imprensa, Werther e Papageno' },
  { heading: '32. Primeiros Socorros Psicológicos, pós-ocorrência e posvenção', pages: 7, part: 6, partTitle: 'Depois da crise', chapter: 32, title: 'Primeiros Socorros Psicológicos, pós-ocorrência e posvenção' },
  { heading: 'PARTE 7 — INTEGRAÇÃO E CONSOLIDAÇÃO', pages: 1, part: 7, partTitle: 'Integração e consolidação', chapter: 0, title: 'PARTE 7 — INTEGRAÇÃO E CONSOLIDAÇÃO' },
  { heading: '33. Casos longitudinais integradores', pages: 8, part: 7, partTitle: 'Integração e consolidação', chapter: 33, title: 'Casos longitudinais integradores' },
  { heading: '34. Síntese do Sistema ATTS e matriz final de competências', pages: 6, part: 7, partTitle: 'Integração e consolidação', chapter: 34, title: 'Síntese do Sistema ATTS e matriz final de competências' },
  { heading: 'Respostas orientadoras às questões de revisão', pages: 23, part: 7, partTitle: 'Integração e consolidação', chapter: 0, title: 'Respostas orientadoras às questões de revisão' },
  { heading: 'Recursos digitais do participante', pages: 2, part: 7, partTitle: 'Integração e consolidação', chapter: 0, title: 'Recursos digitais do participante' },
  { heading: 'Referências nucleares', pages: 3, part: 7, partTitle: 'Integração e consolidação', chapter: 0, title: 'Referências nucleares' },
  { heading: 'Glossário essencial', pages: 3, part: 7, partTitle: 'Integração e consolidação', chapter: 0, title: 'Glossário essencial' },
  { heading: 'Checklist final do participante', pages: 2, part: 7, partTitle: 'Integração e consolidação', chapter: 0, title: 'Checklist final do participante' }
];

const fail = message => { throw new Error(message); };
const sha256 = value => createHash('sha256').update(value).digest('hex');

function splitBalanced(blocks, groups) {
  if (groups < 1 || groups > blocks.length) fail(`Cannot split ${blocks.length} paragraphs into ${groups} pages`);
  const weights = blocks.map(text => Math.max(1, text.length));
  const result = [];
  let position = 0;

  for (let group = 0; group < groups; group += 1) {
    const remainingGroups = groups - group;
    if (remainingGroups === 1) {
      result.push(blocks.slice(position));
      position = blocks.length;
      break;
    }

    const remainingWeight = weights.slice(position).reduce((sum, value) => sum + value, 0);
    const target = remainingWeight / remainingGroups;
    const maxEnd = blocks.length - (remainingGroups - 1);
    let end = position + 1;
    let total = weights[position];
    let bestEnd = end;
    let bestDiff = Math.abs(total - target);

    while (end < maxEnd) {
      const candidate = total + weights[end];
      const diff = Math.abs(candidate - target);
      if (diff > bestDiff && total >= target) break;
      total = candidate;
      end += 1;
      if (diff <= bestDiff) {
        bestDiff = diff;
        bestEnd = end;
      }
    }

    result.push(blocks.slice(position, bestEnd));
    position = bestEnd;
  }

  if (result.length !== groups || position !== blocks.length || result.some(group => group.length === 0)) {
    fail(`Balanced partition invariant failed: groups=${result.length}/${groups} consumed=${position}/${blocks.length}`);
  }
  return result;
}

const prefix = JSON.parse(await readFile(pagesUrl, 'utf8'));
if (!Array.isArray(prefix) || prefix.length !== 155) fail(`Expected 155-page validated prefix, got ${prefix?.length ?? 'invalid'}`);
prefix.forEach((page, index) => {
  if (page.number !== index + 1) fail(`Prefix sequence broken at ${index + 1}`);
});
const prefixSnapshot = JSON.stringify(prefix);

let base64 = '';
for (let part = 1; part <= 7; part += 1) {
  base64 += (await readFile(new URL(`v08-tail-source.b64.part${part}`, recoveryBase), 'utf8')).trim();
}
const compressed = Buffer.from(base64, 'base64');
const source = gunzipSync(compressed).toString('utf8');
const sourceHash = sha256(Buffer.from(source, 'utf8'));
if (sourceHash !== SOURCE_SHA256) fail(`Canonical tail hash mismatch: ${sourceHash}`);
if (!source.startsWith(ANCHOR)) fail('Canonical tail does not start at the validated chapter-23 anchor');

const paragraphs = source.split(/\n\n+/).map(value => value.trim()).filter(Boolean);
const starts = sections.map(section => {
  const matches = paragraphs.map((paragraph, index) => paragraph.startsWith(section.heading) ? index : -1).filter(index => index >= 0);
  if (matches.length !== 1) fail(`Expected exactly one section heading "${section.heading}", got ${matches.length}`);
  return matches[0];
});
if (!starts.every((value, index) => index === 0 || value > starts[index - 1])) fail('Canonical section order is invalid');
if (ALLOCATIONS.reduce((sum, value) => sum + value, 0) !== 94) fail('Tail allocation must total 94 pages');
if (!sections.every((section, index) => section.pages === ALLOCATIONS[index])) fail('Section allocation contract mismatch');

const tail = [];
sections.forEach((section, sectionIndex) => {
  const start = starts[sectionIndex];
  const end = sectionIndex + 1 < starts.length ? starts[sectionIndex + 1] : paragraphs.length;
  const blocks = paragraphs.slice(start, end);
  const groups = splitBalanced(blocks, section.pages);
  groups.forEach(group => {
    tail.push({
      number: 156 + tail.length,
      part: section.part,
      partTitle: section.partTitle,
      chapter: section.chapter,
      title: section.title,
      paragraphs: group
    });
  });
});

if (tail.length !== 94) fail(`Expected 94 recovered pages, got ${tail.length}`);
if (tail[0].number !== 156 || tail.at(-1)?.number !== 249) fail('Recovered page range must be 156-249');
if (!tail[0].paragraphs.join(' ').includes('Eletricidade')) fail('Page 156 lost the canonical electricity anchor');
if (!tail.at(-1)?.paragraphs.join(' ').includes('Tenho um plano para revisar e praticar estas competências após o curso.')) fail('Page 249 does not contain the canonical checklist ending');
if (JSON.stringify(prefix) !== prefixSnapshot) fail('Validated 1-155 prefix was modified during reflow');

const finalPages = [...prefix, ...tail];
if (finalPages.length !== 249) fail(`Expected 249 final pages, got ${finalPages.length}`);
finalPages.forEach((page, index) => {
  if (page.number !== index + 1) fail(`Final sequence broken at ${index + 1}`);
});

const legacy = JSON.parse(await readFile(provenanceUrl, 'utf8'));
const provenance = {
  ...legacy,
  schema: 4,
  recoverableSequentialPages: 155,
  firstInvalidOffset: 242914,
  extractedPages: 249,
  targetBookPages: 249,
  recoveredTail: {
    sourceTitle: 'Manual do Participante CATS - v0.8 - CANÔNICA - SANITIZADA.pdf',
    driveFileId: '1PePK8Tic7PGo65fiqf02k8vUzG_Halh0',
    pdfSha256: PDF_SHA256,
    pdfPages: 159,
    sourcePhysicalStartPage: 90,
    anchor: ANCHOR,
    sourceTextSha256: SOURCE_SHA256,
    generatedDigitalPages: 94,
    digitalRange: [156, 249],
    algorithm: 'deterministic balanced paragraph reflow v1',
    allocations: ALLOCATIONS,
    sourceDerived: true
  }
};

await writeFile(pagesUrl, `${JSON.stringify(finalPages, null, 2)}\n`);
await writeFile(provenanceUrl, `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`REFLOW_OK pages=249 tail=94 source=${SOURCE_SHA256.slice(0, 12)} range=156-249`);
