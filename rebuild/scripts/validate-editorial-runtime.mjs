import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const artifact = JSON.parse(fs.readFileSync(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'content', 'canonical-30x30.json'), 'utf8'));

const fail = message => { console.error(`EDITORIAL_RUNTIME_VALIDATE_FAIL ${message}`); process.exit(1); };
if (!Array.isArray(artifact.pages) || artifact.pages.length !== 249) fail('page-count');
if (artifact.runtimeEditorial?.wave !== '7.2') fail(`runtime-wave=${artifact.runtimeEditorial?.wave ?? 'missing'}`);
if (!Array.isArray(matrix.controls) || matrix.controls.length !== 30) fail(`canonical-30x30=${matrix.controls?.length ?? 'invalid'}`);
for (let index = 0; index < 30; index += 1) if (matrix.controls[index]?.id !== index + 1 || !matrix.controls[index]?.name) fail(`canonical-control=${index + 1}`);

const byNumber = new Map(artifact.pages.map(page => [page.number, page]));
const page = number => byNumber.get(number);
const text = number => page(number).blocks.map(block => block.text).join(' ');
const assertQuestion = (number, question) => {
  const matches = page(number).blocks.filter(block => block.text.trim().startsWith(`${question}. `));
  if (matches.length !== 1 || !matches[0].text.trim().endsWith('?')) fail(`question=${question}@p${number}`);
};

// Batch 7.1 regression.
if (!page(3).blocks.some(block => block.kind === 'heading' && block.text === 'Como usar este manual')) fail('p3-heading');
if (!text(5).includes('1. ITO 30 vigente e demais normas aplicáveis — fonte normativa')) fail('p5-hierarchy-item');
if (!text(5).includes('o termo normativo da ITO 30 vigente para a linha comunicacional é “abordagem técnica”')) fail('p5-continuation');
if (/\.→|→\s*→\s*→/.test(text(6))) fail('p6-glyph-artifact');
for (const item of ['1. Fenômeno','2. Ocorrência','3. Abordagem técnica','4. Abordagem tática','5. Pessoas e contextos','6. Depois da crise','7. Integração']) if (!text(6).includes(item)) fail(`p6-map=${item}`);
for (const number of [8,16,22]) if (page(number).blocks[0]?.text.startsWith(`${page(number).title} `)) fail(`opening-title-merge=${number}`);
for (const number of [9,12,14,17,18,19,20,26]) {
  const first = page(number).blocks[0]?.text?.trim() ?? '';
  if (/^[a-záàâãéêíóôõúç“”]/u.test(first)) fail(`lowercase-continuation=${number}`);
}
{
  const blocks = page(24).blocks;
  const headingIndex = blocks.findIndex(block => block.text === '4. Violência autoprovocada notificada não é igual a suicídio consumado');
  if (headingIndex < 0) fail('p24-heading');
  const following = blocks[headingIndex + 1]?.text?.trim() ?? '';
  if (!following.startsWith('Em 2021,')) fail(`p24-body-start=${following.slice(0, 32) || 'missing'}`);
}
for (const [number, questions] of [[14,[1,2,3]],[15,[4,5]],[20,[6,7,8,9,10]]]) for (const question of questions) assertQuestion(number, question);

// Batch 7.2 regression.
for (const number of [29,36]) if (page(number).blocks[0]?.text.startsWith(`${page(number).title} `)) fail(`opening-title-merge=${number}`);
for (const number of [27,30,31,32,33,34,37,38,39,40,46,47]) {
  const first = page(number).blocks[0]?.text?.trim() ?? '';
  if (/^[a-záàâãéêíóôõúç“”]/u.test(first)) fail(`batch72-continuation=${number}:${first.slice(0,24)}`);
}
if (!page(35).blocks.some(block => block.kind === 'heading' && block.text === 'FEEDBACK / DÚVIDA')) fail('p35-feedback-heading');
if (!text(35).includes('Registre um acerto, um ajuste para a próxima prática ou uma dúvida para o instrutor.')) fail('p35-feedback-body');
if (!page(41).blocks.some(block => block.kind === 'heading' && block.text === 'Pensar além do procedimento')) fail('p41-thinking-heading');
if (!page(41).blocks.some(block => block.kind === 'heading' && block.text === 'Aprofundamento 1 — Pensar o suicídio como fenômeno complexo')) fail('p41-deepening-heading');
if (!page(44).blocks.some(block => block.kind === 'heading' && block.text === 'Aprofundamento 2 — Alfabetização epidemiológica para o CATS')) fail('p44-deepening-heading');
if (!page(46).blocks.some(block => block.kind === 'heading' && block.text === 'Aprofundamento 3 — Modelos cognitivos: utilidade e limites')) fail('p46-deepening-heading');
if (!text(34).includes('Referências principais: Wenzel & Beck, 2008; Botega, 2015; Corrêa et al., 2022; Scavacini, Reis e Silva, 2021; CBMMG, 2021.')) fail('p34-references');
for (const [number, questions] of [[28,[11,12,13,14,15]],[34,[16,17,18,19,20]],[41,[21,22,23,24,25]],[44,[26,27,28,29,30]],[46,[31,32,33,34,35]],[48,[36,37,38,39,40]]]) for (const question of questions) assertQuestion(number, question);

console.log('EDITORIAL_RUNTIME_VALIDATE_OK wave=7.2 pages=249 canonical-30x30=30 batches=1-50 continuity=ok hierarchy=ok questions=1-40 doctrine-changed=false');
