import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pagePath = path.join(root, 'app', 'page.tsx');
let source = fs.readFileSync(pagePath, 'utf8');
const before = '<span>Edição Digital Interativa • 249 páginas</span>';
const after = '<span>Edição Digital Interativa • {pages.length} páginas</span>';
if (source.includes(before)) source = source.replace(before, after);
if (!source.includes(after)) throw new Error('Wave10 dynamic public page-count label not installed');
fs.writeFileSync(pagePath, source);
console.log('WAVE10_RUNTIME_PATCH_OK page-label=dynamic backstage=unchanged');
