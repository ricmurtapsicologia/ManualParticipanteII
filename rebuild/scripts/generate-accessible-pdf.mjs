import { PDFDocument } from 'pdfkit';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'public', 'downloads');
const pdfPath = path.join(outDir, 'Manual-do-Participante-CATS-Edicao-Digital-2026.pdf');
const reportPath = path.join(outDir, 'manual-preflight.json');
const regularSans = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const boldSans = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');
const regularSerif = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSerif.ttf');
const boldSerif = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSerif-Bold.ttf');

const [semantic, navigation, multimedia, quizzes] = await Promise.all([
  readFile(path.join(root, 'content', 'semantic-pages.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'content', 'navigation.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'content', 'multimedia-manifest.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'content', 'chapter-quizzes.json'), 'utf8').then(JSON.parse)
]);

const pages = semantic.pages ?? [];
const PAGE = { width: 595.28, height: 841.89 };
const X = 58;
const WIDTH = PAGE.width - X * 2;
const TOP = 86;
const BOTTOM = 68;
const FOOTER_MARGIN = 28;
const MAX_Y = PAGE.height - BOTTOM;
const COLORS = { ink:'#183537', teal:'#104b4c', muted:'#6d7a79', line:'#d9ddd8', orange:'#e86d2b', deep:'#052b2d', aqua:'#74d3cc' };
const fixedDate = new Date('2026-09-15T00:00:00.000Z');
const canonicalUrl = 'https://manual-participante-cats-digital.vercel.app';
const pedagogicalKinds = new Set(['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review']);
const clean = value => String(value ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
const normalize = value => clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const safeDest = n => `page-${Number(n) || 1}`;
const sha256 = data => createHash('sha256').update(data).digest('hex');
const sourceText = pages.flatMap(page => [page.title, ...(page.blocks ?? []).map(block => block.text)]).filter(Boolean).map(clean).join('\n');

function mediaForPage(pageNumber) { return (multimedia.resources ?? []).filter(resource => resource.pageNumber === pageNumber); }
function quizForPage(pageNumber) { return (quizzes.chapters ?? []).find(item => item.endingPage === pageNumber) ?? null; }
function typographyFor(block, bodySize) {
  if (block.kind === 'heading') return { font:'SansBold', size:bodySize+2.2, leading:bodySize*1.38, color:COLORS.teal, type:'H3', gap:6 };
  if (pedagogicalKinds.has(block.kind)) return { font:'SansBold', size:bodySize+0.5, leading:bodySize*1.34, color:block.kind === 'attention' || block.kind === 'decide' ? COLORS.orange : COLORS.teal, type:'H3', gap:5 };
  if (block.kind === 'reference') return { font:'Serif', size:Math.max(7.8,bodySize-0.6), leading:bodySize*1.34, color:COLORS.ink, type:'P', gap:4 };
  if (block.kind === 'external-link' || block.kind === 'external-resource') return { font:'Sans', size:Math.max(8,bodySize-0.3), leading:bodySize*1.34, color:COLORS.teal, type:'Link', gap:5 };
  return { font:'Serif', size:bodySize, leading:bodySize*1.46, color:COLORS.ink, type:'P', gap:7 };
}
function textOptions(t,width=WIDTH) { return { width, align:t.type === 'P' ? 'justify' : 'left', lineGap:Math.max(0.7,t.leading-t.size*1.2), paragraphGap:0 }; }
function measureText(doc,value,t,width=WIDTH) { doc.font(t.font).fontSize(t.size); return doc.heightOfString(`${clean(value)} `,{...textOptions(t,width),align:t.type === 'P' ? 'justify' : 'left'}); }
function estimatePage(doc,page,bodySize) {
  let h = measureText(doc,page.title || 'Manual do Participante CATS',{font:'SansBold',size:page.cover?30:18,leading:page.cover?36:23,type:page.cover?'H1':'H2'}) + (page.cover?18:15);
  for (const block of page.blocks ?? []) {
    if (!clean(block.text)) continue;
    if (block.kind === 'list-item') h += measureText(doc,block.text,{font:'Serif',size:bodySize,leading:bodySize*1.42,type:'P'},WIDTH-22)+4;
    else { const t=typographyFor(block,bodySize); h += measureText(doc,block.text,t)+t.gap; }
  }
  const media=mediaForPage(page.number);
  if (media.some(resource=>resource.kind==='infographic')) h+=80;
  if (media.some(resource=>['audio','video','microlearning'].includes(resource.kind)) || quizForPage(page.number)) h+=42;
  return h;
}
function fitBodySize(doc,page) { const available=MAX_Y-TOP-8; for (let size=10.4;size>=7.4;size-=0.2) if (estimatePage(doc,page,size)<=available) return Number(size.toFixed(1)); return 7.4; }
function markArtifact(doc,type,fn) { doc.markContent('Artifact',{type}); fn(); doc.endMarkedContent(); }
function internalDestination(text) {
  const n=normalize(text);
  const chapterMatch=n.match(/cap(?:itulo|\.)?\s*(\d{1,2})/);
  if (chapterMatch) { const chapter=(navigation.parts??[]).flatMap(part=>part.chapters??[]).find(item=>Number(item.chapter)===Number(chapterMatch[1])); if (chapter) return safeDest(chapter.openingPage); }
  const partMatch=n.match(/parte\s*(\d{1,2})/);
  if (partMatch) { const part=(navigation.parts??[]).find(item=>Number(item.part)===Number(partMatch[1])); if (part) return safeDest(part.openingPage); }
  const candidates=[...(navigation.frontMatter??[]),...(navigation.parts??[]).flatMap(part=>[...(part.chapters??[]),...(part.supplementarySections??[])])];
  const direct=candidates.find(item=>{const title=normalize(item.title);return title.length>9&&(n===title||n.includes(title));});
  return direct?safeDest(direct.openingPage):null;
}
function externalUrl(block) { if (block.url || block.href) return String(block.url || block.href); const match=clean(block.text).match(/https?:\/\/[^\s)\]}>,;]+/i); return match?.[0]??null; }
function addStructuredText(doc,parent,text,t,x,y,extra={}) {
  const value=`${clean(text)} `;
  doc.font(t.font).fontSize(t.size).fillColor(t.color??COLORS.ink);
  const options={...textOptions(t,extra.width??WIDTH),...extra};
  const link=extra.link||null; const goTo=extra.goTo||null; const type=t.type||'P';
  doc.text(value,x,y,{...options,structParent:parent,structType:type,link,goTo,underline:Boolean(link||goTo)});
  return doc.y;
}
function addList(doc,parent,items,x,y,bodySize) {
  const list=doc.struct('L'); parent.add(list); doc.font('Serif').fontSize(bodySize).fillColor(COLORS.ink); doc.x=x; doc.y=y;
  doc.list(items.map(item=>`${clean(item)} `),{width:WIDTH-12,indent:15,bulletRadius:1.8,textIndent:8,lineGap:1.3,structParent:list,structTypes:['LI','Lbl','LBody']});
  list.end(); return doc.y+4;
}
function addFigure(doc,parent,resource,x,y) {
  const height=70; const bbox=[x,y,x+WIDTH,y+height]; const alt=clean(resource.alt||resource.longDescription||`${resource.title||'Infográfico'}: representação visual complementar ao conteúdo da página.`);
  const figure=doc.struct('Figure',{alt,bbox,placement:'Block'}); parent.add(figure); const content=doc.markStructureContent('Figure'); figure.add(content);
  doc.save(); doc.roundedRect(x,y,WIDTH,height,7).fillAndStroke('#eef5f2','#c9d8d4'); doc.fillColor(COLORS.teal).font('SansBold').fontSize(9.4).text(clean(resource.title||'Infográfico'),x+12,y+10,{width:WIDTH-24});
  const steps=(resource.steps??[]).slice(0,5); const body=steps.length?steps.map(step=>`${step.order}. ${clean(step.title)} — ${clean(step.detail)}`).join('  •  '):alt;
  doc.fillColor(COLORS.ink).font('Sans').fontSize(7.5).text(body,x+12,y+29,{width:WIDTH-24,height:31,ellipsis:true}); doc.restore(); doc.endMarkedContent(); figure.end(); return y+height+8;
}
function addDigitalEquivalent(doc,parent,pageNumber,x,y,bodySize) {
  const url=`${canonicalUrl}/?pagina=${pageNumber}`; const label=`Recurso interativo complementar disponível na edição digital desta página. ${url}`;
  return addStructuredText(doc,parent,label,{font:'Sans',size:Math.max(7.8,bodySize-0.5),leading:bodySize*1.3,color:COLORS.teal,type:'Link'},x,y,{link:url,width:WIDTH});
}
function drawHeaderFooter(doc,page) {
  markArtifact(doc,'Pagination',()=>{doc.fillColor(COLORS.muted).font('Sans').fontSize(7.2); const left=page.part?`PARTE ${page.part}${page.partTitle?` · ${clean(page.partTitle)}`:''}`:'CATS · MANUAL DO PARTICIPANTE'; const right=page.chapter?`CAPÍTULO ${page.chapter}`:'EDIÇÃO 2026'; doc.text(left,X,38,{width:WIDTH*0.68,ellipsis:true}); doc.text(right,X+WIDTH*0.68,38,{width:WIDTH*0.32,align:'right'}); doc.strokeColor(COLORS.line).lineWidth(0.6).moveTo(X,53).lineTo(X+WIDTH,53).stroke(); doc.fillColor(COLORS.muted).font('SansBold').fontSize(7.5).text(String(page.number),X,PAGE.height-44,{width:WIDTH,align:'right'});});
}
function drawCover(doc,parent,page) {
  markArtifact(doc,'Layout',()=>{doc.rect(0,0,PAGE.width,PAGE.height).fill(COLORS.deep);doc.save().opacity(0.18).fillColor(COLORS.orange).circle(PAGE.width-60,100,110).fill().restore();doc.save().opacity(0.18).fillColor(COLORS.aqua).circle(110,690,155).fill().restore();});
  let y=235; y=addStructuredText(doc,parent,'CATS · CBMMG',{font:'SansBold',size:12,leading:15,color:COLORS.aqua,type:'P'},X,y,{width:WIDTH})+16; y=addStructuredText(doc,parent,page.title||'Manual do Participante',{font:'SansBold',size:31,leading:37,color:'#ffffff',type:'H1'},X,y,{width:WIDTH})+18; y=addStructuredText(doc,parent,'Edição Digital Interativa · 2026',{font:'Sans',size:14,leading:18,color:'#ffffff',type:'P'},X,y,{width:WIDTH})+12; addStructuredText(doc,parent,'Corpo de Bombeiros Militar de Minas Gerais',{font:'Sans',size:10.5,leading:14,color:'#ffffff',type:'P'},X,y,{width:WIDTH});
}

