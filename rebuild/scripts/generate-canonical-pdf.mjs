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

const referenceInsertAnchor = "  const addInteractiveNote=(section,n)=>{ensureSpace(42);writeFlow(section,`Recurso interativo complementar disponível na edição digital desta seção: ${canonicalUrl}/?pagina=${n}`,{font:'Sans',size:8.8,leading:12,color:COLORS.teal,type:'P',gap:7,align:'left'});};";
if (!source.includes(referenceInsertAnchor)) throw new Error('CANONICAL_PDF_FAIL reference insert anchor ausente');
const referenceWriter = `\n  const writeReference=(parent,text)=>{const style=styleFor('reference'),value=pdfText(text),hang=16;ensurePage();const[first,rest]=splitToFit(value,style,WIDTH,style.leading*1.35),firstH=measure(first,style,WIDTH),restH=rest?measure(rest,style,WIDTH-hang):0,need=firstH+restH+(style.gap??0);if(need<=FLOW_H&&remaining()<need)startRegularPage();addText(parent,first,style,{x:X,y:doc.y,width:WIDTH});if(rest)addText(parent,rest,style,{x:X+hang,y:doc.y,width:WIDTH-hang});doc.y+=style.gap??0;};`;
source = source.replace(referenceInsertAnchor, referenceInsertAnchor + referenceWriter);

const referenceLoopAnchor = "if(pedagogicalKinds.has(block.kind))addPedagogical(section,block);else writeFlow(section,block.text,styleFor(block.kind));i+=1;";
if (!source.includes(referenceLoopAnchor)) throw new Error('CANONICAL_PDF_FAIL reference loop anchor ausente');
source = source.replace(referenceLoopAnchor, "if(pedagogicalKinds.has(block.kind))addPedagogical(section,block);else if(block.kind==='reference')writeReference(section,block.text);else writeFlow(section,block.text,styleFor(block.kind));i+=1;");

const start = source.indexOf('  const drawCover=section=>{');
const end = source.indexOf('\n\n  const coverSection=', start);
if (start < 0 || end < 0) throw new Error('CANONICAL_PDF_FAIL drawCover anchors ausentes');
const replacement = `  const drawCover=section=>{finishMetric();doc.addPage({size:[PAGE.width,PAGE.height],margins:{top:0,right:0,bottom:0,left:0}});physicalPage+=1;currentMetric={physicalPage,kind:'cover',startY:0,endY:PAGE.height,residualBlankRatio:0,overflow:false};markArtifact('Layout',()=>{doc.rect(0,0,PAGE.width,PAGE.height).fill('#f5f0e6');doc.image(canonicalCoverImage,0,0,{fit:[PAGE.width,PAGE.height],align:'center',valign:'center'});});doc.save().opacity(0.001);addText(section,'CATS · MANUAL DO PARTICIPANTE',{font:'SansBold',size:9,leading:11,color:'#001018',type:'P',align:'left'},{x:54,y:45,width:WIDTH});addText(section,'Manual do Participante • Edição Digital Interativa • 2026',{font:'Sans',size:8,leading:10,color:'#001018',type:'P',align:'left'},{x:54,y:64,width:WIDTH});addText(section,'ATENDIMENTO A TENTATIVAS DE SUICÍDIO',{font:'SansBold',size:24,leading:29,color:'#001018',type:'H1',align:'left'},{x:54,y:86,width:WIDTH});addText(section,'Escuta · Técnica · Segurança · Humanidade',{font:'Sans',size:9,leading:12,color:'#001018',type:'P',align:'left'},{x:54,y:690,width:WIDTH});addText(section,'Corpo de Bombeiros Militar de Minas Gerais · GTO ATS · CATS · Formação Especializada · Edição Digital 2026',{font:'Sans',size:7.5,leading:10,color:'#001018',type:'P',align:'left'},{x:54,y:750,width:WIDTH});doc.restore();doc.y=PAGE.height;};`;
source = source.slice(0, start) + replacement + source.slice(end);

await writeFile(tempPath, source, 'utf8');
try {
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
  console.log('CANONICAL_PDF_PASS cover=manual-cats-capa-ebook-2026.jpg sha256=f875ce298711604d1fce6aa3dec4acb67e37396ab754e0ab8b276c0686edbf9f references=abnt-hanging-no-split');
} finally {
  await unlink(tempPath).catch(() => {});
}
