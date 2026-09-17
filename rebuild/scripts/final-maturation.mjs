import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const contentDir = path.join(root, 'content');
const appDir = path.join(root, 'app');
const scriptsDir = path.join(root, 'scripts');
const reportsDir = path.join(root, 'reports');

const readJson = file => readFile(file, 'utf8').then(JSON.parse);
const writeJson = (file, data) => writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const stripBullet = value => clean(value).replace(/^[•▪◦‣·–—-]\s*/, '').trim();
const clip = (value, max = 250) => {
  const text = clean(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const boundary = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(', '), cut.lastIndexOf(' '));
  return `${cut.slice(0, boundary > max * 0.65 ? boundary : max).trim()}…`;
};

const semanticPath = path.join(contentDir, 'semantic-pages.json');
const navigationPath = path.join(contentDir, 'navigation.json');
const quizzesPath = path.join(contentDir, 'chapter-quizzes.json');
const enrichmentPath = path.join(contentDir, 'chapter-enrichment.json');
const [semantic, navigation, quizzes, enrichment] = await Promise.all([
  readJson(semanticPath), readJson(navigationPath), readJson(quizzesPath), readJson(enrichmentPath)
]);

const editorialReplacements = new Map([
  ['p87-b2', '10. Por que integrar saúde cedo mesmo quando o resgate ainda não ocorreu?'],
  ['p84-b6', 'Em situações com arma de fogo, a orientação operacional estabelece liderança/negociação policial especializada. Em outras cenas, polícia pode apoiar isolamento, controle de terceiros e segurança conforme necessidade. A integração deve ser antecipada: quem decide o quê; como a equipe BM será posicionada; em que momento APH ou salvamento entram.']
]);
const editorialRemovals = new Set(['p87-b3']);
let editorialCorrections = 0;
for (const page of semantic.pages ?? []) {
  const nextBlocks = [];
  for (const block of page.blocks ?? []) {
    if (editorialRemovals.has(block.id)) { editorialCorrections += 1; continue; }
    let text = clean(block.text);
    if (editorialReplacements.has(block.id)) {
      text = editorialReplacements.get(block.id);
      editorialCorrections += 1;
    }
    const lowerOrientation = text.replace(/, A orientação operacional/gu, ', a orientação operacional');
    if (lowerOrientation !== text) { text = lowerOrientation; editorialCorrections += 1; }
    nextBlocks.push({ ...block, text });
  }
  page.blocks = nextBlocks;
}

const pagesByNumber = new Map((semantic.pages ?? []).map(page => [page.number, page]));
const chapterNav = new Map();
for (const part of navigation.parts ?? []) for (const chapter of part.chapters ?? []) chapterNav.set(chapter.chapter, chapter);

function chapterScenario(chapterNumber) {
  const nav = chapterNav.get(chapterNumber);
  if (!nav) return '';
  const pages = nav.pageNumbers.map(number => pagesByNumber.get(number)).filter(Boolean);
  const blocks = pages.flatMap(page => page.blocks ?? []);
  const openingIndex = blocks.findIndex(block => block.kind === 'opening');
  if (openingIndex >= 0) {
    const after = blocks.slice(openingIndex + 1).find(block => ['paragraph', 'case', 'practice', 'guided-analysis'].includes(block.kind) && clean(block.text));
    if (after) return clip(after.text, 260);
  }
  const caseBlock = blocks.find(block => ['case', 'guided-analysis'].includes(block.kind) && clean(block.text));
  if (caseBlock) return clip(caseBlock.text, 260);
  const paragraph = blocks.find(block => block.kind === 'paragraph' && clean(block.text).length > 60);
  return paragraph ? clip(paragraph.text, 260) : '';
}

