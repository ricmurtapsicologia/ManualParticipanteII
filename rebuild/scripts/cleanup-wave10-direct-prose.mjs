import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
let changed = 0;

const rewrites = [
  [/\bA ITO 30 inclui\s+/giu, 'O atendimento inclui '],
  [/\bA ITO inclui\s+/giu, 'O atendimento inclui ']
];
const residualPattern = /\b(?:A|Conforme a)\s+ITO(?:\s+30(?:\/2026)?)?\s+(?:prev[eê]|orienta|define|recomenda|estabelece|determina|indica|preconiza|inclui|chama)/iu;
const residuals = [];

for (const page of artifact.pages ?? []) {
  for (const block of page.blocks ?? []) {
    let text = block.text;
    for (const [pattern, replacement] of rewrites) {
      const next = text.replace(pattern, replacement);
      if (next !== text) {
        changed += 1;
        text = next;
      }
    }
    block.text = text;
    if (residualPattern.test(text)) residuals.push({page:page.number,block:block.id,text});
  }
}

fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
for (const item of residuals) console.log(`WAVE10_ITO_RESIDUAL page=${item.page} block=${item.block} text=${JSON.stringify(item.text)}`);
console.log(`WAVE10_DIRECT_PROSE_OK rewrites=${changed} residuals=${residuals.length}`);
