import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'content',name),'utf8'));
const semantic=read('semantic-pages.json');
const navigation=read('navigation.json');
const quizzes=read('chapter-quizzes.json');
const enrichment=read('chapter-enrichment.json');
const multimedia=read('multimedia-manifest.json');
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const norm=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const checks=[];
const add=(name,condition)=>checks.push({name,condition:Boolean(condition)});

for(let chapter=1;chapter<=34;chapter+=1){
  const pages=semantic.pages.filter(page=>page.chapter===chapter).sort((a,b)=>a.number-b.number);
  const text=norm(pages.flatMap(page=>[page.title,...(page.blocks??[]).map(block=>block.text)]).join(' '));
  const objectives=pages.flatMap(page=>(page.blocks??[]).filter(block=>block.kind==='objectives'));
  const summaries=pages.flatMap(page=>(page.blocks??[]).filter(block=>block.kind==='summary'));
  add(`Capítulo ${chapter}: estrutura e conteúdo`,pages.length>0&&text.length>80&&objectives.length===1&&summaries.length===1);
  const quiz=quizzes.chapters.find(item=>item.chapter===chapter);
  add(`Capítulo ${chapter}: quiz íntegro`,quiz?.questions?.length===5&&quiz.questions.every(question=>question.choices?.length===4&&question.choices.filter(choice=>choice.correct).length===1));
}

const allBlocks=semantic.pages.flatMap(page=>page.blocks??[]);
const allText=norm(semantic.pages.flatMap(page=>[page.title,...(page.blocks??[]).map(block=>block.text)]).join('\n'));
const pageSet=new Set(semantic.pages.map(page=>page.number));
const resources=enrichment.chapters.map(item=>item.resource);
const globalChecks=[
  ['Paginação contínua',semantic.pages.every((page,index)=>page.number===index+1)],
  ['Manifesto acompanha página final',semantic.manifest?.pageCount===semantic.pages.length],
  ['Navegação acompanha página final',navigation.sourcePageCount===semantic.pages.length],
  ['34 capítulos na navegação',navigation.chapterCount===34],
  ['34 quizzes',quizzes.chapters?.length===34],
  ['34 enriquecimentos',enrichment.chapters?.length===34],
  ['Sem revisão cumulativa',!allText.includes('REVISAO CUMULATIVA')],
  ['Sem seção rotulada cenário',!allBlocks.some(block=>block.kind==='case'||/^CENARIO\b/u.test(norm(block.text)))],
  ['Sem caso de transferência',!allText.includes('CASO DE TRANSFERENCIA')],
  ['Sem aplicação e transferência',!allText.includes('APLICACAO E TRANSFERENCIA')],
  ['Sem páginas vazias',semantic.pages.every(page=>clean(page.title)||(page.blocks??[]).some(block=>clean(block.text)))],
  ['Sem headings internos no capítulo 23',semantic.pages.filter(page=>page.chapter===23).flatMap(page=>page.blocks??[]).every(block=>block.kind!=='heading')],
  ['Sem vídeo no manifesto',!(multimedia.resources??[]).some(resource=>resource.kind==='video')],
  ['Mídia remapeada para páginas válidas',(multimedia.resources??[]).every(resource=>pageSet.has(resource.pageNumber))],
  ['Ao menos três infográficos',(multimedia.resources??[]).filter(resource=>resource.kind==='infographic').length>=3],
  ['34 recursos em português',resources.length===34&&resources.every(resource=>resource?.language==='pt-BR')],
  ['Recursos HTTPS',resources.every(resource=>/^https:\/\//u.test(resource?.url??''))],
  ['Recursos únicos',new Set(resources.map(resource=>resource?.url)).size===resources.length],
  ['Sem WHO direto em inglês',resources.every(resource=>!/who\.int\//iu.test(resource?.url??''))],
  ['VIVA oficial corrigido',resources.filter(resource=>resource?.url==='https://www.gov.br/saude/pt-br/composicao/svsa/inqueritos-de-saude/viva-sinan').length===1],
  ['Transfer removido dos dados',enrichment.chapters.every(item=>!('transfer' in item))],
  ['Metadados registram hotfix',semantic.runtimeEditorial?.publicationHotfix==='2026-09-14']
];
for(const [name,condition] of globalChecks) add(name,condition);

if(checks.length!==90) throw new Error(`AUDIT_90_INTERNAL count=${checks.length}`);
const failed=checks.filter(check=>!check.condition);
if(failed.length) throw new Error(`AUDIT_90_FAIL ${failed.map((check,index)=>`${index+1}:${check.name}`).join(' | ')}`);
console.log(`AUDIT_PUBLICATION_90_PASS controls=${checks.length}/90 pages=${semantic.pages.length} chapters=34 resources=${resources.length}`);
