import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const semanticPath=path.join(root,'content','semantic-pages.json');
const navigationPath=path.join(root,'content','navigation.json');
const semantic=JSON.parse(fs.readFileSync(semanticPath,'utf8'));
const navigation=JSON.parse(fs.readFileSync(navigationPath,'utf8'));
const navChapters=navigation.parts.flatMap(part=>part.chapters).sort((a,b)=>a.chapter-b.chapter);
const expected=Array.from({length:34},(_,i)=>i+1);
const actual=navChapters.map(item=>item.chapter);
if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error(`Wave10 chapter sequence invalid: ${actual.join(',')}`);

const skip=/^(cap[ií]tulo|parte|objetivos do cap[ií]tulo|resumo do cap[ií]tulo|revis[aã]o cumulativa|refer[eê]ncias|gabarito|continua[cç][aã]o)\b/iu;
let changed=0;
const report=[];
for(const chapter of expected){
  const pages=semantic.pages.filter(page=>page.chapter===chapter).sort((a,b)=>a.number-b.number);
  if(!pages.length) throw new Error(`Wave10 missing chapter ${chapter} in semantic pages`);
  const numbered=[];
  for(const page of pages){
    for(const block of page.blocks){
      if(block.kind!=='heading' || skip.test(String(block.text).trim())) continue;
      const match=String(block.text).trim().match(/^(\d+)([.)])\s+(.+)$/u);
      if(!match) continue;
      numbered.push({page,block,number:Number(match[1]),punct:match[2],body:match[3]});
    }
  }
  numbered.forEach((item,index)=>{
    const wanted=index+1;
    if(item.number!==wanted){
      item.block.text=`${wanted}${item.punct} ${item.body}`;
      changed+=1;
    }
  });
  const after=numbered.map((item,index)=>index+1);
  if(numbered.length && after.some((value,index)=>value!==index+1)) throw new Error(`Wave10 structure sequence failed chapter ${chapter}`);
  report.push({chapter,numberedHeadings:numbered.length,normalized:numbered.filter((item,index)=>item.number!==index+1).length});
}
semantic.wave10ChapterStructure={status:'normalized',chapterSequence:'1-34',numberedHeadingRule:'contiguous-per-chapter',report};
fs.writeFileSync(semanticPath,JSON.stringify(semantic,null,2)+'\n');
console.log(`WAVE10_CHAPTER_STRUCTURE_OK chapters=34 sequence=1-34 numbered-headings-normalized=${changed}`);