async function makePdf() {
  const doc=new PDFDocument({autoFirstPage:false,size:[PAGE.width,PAGE.height],margins:{top:TOP,right:X,bottom:FOOTER_MARGIN,left:X},pdfVersion:'1.7',tagged:true,subset:'PDF/UA',lang:'pt-BR',displayTitle:true,compress:true,info:{Title:'Manual do Participante CATS — Edição Digital 2026',Author:'Corpo de Bombeiros Militar de Minas Gerais',Subject:'Formação especializada CATS/ATS — Manual do Participante',Keywords:'CATS, ATS, CBMMG, abordagem técnica, tentativa de suicídio, formação',CreationDate:fixedDate,ModDate:fixedDate,Edition:'2026',Version:'2026.09.15-qep',Identifier:'CBMMG-CATS-MP-2026-QEP'}});
  doc.registerFont('Sans',regularSans); doc.registerFont('SansBold',boldSans); doc.registerFont('Serif',regularSerif); doc.registerFont('SerifBold',boldSerif);
  const chunks=[]; doc.on('data',chunk=>chunks.push(chunk)); const finished=new Promise((resolve,reject)=>{doc.on('end',resolve);doc.on('error',reject);});
  const auditPages=[]; const documentStruct=doc.struct('Document',{title:'Manual do Participante CATS — Edição Digital 2026',lang:'pt-BR'}); doc.addStructure(documentStruct); const partStructs=new Map();
  for (const page of pages) {
    doc.addPage({size:[PAGE.width,PAGE.height],margins:{top:TOP,right:X,bottom:FOOTER_MARGIN,left:X}}); doc.addNamedDestination(safeDest(page.number));
    const section=doc.struct('Sect',{title:clean(page.title||`Página ${page.number}`),lang:'pt-BR'});
    if (page.part) { if (!partStructs.has(page.part)) { const partStruct=doc.struct('Part',{title:`Parte ${page.part}${page.partTitle?` — ${clean(page.partTitle)}`:''}`,lang:'pt-BR'}); documentStruct.add(partStruct); partStructs.set(page.part,partStruct); } partStructs.get(page.part).add(section); } else documentStruct.add(section);
    if (page.cover) { drawCover(doc,section,page); section.end(); auditPages.push({page:page.number,bodySize:null,maxY:doc.y,sourceBlocks:(page.blocks??[]).length,overflow:false,cover:true}); continue; }
    drawHeaderFooter(doc,page); const bodySize=fitBodySize(doc,page); let y=TOP; y=addStructuredText(doc,section,page.title||`Página ${page.number}`,{font:'SansBold',size:18,leading:23,color:COLORS.teal,type:'H2'},X,y,{width:WIDTH})+14;
    const blocks=page.blocks??[];
    for (let i=0;i<blocks.length;) { const block=blocks[i]; if (!clean(block.text)){i+=1;continue;} if (block.kind==='list-item'){const items=[];while(i<blocks.length&&blocks[i].kind==='list-item'){if(clean(blocks[i].text))items.push(blocks[i].text);i+=1;} y=addList(doc,section,items,X,y,bodySize);continue;} const t=typographyFor(block,bodySize); const href=externalUrl(block); const goTo=!href&&/sum[aá]rio/i.test(page.title||'')?internalDestination(block.text):null; y=addStructuredText(doc,section,block.text,t,X,y,{width:WIDTH,link:href,goTo})+t.gap; i+=1; }
    const pageMedia=mediaForPage(page.number); const infographic=pageMedia.find(resource=>resource.kind==='infographic'); if (infographic) y=addFigure(doc,section,infographic,X,y); const hasInteractive=pageMedia.some(resource=>['audio','video','microlearning'].includes(resource.kind))||Boolean(quizForPage(page.number)); if (hasInteractive) y=addDigitalEquivalent(doc,section,page.number,X,y,bodySize)+4;
    const overflow=y>MAX_Y+1; auditPages.push({page:page.number,bodySize,maxY:Number(y.toFixed(2)),sourceBlocks:blocks.length,overflow,cover:false,interactiveEquivalent:hasInteractive,infographic:Boolean(infographic)}); section.end();
  }
  documentStruct.end();
  for (const front of navigation.frontMatter??[]) doc.outline.addItem(clean(front.title),{pageNumber:Math.max(0,Number(front.openingPage)-1)});
  for (const part of navigation.parts??[]) { const p=doc.outline.addItem(`Parte ${part.part} — ${clean(part.title)}`,{pageNumber:Math.max(0,Number(part.openingPage)-1),expanded:false}); for (const chapter of part.chapters??[]) { const c=p.addItem(`Capítulo ${chapter.chapter} — ${clean(chapter.title)}`,{pageNumber:Math.max(0,Number(chapter.openingPage)-1)}); for (const marker of chapter.pedagogicalMarkers??[]) { const labels={opening:'Situação de abertura',objectives:'Objetivos',doctrine:'Doutrina',evidence:'Evidência',practice:'Na prática',attention:'Atenção',decide:'Decida',case:'Caso para decisão','guided-analysis':'Análise orientadora',summary:'Resumo',review:'Questões de revisão'}; c.addItem(labels[marker.kind]??clean(marker.kind),{pageNumber:Math.max(0,Number(marker.pageNumber)-1)}); } } for (const supplement of part.supplementarySections??[]) p.addItem(clean(supplement.title),{pageNumber:Math.max(0,Number(supplement.openingPage)-1)}); }
  doc.end(); await finished; return {buffer:Buffer.concat(chunks),auditPages};
}

