import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const readJson=(file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const readText=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const semantic=readJson('content/semantic-pages.json');
const navigation=readJson('content/navigation.json');
const enrichment=readJson('content/chapter-enrichment.json');
const chapters=navigation.parts.flatMap(part=>part.chapters).sort((a,b)=>a.chapter-b.chapter);
const expected=Array.from({length:34},(_,i)=>i+1);
const actual=chapters.map(item=>item.chapter);
if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error(`Wave10 polish chapter order invalid: ${actual.join(',')}`);
if(enrichment.chapters?.length!==34) throw new Error(`Wave10 polish expected 34 enrichment chapters, got ${enrichment.chapters?.length}`);
const resources=enrichment.chapters.map(item=>item.resource);
if(new Set(resources.map(item=>item.url)).size!==34) throw new Error('Wave10 polish repeated resource URL');
if(new Set(resources.map(item=>item.title.toLowerCase())).size!==34) throw new Error('Wave10 polish repeated resource title');
for(const resource of resources){
  if(resource.language!=='pt-BR') throw new Error(`Wave10 polish non-Portuguese resource: ${resource.title}`);
  if(resource.type!=='link') throw new Error(`Wave10 polish resource must be written material: ${resource.title}`);
  if(!/^https:\/\//u.test(resource.url)) throw new Error(`Wave10 polish invalid resource URL: ${resource.url}`);
  if(/gto\.bombeiros\.mg\.gov\.br/iu.test(resource.url)) throw new Error(`Wave10 polish GTO resource forbidden: ${resource.url}`);
}

const skip=/^(cap[ií]tulo|parte|objetivos do cap[ií]tulo|resumo do cap[ií]tulo|revis[aã]o cumulativa|refer[eê]ncias|gabarito|continua[cç][aã]o)\b/iu;
let numberedHeadings=0;
for(const chapter of expected){
  const pages=semantic.pages.filter(page=>page.chapter===chapter).sort((a,b)=>a.number-b.number);
  if(!pages.length) throw new Error(`Wave10 polish missing chapter ${chapter}`);
  const numbers=[];
  for(const page of pages){for(const block of page.blocks){
    if(block.kind!=='heading'||skip.test(String(block.text).trim())) continue;
    const match=String(block.text).trim().match(/^(\d+)[.)]\s+/u);
    if(match) numbers.push(Number(match[1]));
  }}
  numbers.forEach((value,index)=>{if(value!==index+1) throw new Error(`Wave10 polish numbered structure gap chapter ${chapter}: ${numbers.join(',')}`);});
  numberedHeadings+=numbers.length;
}

const pageSource=readText('app/page.tsx');
const coverSource=readText('app/wave54.tsx');
const manualRoute=readText('app/api/manual/route.ts');
if(!pageSource.includes('data-testid="manual-download"')||!pageSource.includes('href="/api/manual"')) throw new Error('Wave10 polish manual download control missing');
if(!coverSource.includes('data-testid="approved-cover"')||!coverSource.includes('CATS')) throw new Error('Wave10 polish edited cover missing');
if(coverSource.includes('approvedCoverDataUrl')) throw new Error('Wave10 polish legacy cover still active');

// Camada editorial/documental: contrato do PDF e elementos de publicação.
if(!manualRoute.includes("'Content-Type': 'application/pdf'")) throw new Error('Publication PDF content type missing');
if(!manualRoute.includes('Manual-do-Participante-CATS-Edicao-Digital-2026.pdf')) throw new Error('Publication PDF filename missing');
for(const token of ['buildLayout','Sumário','PROJETO EDITORIAL','Times-Roman','justify','renderFigure','INFOGRÁFICO','publication-grade-2026']){
  if(!manualRoute.includes(token)) throw new Error(`Publication editorial contract missing: ${token}`);
}
for(const figure of ["'psp'","'risk'","'network'","'communication'","'crisis'","'continuity'"]){
  if(!manualRoute.includes(figure)) throw new Error(`Publication figure family missing: ${figure}`);
}
if(/Pinterest|pixabay/iu.test(manualRoute)) throw new Error('Publication PDF must not depend on decorative external imagery');

console.log(`WAVE10_POLISH_AUDIT_PASS chapters=34 chapter-sequence=1-34 numbered-headings=${numberedHeadings} resources=34 unique=34 language=pt-BR gto=excluded cover=edited manual-download=publication-grade-pdf figures=semantic-vector`);
