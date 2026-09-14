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
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

if (manifest.schemaVersion !== 1) fail(`schemaVersion=${manifest.schemaVersion}`);
if (manifest.wave !== '5.6') fail(`wave=${manifest.wave}`);
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
const nativeRenderers = new Set(['native://ats-system-macro', 'native://speech-synthesis', 'native://ats-system-video']);
const semanticByPage = new Map((semantic.pages ?? []).map(page => [page.number, page]));

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

  const sourcePage = semanticByPage.get(resource.pageNumber);
  if (!sourcePage) fail(`resource=${resource.id} source page not found`);
  const canonicalText = normalize((sourcePage.blocks ?? []).map(block => block.text).join(' '));

  if (resource.kind === 'audio') {
    if (resource.src !== 'native://speech-synthesis') fail(`resource=${resource.id} audio src must be native://speech-synthesis in wave 5.6`);
    if (typeof resource.sourceBlockId !== 'string' || !resource.sourceBlockId.trim()) fail(`resource=${resource.id} missing sourceBlockId`);
    const sourceBlock = (sourcePage.blocks ?? []).find(block => block.id === resource.sourceBlockId);
    if (!sourceBlock) fail(`resource=${resource.id} sourceBlockId not found=${resource.sourceBlockId}`);
    if (normalize(resource.transcript) !== normalize(sourceBlock.text)) fail(`resource=${resource.id} audio transcript must match source block`);
    if (resource.preferredVoice !== manifest.policy.ttsPreferredVoice) fail(`resource=${resource.id} preferredVoice must match policy`);
    if (resource.fallbackLang !== manifest.policy.ttsFallbackLang) fail(`resource=${resource.id} fallbackLang must match policy`);
  }

  if (resource.kind === 'microlearning') {
    if (typeof resource.prompt !== 'string' || !resource.prompt.trim()) fail(`resource=${resource.id} missing prompt`);
    if (typeof resource.reveal !== 'string' || !resource.reveal.trim()) fail(`resource=${resource.id} missing reveal`);
    if (typeof resource.sourceBlockId !== 'string' || !resource.sourceBlockId.trim()) fail(`resource=${resource.id} missing sourceBlockId`);
    const sourceBlock = (sourcePage.blocks ?? []).find(block => block.id === resource.sourceBlockId);
    if (!sourceBlock) fail(`resource=${resource.id} sourceBlockId not found=${resource.sourceBlockId}`);
    const sourceBlockText = normalize(sourceBlock.text);
    if (!sourceBlockText.includes(normalize(resource.prompt))) fail(`resource=${resource.id} prompt not grounded in source block`);
    if (!sourceBlockText.includes(normalize(resource.reveal))) fail(`resource=${resource.id} reveal not grounded in source block`);
    if (!Array.isArray(resource.choices) || resource.choices.length < 2) fail(`resource=${resource.id} requires at least two choices`);
    const choiceIds = new Set();
    let correctCount = 0;
    for (const choice of resource.choices) {
      if (typeof choice.id !== 'string' || !choice.id.trim()) fail(`resource=${resource.id} choice missing id`);
      if (choiceIds.has(choice.id)) fail(`resource=${resource.id} duplicate choice id=${choice.id}`);
      choiceIds.add(choice.id);
      if (typeof choice.label !== 'string' || !choice.label.trim()) fail(`resource=${resource.id} choice=${choice.id} missing label`);
      if (!sourceBlockText.includes(normalize(choice.label))) fail(`resource=${resource.id} choice label not grounded=${choice.label}`);
      if (choice.correct === true) correctCount += 1;
      else if (choice.correct !== false) fail(`resource=${resource.id} choice=${choice.id} correct must be boolean`);
    }
    if (correctCount !== 1) fail(`resource=${resource.id} correct choices=${correctCount}`);
  }

  if (typeof resource.src === 'string' && /^https?:/i.test(resource.src) && !resource.src.startsWith('https://')) {
    fail(`resource=${resource.id} external src must use https`);
  }

  if (typeof resource.src === 'string' && resource.src.startsWith('native://')) {
    if (!nativeRenderers.has(resource.src)) fail(`resource=${resource.id} unknown native renderer=${resource.src}`);
    if (resource.src === 'native://ats-system-macro') {
      if (!Array.isArray(resource.steps) || resource.steps.length === 0) fail(`resource=${resource.id} native renderer requires steps`);
      const orders = new Set();
      for (const step of resource.steps) {
        if (!Number.isInteger(step.order) || step.order < 1) fail(`resource=${resource.id} invalid step order`);
        if (orders.has(step.order)) fail(`resource=${resource.id} duplicate step order=${step.order}`);
        orders.add(step.order);
        if (typeof step.title !== 'string' || !step.title.trim()) fail(`resource=${resource.id} step missing title`);
        if (typeof step.detail !== 'string' || !step.detail.trim()) fail(`resource=${resource.id} step missing detail`);
        if (!canonicalText.includes(normalize(step.title))) fail(`resource=${resource.id} step title not grounded=${step.title}`);
        if (!canonicalText.includes(normalize(step.detail))) fail(`resource=${resource.id} step detail not grounded=${step.detail}`);
      }
      if (resource.pageNumber !== 54) fail(`resource=${resource.id} ATS macro must be on page 54`);
      if (resource.steps.length !== 7) fail(`resource=${resource.id} ATS macro steps=${resource.steps.length}`);
      if (typeof resource.transverse !== 'string' || !resource.transverse.trim()) fail(`resource=${resource.id} missing transverse re-evaluation rule`);
      if (!canonicalText.includes(normalize(resource.transverse))) fail(`resource=${resource.id} transverse rule not grounded`);
    }
    if (resource.src === 'native://speech-synthesis' && resource.kind !== 'audio') fail(`resource=${resource.id} speech-synthesis renderer requires audio kind`);
    if (resource.src === 'native://ats-system-video') {
      if (resource.kind !== 'video') fail(`resource=${resource.id} ATS video renderer requires video kind`);
      if (resource.pageNumber !== 54) fail(`resource=${resource.id} ATS video must be on page 54`);
      if (typeof resource.alt !== 'string' || !resource.alt.trim()) fail(`resource=${resource.id} ATS video missing descriptive alt`);
      if (!Array.isArray(resource.steps) || resource.steps.length !== 7) fail(`resource=${resource.id} ATS video steps=${resource.steps?.length ?? 0}`);
      const orders = new Set();
      const transcript = normalize(resource.transcript);
      for (const step of resource.steps) {
        if (!Number.isInteger(step.order) || step.order < 1) fail(`resource=${resource.id} invalid video step order`);
        if (orders.has(step.order)) fail(`resource=${resource.id} duplicate video step order=${step.order}`);
        orders.add(step.order);
        if (typeof step.title !== 'string' || !step.title.trim()) fail(`resource=${resource.id} video step missing title`);
        if (typeof step.detail !== 'string' || !step.detail.trim()) fail(`resource=${resource.id} video step missing detail`);
        if (!canonicalText.includes(normalize(step.title))) fail(`resource=${resource.id} video step title not grounded=${step.title}`);
        if (!canonicalText.includes(normalize(step.detail))) fail(`resource=${resource.id} video step detail not grounded=${step.detail}`);
        if (!transcript.includes(normalize(step.title))) fail(`resource=${resource.id} transcript missing step title=${step.title}`);
        if (!transcript.includes(normalize(step.detail))) fail(`resource=${resource.id} transcript missing step detail=${step.detail}`);
      }
      if (typeof resource.transverse !== 'string' || !resource.transverse.trim()) fail(`resource=${resource.id} video missing transverse rule`);
      if (!canonicalText.includes(normalize(resource.transverse))) fail(`resource=${resource.id} video transverse rule not grounded`);
      if (!transcript.includes(normalize(resource.transverse))) fail(`resource=${resource.id} transcript missing transverse rule`);
    }
  }
}

console.log(`MULTIMEDIA_VALIDATE_OK wave=${manifest.wave} pages=${pageCount} resources=${manifest.resources.length} audio=${manifest.resources.filter(item => item.kind === 'audio').length} video=${manifest.resources.filter(item => item.kind === 'video').length} microlearning=${manifest.resources.filter(item => item.kind === 'microlearning').length} native=${manifest.resources.filter(item => String(item.src ?? '').startsWith('native://')).length} source-text=frozen accessibility=required tts=Antônio->pt-BR`);
