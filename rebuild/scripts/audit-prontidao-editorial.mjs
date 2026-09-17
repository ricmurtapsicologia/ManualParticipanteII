import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const semantic = JSON.parse(await readFile(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const supplements = JSON.parse(await readFile(path.join(root, 'content', 'prontidao-editorial-supplements.json'), 'utf8'));
const target = new Set((supplements.pages ?? []).map(item => Number(item.page)));
const allowedSparseRoles = new Set(['part-opening','cover']);
const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();

const failures = [];
for (const page of semantic.pages ?? []) {
  const blocks = page.blocks ?? [];
  const chars = blocks.reduce((sum, block) => sum + normalize(block.text).length, 0);
  if (!page.cover && !allowedSparseRoles.has(page.pageRole) && blocks.length === 0) failures.push(`empty-page:${page.number}`);
  if (target.has(Number(page.number))) {
    const applied = blocks.filter(block => String(block.id ?? '').startsWith(`p${page.number}-pr1-`));
    if (applied.length < 4) failures.push(`supplement-missing:${page.number}`);
    if (chars < 650) failures.push(`still-underfilled:${page.number}:${chars}`);
  }
}
for (const expected of target) {
  if (!(semantic.pages ?? []).some(page => Number(page.number) === expected)) failures.push(`target-not-found:${expected}`);
}
if (failures.length) throw new Error(`PRONTIDAO_EDITORIAL_AUDIT_FAIL ${failures.join(' | ')}`);
console.log(`PRONTIDAO_EDITORIAL_AUDIT_PASS targets=${target.size} empty_content_pages=0`);