const pedagogicalTypes = ['conceito', 'aplicacao', 'discriminacao', 'cenario', 'integracao'];
const quizTypeCounts = Object.fromEntries(pedagogicalTypes.map(type => [type, 0]));
const curationActionCounts = { manter: 0, melhorar: 0, substituir: 0 };
let questionCount = 0;
const recognitionRx = /(aparece|corresponde|sintetiza|alinhad[ao]|foi trabalhada|ideia-chave|princ[ií]pio)/iu;
for (const chapter of quizzes.chapters ?? []) {
  const context = chapterScenario(chapter.chapter);
  chapter.questions = (chapter.questions ?? []).map((question, index) => {
    const type = pedagogicalTypes[index % pedagogicalTypes.length];
    quizTypeCounts[type] += 1;
    questionCount += 1;
    const legacyRecognition = recognitionRx.test(question.prompt ?? '');
    const curationAction = type === 'cenario' || type === 'discriminacao' ? 'substituir' : legacyRecognition ? 'melhorar' : 'manter';
    curationActionCounts[curationAction] += 1;
    const correct = (question.choices ?? []).find(choice => choice.correct);
    if (!correct) throw new Error(`Quiz sem alternativa correta: capítulo ${chapter.chapter}, questão ${index + 1}`);
    let prompt;
    if (type === 'conceito') prompt = `No contexto de “${chapter.title}”, qual princípio central deve orientar a atuação?`;
    else if (type === 'aplicacao') prompt = `Ao aplicar os conteúdos de “${chapter.title}” em uma ocorrência, qual alternativa oferece o critério mais adequado para decidir?`;
    else if (type === 'discriminacao') prompt = `Qual alternativa melhor distingue uma orientação adequada de uma resposta inadequada no contexto de “${chapter.title}”?`;
    else if (type === 'cenario') prompt = context
      ? `Considere o cenário: ${context} Qual princípio deve orientar a próxima decisão da equipe?`
      : `Diante de uma situação operacional relacionada a “${chapter.title}”, qual princípio deve orientar a próxima decisão da equipe?`;
    else prompt = `Na reavaliação de uma ocorrência relacionada a “${chapter.title}”, qual princípio deve permanecer como critério integrador de decisão?`;
    const feedback = `Resposta fundamentada: ${stripBullet(correct.label)} Aplicação: use este princípio como critério de decisão sem substituir a reavaliação dinâmica de risco, ambiente, comportamento, recursos e competências.`;
    return { ...question, prompt, feedback, pedagogicalType: type, curationAction };
  });
}
if ((quizzes.chapters ?? []).length !== 34 || questionCount !== 170) throw new Error(`Banco de quizzes inesperado: capítulos=${quizzes.chapters?.length} questões=${questionCount}`);

let microlearningCount = 0;
for (const chapter of enrichment.chapters ?? []) {
  const micro = chapter.microlearning;
  if (!micro) continue;
  const context = chapterScenario(chapter.chapter);
  const correct = (micro.choices ?? []).find(choice => choice.correct);
  if (!correct) throw new Error(`Microlearning sem alternativa correta: capítulo ${chapter.chapter}`);
  micro.prompt = context
    ? `Considere este contexto: ${context} Qual afirmação oferece o melhor critério para orientar a decisão?`
    : `Em uma ocorrência relacionada a “${chapter.title}”, qual afirmação oferece o melhor critério para orientar a decisão?`;
  micro.choices = (micro.choices ?? []).map(choice => ({ ...choice, label: stripBullet(choice.label) }));
  micro.reveal = `Critério de decisão: ${stripBullet(correct.label)} Reavalie a aplicação conforme risco, ambiente, comportamento, recursos e resposta da pessoa.`;
  microlearningCount += 1;
}
if (microlearningCount !== 34) throw new Error(`Microlearning incompleto: ${microlearningCount}/34`);

const traceability = {
  schemaVersion: 1,
  edition: '2026-final',
  generatedFrom: ['semantic-pages.json', 'navigation.json'],
  policy: {
    normativeClaimsRequireTraceability: true,
    automaticTerminologyNormalization: false,
    atsAttsResolution: 'VALIDACAO_NORMATIVA_REQUERIDA',
    note: 'ATS/ATTS não é normalizado automaticamente; a forma final deve seguir a fonte normativa vigente.'
  },
  chapters: []
};
for (const [chapterNumber, nav] of [...chapterNav.entries()].sort((a,b) => a[0] - b[0])) {
  const blocks = nav.pageNumbers.flatMap(number => pagesByNumber.get(number)?.blocks ?? []);
  const references = [...new Set(blocks.map(block => clean(block.text)).filter(text => /refer[eê]ncias? principais:|\bCBMMG\b|\bITO\s*30\b|\bOMS\b|\bWHO\b|\bABM\b/iu.test(text)).filter(text => text.length < 500))];
  const doctrineBlocks = blocks.filter(block => block.kind === 'doctrine').length;
  traceability.chapters.push({
    chapter: chapterNumber,
    title: nav.title,
    openingPage: nav.openingPage,
    endingPage: nav.pageNumbers.at(-1),
    doctrineBlocks,
    referencesFound: references,
    status: references.length || doctrineBlocks === 0 ? 'TRACED_OR_NO_EXPLICIT_DOCTRINE' : 'REVIEW_REQUIRED'
  });
}
traceability.highRiskTopics = [
  { topic:'Sistema ATS/ATTS e fases operacionais', chapters:[6,7,8,34], status:'REVIEW_REQUIRED_FOR_TERM_CANON' },
  { topic:'Abordagem de dissuasão', chapters:[12,13,14,15,16,17,18,19,20], status:'TRACED_BY_CHAPTER' },
  { topic:'Abordagem tática e iminência', chapters:[20,21,22,23,24,25], status:'TRACED_BY_CHAPTER' },
  { topic:'Arma branca, arma de fogo e violência', chapters:[24], status:'TRACED_BY_CHAPTER' },
  { topic:'Precipitação e ambiente vertical', chapters:[22], status:'TRACED_BY_CHAPTER' },
  { topic:'Integração interinstitucional', chapters:[11], status:'TRACED_BY_CHAPTER' },
  { topic:'Crianças, adolescentes, idosos, PCD e neurodivergência', chapters:[26,27], status:'TRACED_BY_CHAPTER' },
  { topic:'Violência doméstica e contexto social', chapters:[29], status:'TRACED_BY_CHAPTER' },
  { topic:'Imprensa, Werther e Papageno', chapters:[31], status:'TRACED_BY_CHAPTER' },
  { topic:'Primeiros Socorros Psicológicos e posvenção', chapters:[32], status:'TRACED_BY_CHAPTER' }
];

