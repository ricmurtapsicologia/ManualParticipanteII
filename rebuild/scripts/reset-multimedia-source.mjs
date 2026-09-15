import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(here, '..', 'content', 'multimedia-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const generatedIds = new Set(['cats-tactical-decision-flow', 'cats-psp-flow']);
const baseResources = (manifest.resources ?? [])
  .filter(resource => !generatedIds.has(resource.id))
  .filter(resource => resource.kind !== 'video')
  .map(resource => {
    const match = String(resource.id ?? '').match(/-p(\d+)$/u);
    if (!match) throw new Error(`MULTIMEDIA_SOURCE_RESET missing stable source page in id=${resource.id}`);
    return { ...resource, pageNumber: Number(match[1]) };
  });

if (!baseResources.length) throw new Error('MULTIMEDIA_SOURCE_RESET no canonical resources');
const ids = new Set(baseResources.map(resource => resource.id));
if (ids.size !== baseResources.length) throw new Error('MULTIMEDIA_SOURCE_RESET duplicate resource ids');

manifest.resources = baseResources;
manifest.publicPageCount = 249;
delete manifest.removedFrontMatterPages;
manifest.policy = {
  ...(manifest.policy ?? {}),
  sourceTextFrozen: true,
  accessibilityRequired: true,
  allowedKinds: ['infographic', 'chart', 'image', 'audio', 'microlearning'],
  ttsPreferredVoice: 'Antônio',
  ttsFallbackLang: 'pt-BR'
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`MULTIMEDIA_SOURCE_RESET_OK pages=249 resources=${baseResources.length} generated=removed source-pages=restored-by-id`);
