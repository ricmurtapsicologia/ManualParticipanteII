import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));

if (artifact.runtimeEditorial?.wave !== '7.10') throw new Error(`Expected Wave 7.10 runtime, got ${artifact.runtimeEditorial?.wave ?? 'missing'}`);

let normalized = 0;
for (const page of artifact.pages ?? []) {
  if (page.number < 51) continue;
  let assessment = false;
  for (const block of page.blocks ?? []) {
    const value = block.text.trim();
    if (value === 'TESTE-SE' || value === 'QUESTÕES DE REVISÃO') {
      assessment = true;
      continue;
    }
    if (assessment && (/^Referências principais:/i.test(value) || /^APLICAÇÃO E TRANSFERÊNCIA/i.test(value) || /^SÍNTESE DO CAPÍTULO$/i.test(value))) {
      assessment = false;
      continue;
    }
    if (!assessment || !/^\d+\.\s/.test(value) || value.endsWith('?')) continue;
    block.text = value.replace(/[.!;:]$/, '') + '?';
    normalized += 1;
  }
}
artifact.runtimeEditorial.questionPunctuationNormalized = normalized;
fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`EDITORIAL_WAVE7_QUESTION_PUNCTUATION_OK normalized=${normalized}`);