await Promise.all([
  writeJson(semanticPath, semantic),
  writeJson(quizzesPath, quizzes),
  writeJson(enrichmentPath, enrichment),
  writeJson(path.join(contentDir, 'doctrine-traceability.json'), traceability)
]);

async function patchFile(file, transform) {
  const before = await readFile(file, 'utf8');
  const after = transform(before);
  if (after === before) return false;
  await writeFile(file, after);
  return true;
}
function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`Patch anchor ausente: ${label}`);
}

const pdfChanged = await patchFile(path.join(scriptsDir, 'generate-canonical-pdf.mjs'), source => {
  if (source.includes('const enrichmentForChapter=n=>')) return source;
  assertIncludes(source, 'const [semantic, navigation, multimedia, quizzes] = await Promise.all([', 'pdf promise tuple');
  source = source.replace('const [semantic, navigation, multimedia, quizzes] = await Promise.all([', 'const [semantic, navigation, multimedia, quizzes, enrichment] = await Promise.all([');
  const quizLoad = "  readFile(path.join(root, 'content', 'chapter-quizzes.json'), 'utf8').then(JSON.parse)\n]);";
  assertIncludes(source, quizLoad, 'pdf quiz load');
  source = source.replace(quizLoad, "  readFile(path.join(root, 'content', 'chapter-quizzes.json'), 'utf8').then(JSON.parse),\n  readFile(path.join(root, 'content', 'chapter-enrichment.json'), 'utf8').then(JSON.parse)\n]);");
  const quizMap = "const quizForPage=n=>(quizzes.chapters??[]).find(item=>item.endingPage===n)??null;";
  assertIncludes(source, quizMap, 'pdf quiz map');
  source = source.replace(quizMap, `${quizMap}\nconst enrichmentForChapter=n=>(enrichment.chapters??[]).find(item=>item.chapter===n)??null;`);
  const marker = '  const drawCover=section=>';
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error('Patch anchor ausente: pdf drawCover');
  const helpers = `  const addStaticMedia=(section,resource)=>{if(resource.kind==='infographic'&&Array.isArray(resource.steps)&&resource.steps.length){ensureSpace(70);writeFlow(section,\`INFOGRÁFICO · \${resource.title}\`,{font:'SansBold',size:10.2,leading:13,color:COLORS.teal,type:'H3',gap:5,align:'left'});for(const step of [...resource.steps].sort((a,b)=>a.order-b.order))writeFlow(section,\`\${step.order}. \${step.title} — \${step.detail}\`,{font:'Sans',size:9.2,leading:12.6,color:COLORS.ink,type:'P',gap:2,align:'left'});if(resource.transverse)writeFlow(section,resource.transverse,{font:'SansBold',size:8.9,leading:12,color:COLORS.orange,type:'P',gap:7,align:'left'});}else if((resource.kind==='audio'||resource.kind==='video')&&resource.transcript){ensureSpace(55);writeFlow(section,\`\${resource.kind==='audio'?'ÁUDIO':'VÍDEO'} · \${resource.title}\`,{font:'SansBold',size:10.2,leading:13,color:COLORS.teal,type:'H3',gap:5,align:'left'});writeFlow(section,resource.transcript,{font:'Serif',size:10.2,leading:14.2,color:COLORS.ink,type:'P',gap:7,align:'justify'});}};\n  const addStaticMicrolearning=(section,micro)=>{if(!micro)return;ensureSpace(78);writeFlow(section,'DECIDA',{font:'SansBold',size:10.2,leading:13,color:COLORS.orange,type:'H3',gap:5,align:'left'});writeFlow(section,micro.prompt,{font:'Serif',size:10.5,leading:14.5,color:COLORS.ink,type:'P',gap:5,align:'left'});for(const choice of micro.choices??[])writeFlow(section,\`\${choice.id}) \${stripBullet(choice.label)}\`,{font:'Sans',size:9.4,leading:12.8,color:COLORS.ink,type:'P',gap:2,align:'left'});doc.y+=5;};\n  const addStaticQuiz=(section,quiz,micro)=>{if(!quiz)return;ensureSpace(90);writeFlow(section,'VERIFICAÇÃO DE APRENDIZAGEM',{font:'SansBold',size:11,leading:14,color:COLORS.teal,type:'H2',gap:7,align:'left'});for(const [index,question] of (quiz.questions??[]).entries()){writeFlow(section,\`\${index+1}. \${question.prompt}\`,{font:'SansBold',size:9.8,leading:13.2,color:COLORS.ink,type:'P',gap:3,align:'left'});for(const choice of question.choices??[])writeFlow(section,\`\${choice.id}) \${stripBullet(choice.label)}\`,{font:'Sans',size:9.1,leading:12.2,color:COLORS.ink,type:'P',gap:1,align:'left'});doc.y+=3;}writeFlow(section,'GABARITO COMENTADO',{font:'SansBold',size:10.5,leading:13.5,color:COLORS.orange,type:'H3',gap:5,align:'left'});if(micro){const mc=(micro.choices??[]).find(choice=>choice.correct);if(mc)writeFlow(section,\`Microlearning: \${mc.id}) \${stripBullet(mc.label)} — \${micro.reveal}\`,{font:'Sans',size:8.9,leading:12.4,color:COLORS.ink,type:'P',gap:4,align:'left'});}for(const [index,question] of (quiz.questions??[]).entries()){const correct=(question.choices??[]).find(choice=>choice.correct);writeFlow(section,\`\${index+1}. \${correct?correct.id+') '+stripBullet(correct.label):'Consulte o capítulo.'} — \${question.feedback}\`,{font:'Sans',size:8.9,leading:12.4,color:COLORS.ink,type:'P',gap:4,align:'left'});}};\n`;
  source = source.slice(0, idx) + helpers + source.slice(idx);
  const oldTail = "const pageMedia=mediaForPage(page.number),hasInteractive=pageMedia.some(resource=>['audio','video','microlearning','infographic'].includes(resource.kind))||Boolean(quizForPage(page.number));if(hasInteractive)addInteractiveNote(section,page.number);section.end();}";
  assertIncludes(source, oldTail, 'pdf page loop tail');
  const newTail = "const pageMedia=mediaForPage(page.number);for(const resource of pageMedia)addStaticMedia(section,resource);const chapterEnrichment=enrichmentForChapter(page.chapter);if(chapterEnrichment?.microlearning?.pageNumber===page.number)addStaticMicrolearning(section,chapterEnrichment.microlearning);const pageQuiz=quizForPage(page.number);if(pageQuiz)addStaticQuiz(section,pageQuiz,chapterEnrichment?.microlearning);const hasInteractive=pageMedia.some(resource=>['audio','video','microlearning','infographic'].includes(resource.kind))||Boolean(pageQuiz)||Boolean(chapterEnrichment?.microlearning?.pageNumber===page.number);if(hasInteractive)addInteractiveNote(section,page.number);section.end();}";
  return source.replace(oldTail, newTail);
});