if (!pages.length) throw new Error('semantic-pages.json não contém páginas.');
await mkdir(outDir,{recursive:true}); const first=await makePdf(); const second=await makePdf(); const hash1=sha256(first.buffer); const hash2=sha256(second.buffer); if(hash1!==hash2) throw new Error(`Geração de PDF não determinística: ${hash1} != ${hash2}`); const overflows=first.auditPages.filter(item=>item.overflow); if(overflows.length) throw new Error(`Overflow detectado nas páginas: ${overflows.map(item=>item.page).join(', ')}`); await writeFile(pdfPath,first.buffer);
const report={schemaVersion:1,generatedAt:'2026-09-15T00:00:00.000Z',title:'Manual do Participante CATS — Edição Digital 2026',edition:'2026',version:'2026.09.15-qep',identifier:'CBMMG-CATS-MP-2026-QEP',language:'pt-BR',canonicalUrl,pageCount:pages.length,chapterCount:navigation.chapterCount??34,sourceBlockCount:pages.reduce((sum,page)=>sum+(page.blocks?.length??0),0),sourceCharacterCount:sourceText.length,pdfBytes:first.buffer.byteLength,sha256:hash1,deterministic:true,tagged:true,pdfUaDeclared:true,embeddedFontFamily:'DejaVu Sans / DejaVu Serif',pages:first.auditPages}; await writeFile(reportPath,JSON.stringify(report,null,2)); console.log(JSON.stringify({pdf:path.relative(root,pdfPath),sha256:hash1,pages:pages.length,bytes:first.buffer.byteLength,deterministic:true},null,2));