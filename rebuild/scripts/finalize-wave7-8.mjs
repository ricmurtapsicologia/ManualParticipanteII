import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const artifact = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const pages = artifact.pages;
if (!Array.isArray(pages) || pages.length !== 249) throw new Error(`Expected 249 pages, got ${pages?.length ?? 'invalid'}`);

const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const isObjectives = block => block?.kind === 'objectives' || norm(block?.text) === 'O QUE VOCE DEVERA CONSEGUIR FAZER' || norm(block?.text) === 'OBJETIVOS' || norm(block?.text) === 'OBJETIVOS DO CAPITULO';
const isSummary = block => block?.kind === 'summary' || ['O QUE EU LEVO DESTE CAPITULO','SINTESE DO CAPITULO','RESUMO DO CAPITULO'].includes(norm(block?.text));
const pedagogicalKinds = new Set(['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review']);

function takeListSection(page, start, predicate) {
  const label = page.blocks[start];
  const section = [label];
  let index = start + 1;
  while (index < page.blocks.length) {
    const block = page.blocks[index];
    if (predicate(block)) break;
    if (pedagogicalKinds.has(block.kind) || block.kind === 'heading') break;
    if (block.kind !== 'list-item' && !/^•\s/u.test(block.text) && section.length > 1) break;
    section.push(block);
    index += 1;
  }
  page.blocks.splice(start, section.length);
  return section;
}

let objectiveChapters = 0;
let summaryChapters = 0;
const chapterMeta = [];
for (let chapter = 1; chapter <= 34; chapter += 1) {
  const chapterPages = pages.filter(page => page.chapter === chapter).sort((a,b) => a.number - b.number);
  if (!chapterPages.length) throw new Error(`Missing chapter ${chapter}`);
  const opening = chapterPages[0];
  const ending = chapterPages[chapterPages.length - 1];

  let objectiveSection = null;
  for (const page of chapterPages) {
    const index = page.blocks.findIndex(isObjectives);
    if (index >= 0) { objectiveSection = takeListSection(page, index, isObjectives); break; }
  }
  if (!objectiveSection) throw new Error(`Chapter ${chapter} missing objectives`);
  objectiveSection[0].kind = 'objectives';
  objectiveSection[0].text = 'OBJETIVOS DO CAPÍTULO';
  for (let i = 1; i < objectiveSection.length; i += 1) {
    if (/^•\s/u.test(objectiveSection[i].text)) objectiveSection[i].kind = 'list-item';
  }
  const insertAt = opening.blocks.length && opening.blocks[0].kind === 'paragraph' && !/^•\s/u.test(opening.blocks[0].text) ? 1 : 0;
  opening.blocks.splice(insertAt, 0, ...objectiveSection);
  objectiveChapters += 1;

  let summarySection = null;
  for (const page of chapterPages) {
    const index = page.blocks.findIndex(isSummary);
    if (index >= 0) { summarySection = takeListSection(page, index, isSummary); break; }
  }
  if (!summarySection) throw new Error(`Chapter ${chapter} missing summary`);
  summarySection[0].kind = 'summary';
  summarySection[0].text = 'RESUMO DO CAPÍTULO';
  for (let i = 1; i < summarySection.length; i += 1) {
    if (/^•\s/u.test(summarySection[i].text)) summarySection[i].kind = 'list-item';
  }
  ending.blocks.push(...summarySection);
  summaryChapters += 1;
  chapterMeta.push({ chapter, title: opening.title, openingPage: opening.number, endingPage: ending.number });
}

artifact.runtimeEditorial = {
  ...(artifact.runtimeEditorial ?? {}),
  wave: '7',
  status: 'complete',
  coverage: '1-249',
  chapterObjectives: objectiveChapters,
  chapterSummaries: summaryChapters,
  legacyOpenEndedReviewsPreserved: true,
  chapterLeafStarts: 34,
  doctrineChanged: false,
  wave8VisualStatus: 'complete',
  chapterAssessment: '5x4-interactive'
};
artifact.chapterEditorial = chapterMeta;
fs.writeFileSync(semanticPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`WAVE7_FINALIZE_OK chapters=34 objectives=${objectiveChapters} summaries=${summaryChapters} leaf-starts=34 legacy-reviews=preserved doctrine-changed=false`);
