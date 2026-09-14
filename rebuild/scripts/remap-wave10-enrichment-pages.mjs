import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const semanticPath=path.join(root,'content','semantic-pages.json');
const enrichmentPath=path.join(root,'content','chapter-enrichment.json');
const semantic=JSON.parse(fs.readFileSync(semanticPath,'utf8'));
const enrichment=JSON.parse(fs.readFileSync(enrichmentPath,'utf8'));
for(const item of enrichment.chapters){
  const pages=semantic.pages.filter(page=>page.chapter===item.chapter).sort((a,b)=>a.number-b.number);
  if(!pages.length) throw new Error(`Wave10 enrichment remap missing chapter ${item.chapter}`);
  item.openingPage=pages[0].number;
  item.endingPage=pages.at(-1).number;
  item.microlearning.pageNumber=pages[Math.floor(pages.length/2)].number;
  if(item.transfer) item.transfer.pageNumber=pages.at(-1).number;
  item.resource.pageNumber=pages.at(-1).number;
}
fs.writeFileSync(enrichmentPath,JSON.stringify(enrichment,null,2)+'\n');
console.log(`WAVE10_ENRICHMENT_REMAP_OK chapters=${enrichment.chapters.length} pagination=final-${semantic.pages.length}`);
