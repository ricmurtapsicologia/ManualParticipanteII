import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { buildSemanticDocument } from './semantic-model.mjs';

const sourceUrl = new URL('../content/pages.json', import.meta.url);
const outputUrl = new URL('../content/semantic-pages.json', import.meta.url);
const sourceText = await readFile(sourceUrl, 'utf8');
const sourcePages = JSON.parse(sourceText);
const sourceSha256 = createHash('sha256').update(sourceText).digest('hex');
const semantic = buildSemanticDocument(sourcePages, sourceSha256);

await writeFile(outputUrl, `${JSON.stringify(semantic, null, 2)}\n`, 'utf8');

const overlaps = semantic.manifest.boundaryChapterOverlaps
  .map(item => `${item.chapter}:[${item.parts.join(',')}]`)
  .join(';');

console.log(
  `SEMANTIC_MIGRATE_OK pages=${semantic.manifest.pageCount} blocks=${semantic.manifest.blockCount} ` +
  `parts=${semantic.manifest.partCount} chapters=${semantic.manifest.distinctChapterNumberCount} ` +
  `chapter-part-pairs=${semantic.manifest.sourceChapterPairCount} overlaps=${overlaps || 'none'} ` +
  `sha=${sourceSha256.slice(0, 12)}`
);

if (semantic.manifest.editorialAnomalies.length) {
  console.log(`SEMANTIC_ANOMALIES ${JSON.stringify(semantic.manifest.editorialAnomalies)}`);
}