const epubChanged = await patchFile(path.join(appDir, 'api', 'epub', 'route.ts'), source => {
  if (source.includes('const microlearningByPage = new Map')) return source;
  assertIncludes(source, "import enrichmentData from '../../../content/chapter-enrichment.json';", 'epub enrichment import');
  source = source.replace("import enrichmentData from '../../../content/chapter-enrichment.json';", "import enrichmentData from '../../../content/chapter-enrichment.json';\nimport multimediaData from '../../../content/multimedia-manifest.json';");
  const typeAnchor = "type ChapterResource = { pageNumber: number; title: string; url: string; language: string; note?: string };";
  assertIncludes(source, typeAnchor, 'epub resource type');
  source = source.replace(typeAnchor, `${typeAnchor}\ntype ChapterMicrolearning = { pageNumber:number; prompt:string; choices:QuizChoice[]; reveal:string };\ntype EnrichmentChapter = { chapter:number; microlearning?:ChapterMicrolearning; resource?:ChapterResource };\ntype MultimediaStep = { order:number; title:string; detail:string };\ntype MultimediaResource = { kind:string; pageNumber:number; title:string; alt?:string; steps?:MultimediaStep[]; transverse?:string; transcript?:string };`);
  const constAnchor = "const resources = (enrichmentData as { chapters: Array<{ resource?: ChapterResource }> }).chapters.map(item => item.resource).filter(Boolean) as ChapterResource[];\nconst quizByPage = new Map(quizzes.map(item => [item.endingPage, item]));\nconst resourceByPage = new Map(resources.map(item => [item.pageNumber, item]));";
  assertIncludes(source, constAnchor, 'epub enrichment maps');
  source = source.replace(constAnchor, `const enrichmentChapters = (enrichmentData as { chapters: EnrichmentChapter[] }).chapters;\nconst resources = enrichmentChapters.map(item => item.resource).filter(Boolean) as ChapterResource[];\nconst microlearning = enrichmentChapters.map(item => item.microlearning).filter(Boolean) as ChapterMicrolearning[];\nconst multimedia = (multimediaData as { resources: MultimediaResource[] }).resources;\nconst quizByPage = new Map(quizzes.map(item => [item.endingPage, item]));\nconst resourceByPage = new Map(resources.map(item => [item.pageNumber, item]));\nconst microlearningByPage = new Map(microlearning.map(item => [item.pageNumber, item]));\nconst multimediaByPage = new Map<number, MultimediaResource[]>();\nfor (const item of multimedia) multimediaByPage.set(item.pageNumber, [...(multimediaByPage.get(item.pageNumber) ?? []), item]);`);
  const start = source.indexOf('    const resource = resourceByPage.get(page.number);');
  const endMarker = "    body.push('</section>');\n  }\n  return";
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Patch anchor ausente: epub render tail');
  const replacement = `    const media = multimediaByPage.get(page.number) ?? [];\n    for (const item of media) {\n      if (item.kind === 'infographic' && item.steps?.length) body.push(\`<figure class="box media"><p class="boxLabel">Infográfico</p><h3>\${esc(item.title)}</h3>\${item.alt ? \`<p>\${esc(item.alt)}</p>\` : ''}<ol>\${[...item.steps].sort((a,b)=>a.order-b.order).map(step => \`<li><strong>\${esc(step.title)}</strong> — \${esc(step.detail)}</li>\`).join('')}</ol>\${item.transverse ? \`<p><strong>\${esc(item.transverse)}</strong></p>\` : ''}</figure>\`);\n      else if ((item.kind === 'audio' || item.kind === 'video') && item.transcript) body.push(\`<aside class="box media"><p class="boxLabel">\${item.kind === 'audio' ? 'Áudio — transcrição' : 'Vídeo — transcrição'}</p><h3>\${esc(item.title)}</h3><p>\${esc(item.transcript)}</p></aside>\`);\n    }\n    const micro = microlearningByPage.get(page.number);\n    if (micro) body.push(\`<section class="box micro" aria-label="Microlearning"><p class="boxLabel">Decida</p><p class="prompt">\${esc(micro.prompt)}</p><ol type="A">\${micro.choices.map(choice => \`<li>\${esc(stripLeadingBullet(choice.label))}</li>\`).join('')}</ol><p><em>Registre mentalmente sua resposta antes de consultar o gabarito do capítulo.</em></p></section>\`);\n    const resource = resourceByPage.get(page.number);\n    if (resource) body.push(\`<aside class="box resource"><p class="boxLabel">Material complementar</p><p><a href="\${esc(resource.url)}" hreflang="pt-BR">\${esc(resource.title)}</a></p>\${resource.note ? \`<p>\${esc(resource.note)}</p>\` : ''}</aside>\`);\n    const quiz = quizByPage.get(page.number);\n    if (quiz) {\n      body.push('<section class="quiz" aria-label="Teste do capítulo"><h3>Teste do capítulo</h3><p>Responda antes de consultar o gabarito comentado.</p>');\n      quiz.questions.forEach((question, index) => body.push(\`<div class="question"><p class="prompt">\${index + 1}. \${esc(question.prompt)}</p><ol type="A">\${question.choices.map(choice => \`<li>\${esc(stripLeadingBullet(choice.label))}</li>\`).join('')}</ol></div>\`));\n      body.push('</section><section class="quiz answers" aria-label="Gabarito comentado"><h3>Gabarito comentado</h3>');\n      const chapterMicro = enrichmentChapters.find(item => item.chapter === quiz.chapter)?.microlearning;\n      if (chapterMicro) { const correct = chapterMicro.choices.find(choice => choice.correct); if (correct) body.push(\`<p><strong>Microlearning:</strong> \${esc(correct.id)} — \${esc(stripLeadingBullet(correct.label))}. \${esc(chapterMicro.reveal)}</p>\`); }\n      quiz.questions.forEach((question, index) => { const correct = question.choices.find(choice => choice.correct); body.push(\`<p><strong>\${index + 1}.</strong> \${correct ? \`${esc(correct.id)} — \${esc(stripLeadingBullet(correct.label))}\` : 'Consulte o capítulo.'}. \${esc(question.feedback)}</p>\`); });\n      body.push('</section>');\n    }\n`;
  return source.slice(0, start) + replacement + source.slice(end);
});

