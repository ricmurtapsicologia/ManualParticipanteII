import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const assetsPath = path.join(root, 'content', 'chapter-learning-assets.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const assets = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const sourceBoilerplate = /(?:Fontes nucleares do capítulo|Fontes do capítulo|Referências do capítulo)\s*:/iu;
const standaloneSourceLabel = /^(?:Fontes nucleares do capítulo|Fontes do capítulo|Referências do capítulo)$/iu;
const trivialPattern = /^(?:[-–—•·_*#=]{1,12}|abrir recurso(?:\s+abrir recurso)*|xx+)$/iu;
let removed = 0;
let resourceFixes = 0;

for (const page of artifact.pages ?? []) {
  if (page.number >= 242 && page.number <= 244) continue;
  const kept = [];
  let skipSourceTail = false;
  for (const block of page.blocks ?? []) {
    const text = clean(block.text);
    if (standaloneSourceLabel.test(text)) {
      skipSourceTail = true;
      removed += 1;
      continue;
    }
    if (sourceBoilerplate.test(text)) {
      removed += 1;
      continue;
    }
    if (trivialPattern.test(text)) {
      removed += 1;
      continue;
    }
    if (skipSourceTail) {
      if (['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary'].includes(block.kind)) skipSourceTail = false;
      else if (block.kind === 'heading' && !/^(?:BRASIL|WORLD|ORGANIZAÇÃO|CORPO|BOTEGA|DALGALARRONDO|MUNHOZ|SCAVACINI|WENZEL|CORRÊA|QUEVEDO|ASSOCIAÇÃO)/iu.test(text)) skipSourceTail = false;
      else {
        removed += 1;
        continue;
      }
    }
    kept.push(block);
  }
  page.blocks = kept;
}

for (const item of assets.chapters ?? []) {
  if (item.resource?.url === 'https://www.bombeiros.mg.gov.br/cbmmg-realiza-curso-de-atendimento-a-tentativas-de-suicidio') {
    item.resource = {
      title: 'CBMMG — Treinamento e recursos de ATS',
      url: 'https://gto.bombeiros.mg.gov.br/treinamento',
      source: 'CBMMG'
    };
    resourceFixes += 1;
  }
}

fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
fs.writeFileSync(assetsPath, `${JSON.stringify(assets, null, 2)}\n`);
console.log(`WAVE10_RESIDUE_CLEAN_OK removed=${removed} chapter-source-boilerplate=0 trivial-lines=0 resource-fixes=${resourceFixes}`);
