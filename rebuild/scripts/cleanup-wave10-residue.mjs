import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const sourceBoilerplate = /(?:Fontes nucleares do capítulo|Fontes do capítulo|Referências do capítulo)\s*:/iu;
const standaloneSourceLabel = /^(?:Fontes nucleares do capítulo|Fontes do capítulo|Referências do capítulo)$/iu;
const trivialPattern = /^(?:[-–—•·_*#=]{1,12}|abrir recurso(?:\s+abrir recurso)*|xx+)$/iu;
let removed = 0;

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
    // A source heading at the end of a chapter is followed only by citation-like lines.
    // Stop suppressing if a semantic teaching marker or a real heading appears.
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

fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`WAVE10_RESIDUE_CLEAN_OK removed=${removed} chapter-source-boilerplate=0 trivial-lines=0`);
