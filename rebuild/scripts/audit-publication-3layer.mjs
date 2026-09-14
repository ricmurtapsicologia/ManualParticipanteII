import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const readJson=(file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const readText=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const fail=(layer,message)=>{throw new Error(`PUBLICATION_AUDIT_${layer}_FAIL ${message}`)};
const assert=(layer,condition,message)=>{if(!condition)fail(layer,message)};

const semantic=readJson('content/semantic-pages.json');
const navigation=readJson('content/navigation.json');
const enrichment=readJson('content/chapter-enrichment.json');
const route=readText('app/api/manual/route.ts');
const cover=readText('app/wave54.tsx');
const pageSource=readText('app/page.tsx');

// CAMADA 1 — EDITORIAL/SEMÂNTICA
assert('L1',semantic.pages?.length===246,`pages=${semantic.pages?.length}`);
const chapterSequence=navigation.parts.flatMap(part=>part.chapters).map(item=>item.chapter).sort((a,b)=>a-b);
assert('L1',JSON.stringify(chapterSequence)===JSON.stringify(Array.from({length:34},(_,i)=>i+1)),`chapter-sequence=${chapterSequence.join(',')}`);
assert('L1',enrichment.chapters?.length===34,`resources=${enrichment.chapters?.length}`);
const resources=enrichment.chapters.map(item=>item.resource);
assert('L1',new Set(resources.map(item=>item.url)).size===34,'resource URLs are not unique');
assert('L1',new Set(resources.map(item=>String(item.title).toLocaleLowerCase('pt-BR'))).size===34,'resource titles are not unique');
for(const item of resources){
  assert('L1',item.language==='pt-BR',`non pt-BR resource: ${item.title}`);
  assert('L1',item.type==='link',`non-written resource: ${item.title}`);
  assert('L1',/^https:\/\//u.test(item.url),`non-https resource: ${item.url}`);
  assert('L1',!/gto\.bombeiros\.mg\.gov\.br/iu.test(item.url),`GTO link forbidden: ${item.url}`);
}
assert('L1',cover.includes('data-testid="approved-cover"')&&cover.includes('Atendimento a Tentativas de Suicídio'),'approved cover contract missing');
assert('L1',pageSource.includes('data-testid="manual-download"')&&pageSource.includes('href="/api/manual"'),'manual download control missing');
for(const token of ['Sumário','PROJETO EDITORIAL','Times-Roman','Times-Bold','justify','renderFigure','INFOGRÁFICO','publication-grade-2026']) assert('L1',route.includes(token),`editorial route token missing: ${token}`);
for(const figure of ["'psp'","'risk'","'network'","'communication'","'crisis'","'continuity'"]) assert('L1',route.includes(figure),`figure family missing: ${figure}`);
assert('L1',!/Pinterest|pixabay/iu.test(route),'decorative external imagery dependency found');

const base=process.env.BASE_URL;
if(!base){
  console.log('PUBLICATION_AUDIT_LAYER1_PASS pages=246 chapters=34 resources=34 unique=34 pt-BR=34 gto=0 cover=approved typography=serif-justified figures=semantic-vector');
  process.exit(0);
}

function decodePdfHex(buffer){
  const raw=buffer.toString('latin1');
  const text=[...raw.matchAll(/<([0-9A-F]{4,})>/g)].map(match=>{
    try{return Buffer.from(match[1],'hex').toString('latin1')}catch{return ''}
  }).join('\n');
  return {raw,text};
}

// CAMADA 2 — DOCUMENTO/PDF REAL
const pdfResponse=await fetch(`${base}/api/manual`);
assert('L2',pdfResponse.ok,`pdf status=${pdfResponse.status}`);
assert('L2',(pdfResponse.headers.get('content-type')||'').includes('application/pdf'),'content-type');
assert('L2',(pdfResponse.headers.get('content-disposition')||'').includes('Manual-do-Participante-CATS-Edicao-Digital-2026.pdf'),'content-disposition');
assert('L2',pdfResponse.headers.get('x-cats-editorial-edition')==='publication-grade-2026','editorial edition header');
const pdf=Buffer.from(await pdfResponse.arrayBuffer());
assert('L2',pdf.length>100000,`pdf-bytes=${pdf.length}`);
assert('L2',pdf.subarray(0,8).toString('latin1').includes('%PDF-1.4'),'pdf signature');
const decoded=decodePdfHex(pdf);
const physicalPages=(decoded.raw.match(/\/Type \/Page\b/g)||[]).length;
assert('L2',physicalPages>=80&&physicalPages<=600,`physical-pages=${physicalPages}`);
for(const token of ['Manual do Participante CATS','Atendimento a Tentativas de Suicídio','Sumário','PROJETO EDITORIAL']) assert('L2',decoded.text.includes(token),`pdf text missing: ${token}`);
const justifiedLines=(decoded.raw.match(/\sTw\s/g)||[]).length;
assert('L2',justifiedLines>100,`justified-lines=${justifiedLines}`);
const infographicLabels=(decoded.text.match(/INFOGRÁFICO/g)||[]).length;
assert('L2',infographicLabels>=1,`infographics=${infographicLabels}`);

// CAMADA 3 — EXPERIÊNCIA/INTEGRAÇÃO
const home=await fetch(base);
assert('L3',home.ok,`home status=${home.status}`);
const html=await home.text();
for(const token of ['Manual do Participante CATS','data-page-count="246"','manual-download','approved-cover']) assert('L3',html.includes(token),`home token missing: ${token}`);
for(const forbidden of ['data-wave=','data-editorial-wave=','data-design-wave=','data-reader-wave=']) assert('L3',!html.includes(forbidden),`backstage marker leaked: ${forbidden}`);

console.log(`PUBLICATION_AUDIT_3LAYER_PASS L1=editorial-semantic L2=pdf-runtime bytes=${pdf.length} physical-pages=${physicalPages} justified-lines=${justifiedLines} infographics=${infographicLabels} L3=reader-integration pages=246`);