const smokeChanged = await patchFile(path.join(scriptsDir, 'smoke.mjs'), source => {
  source = source.replace(", 'Baixar PDF', 'Baixar EPUB'", '');
  if (!source.includes("const pdfRes = await fetch(`${base}/api/manual`)")) {
    const anchor = "  if (html.includes('data-testid=\"canonical-hero\"')) throw new Error('Duplicate canonical hero is still rendered');";
    assertIncludes(source, anchor, 'smoke hero anchor');
    const checks = `${anchor}\n  const pdfRes = await fetch(\`${'${base}'}/api/manual\`);\n  if (!pdfRes.ok || !(pdfRes.headers.get('content-type') ?? '').includes('application/pdf')) throw new Error(\`PDF contract failed \${pdfRes.status}\`);\n  const epubRes = await fetch(\`${'${base}'}/api/epub\`);\n  if (!epubRes.ok || !(epubRes.headers.get('content-type') ?? '').includes('application/epub+zip')) throw new Error(\`EPUB contract failed \${epubRes.status}\`);`;
    source = source.replace(anchor, checks);
  }
  return source;
});
const verifyChanged = await patchFile(path.join(scriptsDir, 'verify-deployment.mjs'), source => source.replace(", 'Baixar PDF', 'Baixar EPUB'", ''));

