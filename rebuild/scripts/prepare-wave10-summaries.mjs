import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const pages = artifact.pages;
if (!Array.isArray(pages) || pages.length !== 249) throw new Error(`Wave10 summary prepare expected 249 pages, got ${pages?.length ?? 'invalid'}`);

const clean = value => String(value ?? '').replace(/^•\s*/u, '').replace(/\s+/g, ' ').trim();
const pedagogicalKinds = new Set(['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review']);

function chapterPages(chapter) {
  return pages.filter(page => page.chapter === chapter).sort((a,b) => a.number - b.number);
}
function factsAfter(page, markerIndex) {
  const facts = [];
  for (let i = markerIndex + 1; i < page.blocks.length; i += 1) {
    const block = page.blocks[i];
    if (pedagogicalKinds.has(block.kind) || block.kind === 'heading') break;
    if (block.kind === 'list-item') {
      const text = clean(block.text);
      if (text) facts.push({ block, text });
    }
  }
  return facts;
}
function fallbackFacts(cps, marker) {
  const tagged = cps.flatMap(page => page.blocks.map(block => ({ page, block })))
    .filter(item => item.block.kind === 'list-item' && /summary|resumo/iu.test(item.block.id ?? ''));
  if (tagged.length) return tagged.slice(0, 6).map(item => clean(item.block.text)).filter(Boolean);

  const markerPage = cps.find(page => page.number === marker.page.number);
  const markerIndex = markerPage.blocks.findIndex(block => block.id === marker.block.id);
  const before = [];
  for (let i = markerIndex - 1; i >= 0; i -= 1) {
    const block = markerPage.blocks[i];
    if (block.kind !== 'list-item') break;
    const text = clean(block.text);
    if (text) before.unshift(text);
  }
  if (before.length) return before.slice(-6);

  const objectiveIds = new Set();
  for (const page of cps) {
    const start = page.blocks.findIndex(block => block.kind === 'objectives');
    if (start < 0) continue;
    for (let i = start + 1; i < page.blocks.length; i += 1) {
      const block = page.blocks[i];
      if (pedagogicalKinds.has(block.kind) || block.kind === 'heading') break;
      if (block.kind === 'list-item') objectiveIds.add(block.id);
    }
  }
  const lists = cps.flatMap(page => page.blocks)
    .filter(block => block.kind === 'list-item' && !objectiveIds.has(block.id))
    .map(block => clean(block.text)).filter(text => text.length >= 18 && text.length <= 260);
  if (lists.length) return [...new Set(lists)].slice(-6);

  const paragraphs = cps.flatMap(page => page.blocks)
    .filter(block => block.kind === 'paragraph')
    .flatMap(block => clean(block.text).split(/(?<=[.!?])\s+/u))
    .map(clean)
    .filter(text => text.length >= 45 && text.length <= 220 && !/^(Referências|Fontes|Resposta)/iu.test(text));
  return [...new Set(paragraphs)].slice(0, 5);
}

let repaired = 0;
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const cps = chapterPages(chapter);
  if (!cps.length) throw new Error(`Wave10 missing chapter ${chapter}`);
  const markers = cps.flatMap(page => page.blocks.filter(block => block.kind === 'summary').map(block => ({ page, block })));
  if (markers.length !== 1) throw new Error(`Wave10 chapter ${chapter} summary markers=${markers.length}`);
  const marker = markers[0];
  const markerIndex = marker.page.blocks.findIndex(block => block.id === marker.block.id);
  const current = factsAfter(marker.page, markerIndex);
  if (current.length) continue;

  const facts = fallbackFacts(cps, marker);
  if (!facts.length) throw new Error(`Wave10 chapter ${chapter} has no recoverable summary facts`);
  const ending = cps.at(-1);
  for (const page of cps) {
    page.blocks = page.blocks.filter(block => block.kind !== 'summary' && !(block.kind === 'list-item' && /summary|resumo/iu.test(block.id ?? '')));
  }
  ending.blocks.push({ id:`w10-summary-c${chapter}`, kind:'summary', sourceIndex:ending.blocks.length, text:'RESUMO DO CAPÍTULO' });
  for (const [index, text] of facts.slice(0, 6).entries()) {
    ending.blocks.push({ id:`w10-summary-c${chapter}-b${index + 1}`, kind:'list-item', sourceIndex:ending.blocks.length, text:`• ${text}` });
  }
  repaired += 1;
}

fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`WAVE10_SUMMARY_PREPARE_OK chapters=34 repaired=${repaired} summaries=34`);
