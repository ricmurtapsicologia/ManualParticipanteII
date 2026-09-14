import semanticData from '../../../content/semantic-pages.json';

export const dynamic='force-dynamic';

type Block={kind:string;text:string};
type Page={number:number;title:string;cover?:boolean;part?:number|null;partTitle?:string;chapter?:number|null;blocks:Block[]};
const pages=(semanticData as {pages:Page[]}).pages;
const A4={w:595.28,h:841.89};

function latin(value:string){
  return String(value??'')
    .replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[—–]/g,'-')
    .replace(/…/g,'...').replace(/[•◆◇◎◐↯↳↻▶§]/g,'-')
    .replace(/[^\x00-\xFF]/g,' ')
    .replace(/\s+/g,' ').trim();
}
function hex(value:string){return `<${Buffer.from(latin(value),'latin1').toString('hex').toUpperCase()}>`;}
function wrap(value:string,max:number){
  const words=latin(value).split(/\s+/).filter(Boolean); const lines:string[]=[]; let line='';
  for(const word of words){const next=line?`${line} ${word}`:word;if(next.length<=max)line=next;else{if(line)lines.push(line);line=word;}}
  if(line)lines.push(line); return lines.length?lines:[''];
}
type PdfLine={text:string;font:'F1'|'F2';size:number;leading:number;color?:string;indent?:number};
type PdfPage={lines:PdfLine[];digitalPage:number;cover?:boolean;title?:string;chapter?:number|null;part?:number|null};

function buildLogicalPages(){
  const out:PdfPage[]=[];
  for(const source of pages){
    if(source.cover){out.push({lines:[],digitalPage:source.number,cover:true,title:'Manual do Participante CATS'});continue;}
    let current:PdfPage={lines:[],digitalPage:source.number,title:source.title,chapter:source.chapter,part:source.part};
    let used=0; const limit=690;
    const push=(line:PdfLine)=>{if(used+line.leading>limit&&current.lines.length){out.push(current);current={lines:[],digitalPage:source.number,title:`${source.title} - continuação`,chapter:source.chapter,part:source.part};used=0;}current.lines.push(line);used+=line.leading;};
    push({text:source.part?`PARTE ${source.part}${source.partTitle?` - ${source.partTitle}`:''}`:'CATS - MANUAL DO PARTICIPANTE',font:'F1',size:8,leading:18,color:'0.28 0.39 0.38'});
    if(source.chapter)push({text:`CAPÍTULO ${source.chapter}`,font:'F2',size:9,leading:17,color:'0.08 0.32 0.31'});
    for(const line of wrap(source.title,54))push({text:line,font:'F2',size:17,leading:22,color:'0.05 0.30 0.29'});
    push({text:'',font:'F1',size:5,leading:8});
    for(const block of source.blocks){
      const text=latin(block.text); if(!text)continue;
      const isHeading=block.kind==='heading'; const isMarker=['opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review'].includes(block.kind);
      const max=isHeading||isMarker?60:96; const size=isHeading?12:isMarker?10:9; const leading=isHeading?17:isMarker?15:12.5; const font:isHeading extends true?'F2':'F1'='F1' as never;
      const chosenFont:(typeof font)=undefined as never;
      const f:'F1'|'F2'=(isHeading||isMarker)?'F2':'F1';
      if(isHeading)push({text:'',font:'F1',size:4,leading:5});
      for(const line of wrap(text,max))push({text:line,font:f,size,leading,color:isMarker?'0.08 0.32 0.31':'0.12 0.17 0.17',indent:block.kind==='list-item'?10:0});
      if(isHeading||isMarker)push({text:'',font:'F1',size:4,leading:4});
    }
    out.push(current);
  }
  return out;
}

function streamFor(page:PdfPage,index:number,total:number){
  const c:string[]=[];
  if(page.cover){
    c.push('0.02 0.18 0.19 rg 0 0 595.28 841.89 re f');
    c.push('0.95 0.38 0.03 rg 0 650 595.28 14 re f');
    c.push('0.95 0.38 0.03 rg 46 98 6 180 re f');
    c.push('BT /F2 54 Tf 0.98 0.98 0.95 rg 58 610 Td '+hex('CATS')+' Tj ET');
    c.push('BT /F2 24 Tf 0.98 0.98 0.95 rg 58 566 Td '+hex('MANUAL DO PARTICIPANTE')+' Tj ET');
    c.push('BT /F1 14 Tf 0.90 0.94 0.92 rg 58 530 Td '+hex('Atendimento a Tentativas de Suicídio')+' Tj ET');
    c.push('BT /F1 11 Tf 0.90 0.94 0.92 rg 58 505 Td '+hex('Edição digital interativa - 2026')+' Tj ET');
    c.push('BT /F2 11 Tf 0.95 0.38 0.03 rg 58 185 Td '+hex('ESCUTA  -  TÉCNICA  -  SEGURANÇA  -  HUMANIDADE')+' Tj ET');
    c.push('BT /F1 10 Tf 0.90 0.94 0.92 rg 58 126 Td '+hex('Corpo de Bombeiros Militar de Minas Gerais')+' Tj ET');
    return c.join('\n');
  }
  let y=792;
  for(const line of page.lines){
    if(!line.text){y-=line.leading;continue;}
    const color=line.color??'0.12 0.17 0.17';
    c.push(`BT /${line.font} ${line.size} Tf ${color} rg ${50+(line.indent??0)} ${y.toFixed(2)} Td ${hex(line.text)} Tj ET`);
    y-=line.leading;
  }
  c.push(`BT /F1 8 Tf 0.40 0.45 0.44 rg 50 28 Td ${hex(`Manual do Participante CATS - página digital ${page.digitalPage}`)} Tj ET`);
  c.push(`BT /F1 8 Tf 0.40 0.45 0.44 rg 500 28 Td ${hex(`${index+1}/${total}`)} Tj ET`);
  return c.join('\n');
}

function buildPdf(){
  const rendered=buildLogicalPages();
  const objects:string[]=[''];
  const add=(value:string)=>{objects.push(value);return objects.length-1;};
  const catalog=add(''); const pagesObj=add('');
  const fontRegular=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds:number[]=[];
  rendered.forEach((page,index)=>{
    const stream=streamFor(page,index,rendered.length); const bytes=Buffer.byteLength(stream,'latin1');
    const content=add(`<< /Length ${bytes} >>\nstream\n${stream}\nendstream`);
    const pid=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`);
    pageIds.push(pid);
  });
  objects[pagesObj]=`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`;
  objects[catalog]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  let pdf='%PDF-1.4\n%âãÏÓ\n'; const offsets=[0];
  for(let i=1;i<objects.length;i++){offsets[i]=Buffer.byteLength(pdf,'latin1');pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=Buffer.byteLength(pdf,'latin1');
  pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf,'latin1');
}

export async function GET(){
  const pdf=buildPdf();
  return new Response(new Uint8Array(pdf),{headers:{
    'Content-Type':'application/pdf',
    'Content-Disposition':'attachment; filename="Manual-do-Participante-CATS.pdf"',
    'Cache-Control':'public, max-age=3600, s-maxage=86400',
    'X-Content-Type-Options':'nosniff'
  }});
}
