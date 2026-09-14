import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const file = path.join(root, 'content', 'chapter-enrichment.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const vivaTitle = 'VIVA/SINAN: vigilância contínua e notificação de violências';
const vivaUrl = 'https://www.gov.br/saude/pt-br/composicao/svsa/inqueritos-de-saude/viva-sinan';
let vivaFixed = 0;

for (const chapter of data.chapters ?? []) {
  delete chapter.transfer;
  const resource = chapter.resource;
  if (!resource) continue;
  if (/VIVA.*instrutivo|viol[êe]ncia interpessoal e autoprovocada/iu.test(resource.title ?? '')) {
    resource.title = vivaTitle;
    resource.url = vivaUrl;
    resource.note = 'Página oficial do Ministério da Saúde, em português, sobre vigilância contínua, objetos de notificação e fluxo de registro de violências interpessoais e autoprovocadas.';
    resource.language = 'pt-BR';
    vivaFixed += 1;
  }
  if (resource.language !== 'pt-BR') throw new Error(`Material não português no capítulo ${chapter.chapter}: ${resource.title}`);
  if (/who\.int\//iu.test(resource.url ?? '')) throw new Error(`Material em inglês/WHO direto no capítulo ${chapter.chapter}: ${resource.url}`);
}

data.resourcePolicy = { ...(data.resourcePolicy ?? {}), language:'pt-BR', writtenMaterials:true, video:false, english:false, transfer:false };
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
if (vivaFixed !== 1) throw new Error(`Esperado corrigir 1 recurso VIVA; corrigidos=${vivaFixed}`);
console.log(`PUBLICATION_ENRICHMENT_HOTFIX_OK chapters=${data.chapters?.length ?? 0} transfer=0 viva=${vivaFixed} language=pt-BR video=0 english=0`);
