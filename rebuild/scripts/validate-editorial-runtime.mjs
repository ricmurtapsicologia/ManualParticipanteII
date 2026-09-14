import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const artifact = JSON.parse(fs.readFileSync(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'content', 'canonical-30x30.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(root, 'content', 'editorial-wave7-review.json'), 'utf8'));

const fail = message => { console.error(`EDITORIAL_RUNTIME_VALIDATE_FAIL ${message}`); process.exit(1); };
if (!Array.isArray(artifact.pages) || artifact.pages.length !== 249) fail('page-count');
if (artifact.runtimeEditorial?.wave !== '7.10') fail(`runtime-wave=${artifact.runtimeEditorial?.wave ?? 'missing'}`);
if (artifact.runtimeEditorial?.batch !== '1-249') fail(`runtime-batch=${artifact.runtimeEditorial?.batch ?? 'missing'}`);
if (artifact.runtimeEditorial?.doctrineChanged !== false) fail('doctrine-changed');
if (!Array.isArray(matrix.controls) || matrix.controls.length !== 30) fail(`canonical-30x30=${matrix.controls?.length ?? 'invalid'}`);
for (let index = 0; index < 30; index += 1) if (matrix.controls[index]?.id !== index + 1 || !matrix.controls[index]?.name) fail(`canonical-control=${index + 1}`);
if (!Array.isArray(review.batches) || review.batches.length !== 10 || review.batches.some(batch => batch.status !== 'approved')) fail('review-batches-not-approved');
if (!Array.isArray(review.reviewedPages) || review.reviewedPages.length !== 249) fail(`reviewed-pages=${review.reviewedPages?.length ?? 'invalid'}`);
for (let number = 1; number <= 249; number += 1) {
  const item = review.reviewedPages.find(entry => entry.pageNumber === number);
  if (!item || item.status !== 'approved') fail(`review-page=${number}`);
}

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

// Full Wave 7 structural invariants — pages 51–249.
let assessmentQuestions = 0;
for (let number = 51; number <= 249; number += 1) {
  const current = page(number);
  if (!current) fail(`missing-page=${number}`);
  const first = current.blocks[0]?.text?.trim() ?? '';
  const previous = number > 51 ? page(number - 1) : null;
  if (previous && previous.part === current.part && previous.chapter === current.chapter && /^[a-záàâãéêíóôõúç]/u.test(first)) {
    fail(`full-continuation=${number}:${first.slice(0,36)}`);
  }
  if (first.startsWith(`${current.title} `)) fail(`full-opening-title-merge=${number}`);
  for (const block of current.blocks) {
    if (/�|\.→|→\s*→\s*→/.test(block.text)) fail(`glyph-artifact=${number}`);
    if (/(\p{L})-\s+(\p{Ll})/u.test(block.text)) fail(`hyphen-spacing=${number}:${block.text.slice(0,48)}`);
    if (/\s+[,.!?;]/.test(block.text)) fail(`punctuation-spacing=${number}:${block.text.slice(0,48)}`);
  }

  let assessment = false;
  for (const block of current.blocks) {
    const value = block.text.trim();
    if (value === 'TESTE-SE' || value === 'QUESTÕES DE REVISÃO') {
      assessment = true;
      continue;
    }
    if (assessment && (/^Referências principais:/i.test(value) || /^APLICAÇÃO E TRANSFERÊNCIA/i.test(value) || /^SÍNTESE DO CAPÍTULO$/i.test(value))) {
      assessment = false;
      continue;
    }
    if (!assessment) continue;
    if (/^\d+\.\s/.test(value)) {
      assessmentQuestions += 1;
      if (!value.endsWith('?')) fail(`assessment-fragment=${number}:${value.slice(0,64)}`);
    }
  }
}

// Known extraction defects from batch 7.3 are explicitly guarded.
if (!text(55).includes('1. O primeiro contato pode ocorrer sem que a pessoa em crise esteja na linha')) fail('p55-heading-repair');
if (!text(55).includes('A ITO 30 atribui ao sistema de despacho')) fail('p55-body-repair');
if (!text(68).includes('4. Werther não é palavra para censurar; é razão para comunicar com cuidado')) fail('p68-heading-repair');
if (!text(68).includes('O chamado efeito Werther descreve')) fail('p68-body-repair');
if (!text(74).includes('5. Coleta de informações: ampliar conhecimento sem transformar a pessoa em prontuário ambulante')) fail('p74-heading-repair');
for (const item of ['Comando — prioridades • segurança • recursos • decisão','Abordador — díade e comunicação','Auxiliar — escuta, apoio e filtro','Segurança — EPI, riscos, rota de fuga','Tática — prontidão e oportunidade','Coleta de informação — dados úteis e verificação','Integração/APH — rede e continuidade']) if (!text(72).includes(item)) fail(`p72-function-map=${item}`);
if (assessmentQuestions < 60) fail(`assessment-question-count=${assessmentQuestions}`);

console.log(`EDITORIAL_RUNTIME_VALIDATE_OK wave=7.10 pages=249 canonical-30x30=30 coverage=1-249 reviewed=249 continuity=ok hierarchy=ok typography=ok assessment-questions=${assessmentQuestions} doctrine-changed=false visual-debt=wave8`);
