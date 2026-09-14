const base=(process.env.BASE_URL??'').replace(/\/$/,'');
if(!base) throw new Error('AUDIT_6_FAIL BASE_URL ausente');
const checks=[];
const add=(name,condition)=>checks.push({name,condition:Boolean(condition)});
const get=async path=>{const response=await fetch(`${base}${path}`,{redirect:'follow'});return {response,body:Buffer.from(await response.arrayBuffer())};};
const decodeCommands=stream=>[...stream.matchAll(/<([0-9A-F]+)>/g)].map(match=>Buffer.from(match[1],'hex').toString('latin1'));

const health=await get('/api/health');
add('Health endpoint responde 200',health.response.status===200);
const home=await get('/');
const html=home.body.toString('utf8');
add('Reader responde e não publica estruturas removidas',home.response.status===200&&!/Revisão cumulativa|Caso de transferência|ApplicationTransferCard/iu.test(html));
add('Reader publica a marca CATS e o download do manual',/Manual do Participante CATS/u.test(html)&&/Baixar PDF/u.test(html));
const pdf=await get('/api/manual');
add('PDF responde com contrato editorial ITE44 e front matter',pdf.response.status===200&&/application\/pdf/iu.test(pdf.response.headers.get('content-type')??'')&&pdf.response.headers.get('x-cats-editorial-edition')==='publication-grade-ite44-frontmatter-2026');
const binary=pdf.body.toString('latin1');
const streams=[...binary.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(match=>match[1]);
const pageCommands=streams.map(decodeCommands);
const allText=pageCommands.flat().join('\n');
add('PDF é substancial, justificado e contém autores/prefácio',pdf.body.length>100000&&binary.startsWith('%PDF-1.4')&&pageCommands.length>100&&((binary.match(/ Tw /g)||[]).length>100)&&/AUTORIA INSTITUCIONAL/u.test(allText)&&/PREFÁCIO DO COORDENADOR/u.test(allText)&&/Richelmy Murta Pinto/u.test(allText)&&/Mike Hollander dos Santos Guimarães/u.test(allText));

const chapterPhysicalPages=new Map();
for(let chapter=1;chapter<=34;chapter+=1){
  const pattern=new RegExp(`^CAPÍTULO ${chapter}(?:\\s|$)`,'u');
  const pageIndex=pageCommands.findIndex(commands=>commands.some(command=>pattern.test(command)));
  if(pageIndex>=0) chapterPhysicalPages.set(chapter,pageIndex+1);
}
const firstChapterPage=chapterPhysicalPages.get(1)??0;
const frontCommands=firstChapterPage>1?pageCommands.slice(0,firstChapterPage-1).flat():[];
let tocMatches=chapterPhysicalPages.size===34&&!allText.includes('__PDF_PAGE_');
for(let chapter=1;chapter<=34&&tocMatches;chapter+=1){
  const start=frontCommands.findIndex(command=>command.startsWith(`Capítulo ${chapter}  `));
  if(start<0){tocMatches=false;break;}
  let end=frontCommands.length;
  for(let next=chapter+1;next<=34;next+=1){
    const candidate=frontCommands.findIndex((command,index)=>index>start&&command.startsWith(`Capítulo ${next}  `));
    if(candidate>=0){end=candidate;break;}
  }
  const expected=String(chapterPhysicalPages.get(chapter));
  const segment=frontCommands.slice(start,end);
  if(!segment.some(command=>command.trim().endsWith(expected))) tocMatches=false;
}
add('Sumário aponta para as 34 páginas físicas corretas do PDF',tocMatches);

if(checks.length!==6) throw new Error(`AUDIT_6_INTERNAL count=${checks.length}`);
const failed=checks.filter(check=>!check.condition);
if(failed.length) throw new Error(`AUDIT_6_FAIL ${failed.map((check,index)=>`${index+1}:${check.name}`).join(' | ')}`);
console.log('AUDIT_PUBLICATION_6_PASS controls=6/6 runtime=ok pdf=ite44 frontmatter=ok toc=physical-pages reader=clean');