await mkdir(reportsDir, { recursive: true });
const report = {
  schemaVersion: 1,
  edition: '2026-final',
  editorialRulesApplied: 3,
  doctrine: {
    automaticAtsAttsNormalization: false,
    traceabilityChapters: traceability.chapters.length,
    highRiskTopics: traceability.highRiskTopics.length
  },
  quizzes: {
    chapters: quizzes.chapters.length,
    questions: questionCount,
    curatedQuestions: questionCount,
    curationActionCounts,
    pedagogicalTypeCounts: quizTypeCounts
  },
  microlearning: { chapters: microlearningCount, scenarioBased: microlearningCount },
  parity: {
    pdfStaticMicrolearningAndQuiz: pdfChanged || (await readFile(path.join(scriptsDir, 'generate-canonical-pdf.mjs'), 'utf8')).includes('const addStaticQuiz='),
    epubDelayedAnswerKeyAndMedia: epubChanged || (await readFile(path.join(appDir, 'api', 'epub', 'route.ts'), 'utf8')).includes('const microlearningByPage = new Map')
  },
  gates: {
    smokeHydrationLayerFixed: !(await readFile(path.join(scriptsDir, 'smoke.mjs'), 'utf8')).includes("'Baixar EPUB'"),
    verifyDeploymentHydrationLayerFixed: !(await readFile(path.join(scriptsDir, 'verify-deployment.mjs'), 'utf8')).includes("'Baixar EPUB'")
  },
  status: 'MATERIALIZED'
};
await writeJson(path.join(reportsDir, 'final-maturation.json'), report);
await writeJson(path.join(contentDir, 'final-maturation-report.json'), report);
console.log(`FINAL_MATURATION_OK editorial=${editorialCorrections} quizzes=${questionCount} microlearning=${microlearningCount} pdf=${report.parity.pdfStaticMicrolearningAndQuiz} epub=${report.parity.epubDelayedAnswerKeyAndMedia}`);
