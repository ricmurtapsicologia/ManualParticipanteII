import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content', 'multimedia-manifest.json'), 'utf8'));
const semantic = JSON.parse(fs.readFileSync(path.join(root, 'content', 'semantic-pages.json'), 'utf8'));
const pageCount = Array.isArray(semantic.pages) ? semantic.pages.length : 0;
const fail = message => { console.error(`MULTIMEDIA_VALIDATE_FAIL ${message}`); process.exit(1); };
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

if (manifest.schemaVersion !== 1) fail(`schemaVersion=${manifest.schemaVersion}`);
if (manifest.wave !== '5.6') fail(`wave=${manifest.wave}`);
if (manifest.policy?.sourceTextFrozen !== true) fail('sourceTextFrozen must be true');
if (manifest.policy?.accessibilityRequired !== true) fail('accessibilityRequired must be true');
if (manifest.policy?.ttsPreferredVoice !== 'Antônio') fail('ttsPreferredVoice must be Antônio');
if (manifest.policy?.ttsFallbackLang !== 'pt-BR') fail('ttsFallbackLang must be pt-BR');
if (pageCount !== 223 || manifest.publicPageCount !== 223) fail(`published pages semantic=${pageCount} manifest=${manifest.publicPageCount}`);
if (!Array.isArray(manifest.resources)) fail('resources must be an array');
if ((manifest.resources ?? []).some(resource => resource.kind === 'video')) fail('final publication must not contain video resources');

const canonicalKinds = new Set(['infographic', 'chart', 'image', 'audio', 'microlearning']);
const allowed = new Set(manifest.policy?.allowedKinds ?? []);
for (const kind of allowed) if (!canonicalKinds.has(kind)) fail(`unexpected allowed kind=${kind}`);
for (const resource of manifest.resources) if (!allowed.has(resource.kind)) fail(`resource=${resource.id} kind not allowed=${resource.kind}`);

const ids = new Set();
const semanticByPage = new Map((semantic.pages ?? []).map(page => [page.number, page]));
const blockById = new Map();
for (const page of semantic.pages ?? []) for (const block of page.blocks ?? []) blockById.set(block.id, { pageNumber: page.number, block });
const nativeRenderers = new Set(['native://ats-system-macro', 'native://cats-infographic', 'native://speech-synthesis']);
const visualKinds = new Set(['infographic', 'chart', 'image']);

for (const [index, resource] of manifest.resources.entries()) {
  if (!resource || typeof resource !== 'object') fail(`resource[${index}] must be an object`);
  if (typeof resource.id !== 'string' || !resource.id.trim()) fail(`resource[${index}] missing id`);
  if (ids.has(resource.id)) fail(`duplicate id=${resource.id}`);
  ids.add(resource.id);
  if (!Number.isInteger(resource.pageNumber) || resource.pageNumber < 1 || resource.pageNumber > pageCount) fail(`resource=${resource.id} invalid pageNumber=${resource.pageNumber}`);
  if (typeof resource.title !== 'string' || !resource.title.trim()) fail(`resource=${resource.id} missing title`);
  if (!semanticByPage.has(resource.pageNumber)) fail(`resource=${resource.id} published page not found`);

  if (visualKinds.has(resource.kind)) {
    if (typeof resource.src !== 'string' || !resource.src.trim()) fail(`resource=${resource.id} missing src`);
    if (typeof resource.alt !== 'string' || !resource.alt.trim()) fail(`resource=${resource.id} missing alt`);
  }

  if (resource.kind === 'audio') {
    if (resource.src !== 'native://speech-synthesis') fail(`resource=${resource.id} audio src must be native://speech-synthesis`);
    if (typeof resource.transcript !== 'string' || !resource.transcript.trim()) fail(`resource=${resource.id} missing transcript`);
    if (typeof resource.sourceBlockId !== 'string' || !resource.sourceBlockId.trim()) fail(`resource=${resource.id} missing sourceBlockId`);
    const source = blockById.get(resource.sourceBlockId);
    if (!source) fail(`resource=${resource.id} sourceBlockId not found anywhere=${resource.sourceBlockId}`);
    if (normalize(resource.transcript) !== normalize(source.block.text)) fail(`resource=${resource.id} transcript must match preserved source block`);
    if (resource.preferredVoice !== 'Antônio' || resource.fallbackLang !== 'pt-BR') fail(`resource=${resource.id} invalid TTS policy`);
  }

  if (resource.kind === 'microlearning') {
    if (typeof resource.prompt !== 'string' || !resource.prompt.trim()) fail(`resource=${resource.id} missing prompt`);
    if (typeof resource.reveal !== 'string' || !resource.reveal.trim()) fail(`resource=${resource.id} missing reveal`);
    if (!Array.isArray(resource.choices) || resource.choices.length < 2) fail(`resource=${resource.id} requires at least two choices`);
    if (resource.choices.filter(choice => choice.correct === true).length !== 1) fail(`resource=${resource.id} requires exactly one correct choice`);
    if (typeof resource.sourceBlockId === 'string' && resource.sourceBlockId.trim() && !blockById.has(resource.sourceBlockId)) fail(`resource=${resource.id} sourceBlockId not found anywhere=${resource.sourceBlockId}`);
  }

  if (typeof resource.src === 'string' && resource.src.startsWith('native://')) {
    if (!nativeRenderers.has(resource.src)) fail(`resource=${resource.id} unknown native renderer=${resource.src}`);
    if (resource.kind === 'infographic') {
      if (!Array.isArray(resource.steps) || resource.steps.length < 3) fail(`resource=${resource.id} infographic requires steps`);
      const orders = new Set();
      for (const step of resource.steps) {
        if (!Number.isInteger(step.order) || step.order < 1 || orders.has(step.order)) fail(`resource=${resource.id} invalid/duplicate step order`);
        orders.add(step.order);
        if (typeof step.title !== 'string' || !step.title.trim() || typeof step.detail !== 'string' || !step.detail.trim()) fail(`resource=${resource.id} incomplete step`);
      }
      if (typeof resource.transverse !== 'string' || !resource.transverse.trim()) fail(`resource=${resource.id} missing transverse rule`);
    }
  }
}

const macro = manifest.resources.find(resource => resource.id === 'ats-system-macro-p54');
if (!macro || macro.pageNumber !== 51 || macro.steps?.length !== 7 || !/Sistema ATS/i.test(macro.title)) fail('ATS macro must be traceably remapped from source p54 to final page 51 with seven steps');
const infographics = manifest.resources.filter(resource => resource.kind === 'infographic');
if (infographics.length < 3) fail(`expected at least 3 infographics, got ${infographics.length}`);
if (!Array.isArray(manifest.removedFrontMatterPages) || manifest.removedFrontMatterPages.join(',') !== '2,4,5') fail('final page remap provenance missing');

console.log(`MULTIMEDIA_VALIDATE_OK wave=${manifest.wave} pages=${pageCount} resources=${manifest.resources.length} infographics=${infographics.length} audio=${manifest.resources.filter(item => item.kind === 'audio').length} video=0 microlearning=${manifest.resources.filter(item => item.kind === 'microlearning').length} provenance=block-id-global remap=source54->final51 tts=Antônio->pt-BR`);
