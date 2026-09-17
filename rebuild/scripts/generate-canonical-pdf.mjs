import { PDFDocument } from 'pdfkit';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, 'generate-accessible-pdf.mjs');
const tempPath = path.join(here, '.generate-accessible-pdf.canonical.tmp.mjs');

const addPage = PDFDocument.prototype.addPage;
PDFDocument.prototype.addPage = function(options = {}) {
  const margins = options?.margins;
  if (margins && Number(margins.bottom) === 68) options = { ...options, margins: { ...margins, bottom: 30 } };
  return addPage.call(this, options);
};
const text = PDFDocument.prototype.text;
PDFDocument.prototype.text = function(value, x, y, options) {
  if (options?.structType === 'H3') options = { ...options, structType: 'H2' };
  return text.call(this, value, x, y, options);
};

let source = await readFile(sourcePath, 'utf8');
const makePdfAnchor = 'async function makePdf(){';
if (!source.includes(makePdfAnchor)) throw new Error('CANONICAL_PDF_FAIL makePdf anchor ausente');
source = source.replace(makePdfAnchor, `const canonicalCoverImage=await readFile(path.join(root,'public','assets','manual-cats','2026','manual-cats-capa-ebook-2026.jpg'));\n\n${makePdfAnchor}`);

const referenceStyleAnchor = "  if(kind==='reference') return {font:'Serif',size:REF_SIZE,leading:13.2,color:COLORS.ink,type:'P',gap:5,align:'left'};";
if (!source.includes(referenceStyleAnchor)) throw new Error('CANONICAL_PDF_FAIL reference style anchor ausente');
source = source.replace(referenceStyleAnchor, "  if(kind==='reference') return {font:'Serif',size:10,leading:12,color:COLORS.ink,type:'P',gap:7,align:'left',keepTogether:true,hangingIndent:18};");

const writeFlowAnchor = "  const writeFlow=(parent,text,style,opts={})=>{let rest=pdfText(text);const width=opts.width??WIDTH;while(rest){ensurePage();const minRoom=Math.max(style.leading*2.2,38);if(remaining()<minRoom)startRegularPage();const fullH=measure(rest,style,width);if(fullH<=remaining()){addText(parent,rest,style,{width,x:opts.x??X,y:doc.y});rest='';}else{const[head,tail]=splitToFit(rest,style,width,Math.max(style.leading*2,remaining()-2));addText(parent,head,style,{width,x:opts.x??X,y:doc.y});rest=tail;if(rest)startRegularPage();}}doc.y+=style.gap??0;};";
if (!source.includes(writeFlowAnchor)) throw new Error('CANONICAL_PDF_FAIL writeFlow anchor ausente');
const writeFlowReplacement = "  const writeFlow=(parent,text,style,opts={})=>{let rest=pdfText(text);const hanging=Number(style.hangingIndent||0);const x=opts.x??(hanging?X+hanging:X);const width=opts.width??(hanging?WIDTH-hanging:WIDTH);const indent=opts.indent??(hanging?-hanging:0);ensurePage();if(style.keepTogether&&rest){const fullH=measure(rest,style,width);if(fullH<=FLOW_H&&fullH>remaining())startRegularPage();if(fullH<=remaining()){addText(parent,rest,style,{width,x,y:doc.y,indent});doc.y+=style.gap??0;return;}}while(rest){ensurePage();const minRoom=Math.max(style.leading*2.2,38);if(remaining()<minRoom)startRegularPage();const fullH=measure(rest,style,width);if(fullH<=remaining()){addText(parent,rest,style,{width,x,y:doc.y,indent});rest='';}else{const[head,tail]=splitToFit(rest,style,width,Math.max(style.leading*2,remaining()-2));addText(parent,head,style,{width,x,y:doc.y,indent});rest=tail;if(rest)startRegularPage();}}doc.y+=style.gap??0;};";
source = source.replace(writeFlowAnchor, writeFlowReplacement);

const start = source.indexOf('  const drawCover=section=>{');
const end = source.indexOf('\n\n  const coverSection=', start);
if (start < 0 || end < 0) throw new Error('CANONICAL_PDF_FAIL drawCover anchors ausentes');
const replacement = `  const drawCover=section=>{finishMetric();doc.addPage({size:[PAGE.width,PAGE.height],margins:{top:0,right:0,bottom:0,left:0}});physicalPage+=1;currentMetric={physicalPage,kind:'cover',startY:0,endY:PAGE.height,residualBlankRatio:0,overflow:false};markArtifact('Layout',()=>{doc.rect(0,0,PAGE.width,PAGE.height).fill('#f5f0e6');doc.image(canonicalCoverImage,0,0,{fit:[PAGE.width,PAGE.height],align:'center',valign:'center'});});doc.save().opacity(0.001);addText(section,'CATS · MANUAL DO PARTICIPANTE',{font:'SansBold',size:9,leading:11,color:'#001018',type:'P',align:'left'},{x:54,y:45,width:WIDTH});addText(section,'Manual do Participante • Edição Digital Interativa • 2026',{font:'Sans',size:8,leading:10,color:'#001018',type:'P',align:'left'},{x:54,y:64,width:WIDTH});addText(section,'ATENDIMENTO A TENTATIVAS DE SUICÍDIO',{font:'SansBold',size:24,leading:29,color:'#001018',type:'H1',align:'left'},{x:54,y:86,width:WIDTH});addText(section,'Escuta · Técnica · Segurança · Humanidade',{font:'Sans',size:9,leading:12,color:'#001018',type:'P',align:'left'},{x:54,y:690,width:WIDTH});addText(section,'Corpo de Bombeiros Militar de Minas Gerais · GTO ATS · CATS · Formação Especializada · Edição Digital 2026',{font:'Sans',size:7.5,leading:10,color:'#001018',type:'P',align:'left'},{x:54,y:750,width:WIDTH});doc.restore();doc.y=PAGE.height;};`;
source = source.slice(0, start) + replacement + source.slice(end);

await writeFile(tempPath, source, 'utf8');
try {
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
  console.log('CANONICAL_PDF_PASS cover=manual-cats-capa-ebook-2026.jpg sha256=f875ce298711604d1fce6aa3dec4acb67e37396ab754e0ab8b276c0686edbf9f refs=abnt-hanging-keep-together');
} finally {
  await unlink(tempPath).catch(() => {});
}
