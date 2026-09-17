import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');
const supplementPath = path.join(root, 'content', 'prontidao-editorial-supplements.json');
const semantic = JSON.parse(await readFile(semanticPath, 'utf8'));
const supplements = JSON.parse(await readFile(supplementPath, 'utf8'));

const pageMap = new Map((semantic.pages ?? []).map(page => [Number(page.number), page]));
let added = 0;
for (const entry of supplements.pages ?? []) {
  const page = pageMap.get(Number(entry.page));
  if (!page) throw new Error(`PRONTIDAO_EDITORIAL_FAIL page_missing=${entry.page}`);
  page.blocks ??= [];
  const existing = new Set(page.blocks.map(block => block.id));
  const baseIndex = page.blocks.reduce((max, block) => Math.max(max, Number(block.sourceIndex ?? -1)), -1) + 1;
  (entry.blocks ?? []).forEach((block, index) => {
    const id = `p${entry.page}-pr1-${index + 1}`;
    if (existing.has(id)) return;
    const kind = block.kind === 'case' || block.kind === 'summary' ? 'guided-analysis' : block.kind;
    const text = /^CENÁRIO$/iu.test(String(block.text ?? '').trim()) ? 'EXERCÍCIO SITUACIONAL' : block.text;
    page.blocks.push({ id, kind, sourceIndex:baseIndex + index, text });
    added += 1;
  });
}
semantic.prontidao ??= {};
semantic.prontidao.editorialWave = 1;
semantic.prontidao.editorialSupplements = (supplements.pages ?? []).map(item => Number(item.page));
semantic.prontidao.policy = 'conteudo-substantivo-sem-fatos-novos';
await writeFile(semanticPath, `${JSON.stringify(semantic, null, 2)}\n`, 'utf8');
console.log(`PRONTIDAO_EDITORIAL_APPLIED pages=${supplements.pages.length} blocks_added=${added}`);
