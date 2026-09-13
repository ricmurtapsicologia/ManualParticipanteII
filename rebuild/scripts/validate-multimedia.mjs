import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const manifestPath = path.join(root, 'content', 'multimedia-manifest.json');
const semanticPath = path.join(root, 'content', 'semantic-pages.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const semantic = JSON.parse(fs.readFileSync(semanticPath, 'utf8'));
const pageCount = Array.isArray(semantic.pages) ? semantic.pages.length : 0;

const fail = message => {
  console.error(`MULTIMEDIA_VALIDATE_FAIL ${message}`);
  process.exit(1);
};

if (manifest.schemaVersion !== 1) fail(`schemaVersion=${manifest.schemaVersion}`);
if (manifest.wave !== '5.1') fail(`wave=${manifest.wave}`);
if (manifest.policy?.sourceTextFrozen !== true) fail('sourceTextFrozen must be true');
if (manifest.policy?.accessibilityRequired !== true) fail('accessibilityRequired must be true');
if (manifest.policy?.ttsPreferredVoice !== 'Antônio') fail('ttsPreferredVoice must be Antônio');
if (manifest.policy?.ttsFallbackLang !== 'pt-BR') fail('ttsFallbackLang must be pt-BR');
if (pageCount !== 249) fail(`semantic pages=${pageCount}`);
if (!Array.isArray(manifest.resources)) fail('resources must be an array');

const allowed = new Set(manifest.policy?.allowedKinds ?? []);
const canonicalKinds = ['infographic', 'chart', 'image', 'audio', 'video', 'microlearning'];
for (const kind of canonicalKinds) if (!allowed.has(kind)) fail(`missing allowed kind=${kind}`);
for (const kind of allowed) if (!canonicalKinds.includes(kind)) fail(`unexpected allowed kind=${kind}`);

const ids = new Set();
const visualKinds = new Set(['infographic', 'chart', 'image']);
const timedKinds = new Set(['audio', 'video']);

for (const [index, resource] of manifest.resources.entries()) {
  if (!resource || typeof resource !== 'object') fail(`resource[${index}] must be an object`);
  if (typeof resource.id !== 'string' || !resource.id.trim()) fail(`resource[${index}] missing id`);
  if (ids.has(resource.id)) fail(`duplicate id=${resource.id}`);
  ids.add(resource.id);
  if (!allowed.has(resource.kind)) fail(`resource=${resource.id} invalid kind=${resource.kind}`);
  if (!Number.isInteger(resource.pageNumber) || resource.pageNumber < 1 || resource.pageNumber > pageCount) fail(`resource=${resource.id} invalid pageNumber=${resource.pageNumber}`);
  if (typeof resource.title !== 'string' || !resource.title.trim()) fail(`resource=${resource.id} missing title`);

  if (visualKinds.has(resource.kind)) {
    if (typeof resource.src !== 'string' || !resource.src.trim()) fail(`resource=${resource.id} missing src`);
    if (typeof resource.alt !== 'string' || !resource.alt.trim()) fail(`resource=${resource.id} missing alt`);
  }

  if (timedKinds.has(resource.kind)) {
    if (typeof resource.src !== 'string' || !resource.src.trim()) fail(`resource=${resource.id} missing src`);
    if (typeof resource.transcript !== 'string' || !resource.transcript.trim()) fail(`resource=${resource.id} missing transcript`);
  }

  if (resource.kind === 'microlearning') {
    if (typeof resource.prompt !== 'string' || !resource.prompt.trim()) fail(`resource=${resource.id} missing prompt`);
    if (typeof resource.reveal !== 'string' || !resource.reveal.trim()) fail(`resource=${resource.id} missing reveal`);
  }

  if (typeof resource.src === 'string' && /^https?:/i.test(resource.src) && !resource.src.startsWith('https://')) {
    fail(`resource=${resource.id} external src must use https`);
  }
}

console.log(`MULTIMEDIA_VALIDATE_OK wave=${manifest.wave} pages=${pageCount} resources=${manifest.resources.length} kinds=${canonicalKinds.length} source-text=frozen accessibility=required tts=Antônio->pt-BR`);
