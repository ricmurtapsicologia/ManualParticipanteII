import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const epubRoutePath = path.join(root, 'app', 'api', 'epub', 'route.ts');

const legacyReferenceCss = '.reference{padding-left:1.5em;text-indent:-1.5em;text-align:left;font-size:.94em;overflow-wrap:anywhere}';
const abntReferenceCss = '.reference{padding-left:1.5em;text-indent:-1.5em;text-align:left;font-size:.94em;margin:.8em 0;break-inside:avoid;page-break-inside:avoid;hyphens:none;-webkit-hyphens:none;word-break:normal;overflow-wrap:normal;orphans:3;widows:3}';

let source = await readFile(epubRoutePath, 'utf8');
if (source.includes(legacyReferenceCss)) {
  source = source.replace(legacyReferenceCss, abntReferenceCss);
  await writeFile(epubRoutePath, source, 'utf8');
  console.log('ACCEPTANCE_HOTFIX_PASS epub-references=abnt');
} else if (source.includes(abntReferenceCss)) {
  console.log('ACCEPTANCE_HOTFIX_PASS epub-references=already-abnt');
} else {
  throw new Error('ACCEPTANCE_HOTFIX_FAIL EPUB reference CSS anchor ausente');
}
