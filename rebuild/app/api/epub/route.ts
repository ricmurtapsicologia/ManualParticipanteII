import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import semanticData from '../../../content/semantic-pages.json';
import navigationData from '../../../content/navigation.json';
import quizData from '../../../content/chapter-quizzes.json';
import enrichmentData from '../../../content/chapter-enrichment.json';
import multimediaData from '../../../content/multimedia-manifest.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Block = { kind: string; text: string; url?: string; href?: string };
type ManualPage = { number: number; title: string; chapter?: number | null; part?: number | null; partTitle?: string; cover?: boolean; blocks: Block[] };
type QuizChoice = { id: string; label: string; correct: boolean };
type QuizQuestion = { prompt: string; choices: QuizChoice[]; feedback: string };
type QuizChapter = { chapter: number; endingPage: number; questions: QuizQuestion[] };
type ChapterResource = { pageNumber: number; title: string; url: string; language: string; note?: string };
type ChapterMicrolearning = { pageNumber:number; prompt:string; choices:QuizChoice[]; reveal:string };
type EnrichmentChapter = { chapter:number; microlearning?:ChapterMicrolearning; resource?:ChapterResource };
type MultimediaStep = { order:number; title:string; detail:string };
type MultimediaResource = { kind:string; pageNumber:number; title:string; alt?:string; steps?:MultimediaStep[]; transverse?:string; transcript?:string };
type NavChapter = { chapter: number; title: string; openingPage: number; pageNumbers: number[] };
type NavSupplement = { id: string; title: string; openingPage: number; pageNumbers: number[] };
type NavPart = { part: number; title: string; openingPage: number; chapters: NavChapter[]; supplementarySections: NavSupplement[] };
type NavigationArtifact = { frontMatter: NavSupplement[]; parts: NavPart[] };

const COVER_SHA256 = 'f875ce298711604d1fce6aa3dec4acb67e37396ab754e0ab8b276c0686edbf9f';
const pages = (semanticData as { pages: ManualPage[] }).pages;
const navigation = navigationData as NavigationArtifact;
const quizzes = (quizData as { chapters: QuizChapter[] }).chapters;
const enrichmentChapters = (enrichmentData as { chapters: EnrichmentChapter[] }).chapters;
const resources = enrichmentChapters.map(item => item.resource).filter(Boolean) as ChapterResource[];
const microlearning = enrichmentChapters.map(item => item.microlearning).filter(Boolean) as ChapterMicrolearning[];
const multimedia = (multimediaData as { resources: MultimediaResource[] }).resources;
const quizByPage = new Map(quizzes.map(item => [item.endingPage, item]));
const resourceByPage = new Map(resources.map(item => [item.pageNumber, item]));
const microlearningByPage = new Map(microlearning.map(item => [item.pageNumber, item]));
const multimediaByPage = new Map<number, MultimediaResource[]>();
for (const item of multimedia) multimediaByPage.set(item.pageNumber, [...(multimediaByPage.get(item.pageNumber) ?? []), item]);

const esc = (value: string) => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const normalize = (value: string) => String(value ?? '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const stripLeadingBullet = (value: string) => String(value ?? '').replace(/^\s*[•▪◦‣·–—-]\s*/, '').trim();

const pedagogicalLabels: Record<string, string> = {
  opening: 'Situação de abertura', objectives: 'Objetivos do capítulo', doctrine: 'Doutrina', evidence: 'Evidência',
  practice: 'Na prática', attention: 'Atenção', decide: 'Decida', summary: 'Resumo do capítulo', review: 'Questões de revisão',
  'guided-analysis': 'Análise orientadora'
};

const chapterStarts = new Map<number, ManualPage>();
for (const page of pages) if (page.chapter && !chapterStarts.has(page.chapter)) chapterStarts.set(page.chapter, page);

function pageHref(pageNumber: number) {
  return pageNumber === 1 ? 'cover.xhtml#page-1' : `manual.xhtml#page-${pageNumber}`;
}

function renderManual() {
  const body: string[] = [];
  for (const page of pages) {
    if (page.number === 1 || page.cover) continue;
    const chapterOpening = Boolean(page.chapter && chapterStarts.get(page.chapter)?.number === page.number);
    const type = chapterOpening ? 'chapter' : page.chapter ? 'bodymatter' : 'frontmatter';
    body.push(`<section class="page${chapterOpening ? ' chapter' : ''}" epub:type="${type}" aria-label="Página ${page.number}">`);
    body.push(`<span id="page-${page.number}" epub:type="pagebreak" role="doc-pagebreak" aria-label="Página ${page.number}"></span>`);
    if (chapterOpening && page.chapter) body.push(`<p class="kicker">CAPÍTULO ${page.chapter}</p><h1>${esc(page.title)}</h1>`);
    else if (page.title) body.push(`<h2>${esc(page.title)}</h2>`);

    const blocks = page.blocks ?? [];
    for (let i = 0; i < blocks.length;) {
      const block = blocks[i];
      const raw = String(block.text ?? '').trim();
      if (!raw) { i += 1; continue; }
      if (block.kind === 'list-item') {
        const items: string[] = [];
        while (i < blocks.length && blocks[i].kind === 'list-item') {
          const item = stripLeadingBullet(blocks[i].text);
          if (item) items.push(item);
          i += 1;
        }
        if (items.length) body.push(`<ul class="list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`);
        continue;
      }
      const text = esc(raw);
      if (block.kind === 'heading') body.push(`<h3>${text}</h3>`);
      else if (pedagogicalLabels[block.kind]) {
        const label = pedagogicalLabels[block.kind];
        const redundant = normalize(raw) === normalize(label);
        body.push(`<aside class="box ${esc(block.kind)}"><p class="boxLabel">${esc(label)}</p>${redundant ? '' : `<p>${text}</p>`}</aside>`);
      } else if ((block.kind === 'external-link' || block.kind === 'external-resource') && (block.url || block.href)) {
        body.push(`<p class="external"><a href="${esc(block.url || block.href || '')}">${text}</a></p>`);
      } else if (block.kind === 'reference') body.push(`<p class="reference">${text}</p>`);
      else body.push(`<p>${text}</p>`);
      i += 1;
    }

    const media = multimediaByPage.get(page.number) ?? [];
    for (const item of media) {
      if (item.kind === 'infographic' && item.steps?.length) body.push(`<figure class="box media"><p class="boxLabel">Infográfico</p><h3>${esc(item.title)}</h3>${item.alt ? `<p>${esc(item.alt)}</p>` : ''}<ol>${[...item.steps].sort((a,b)=>a.order-b.order).map(step => `<li><strong>${esc(step.title)}</strong> — ${esc(step.detail)}</li>`).join('')}</ol>${item.transverse ? `<p><strong>${esc(item.transverse)}</strong></p>` : ''}</figure>`);
      else if ((item.kind === 'audio' || item.kind === 'video') && item.transcript) body.push(`<aside class="box media"><p class="boxLabel">${item.kind === 'audio' ? 'Áudio — transcrição' : 'Vídeo — transcrição'}</p><h3>${esc(item.title)}</h3><p>${esc(item.transcript)}</p></aside>`);
    }
    const micro = microlearningByPage.get(page.number);
    if (micro) body.push(`<section class="box micro" aria-label="Microlearning"><p class="boxLabel">Decida</p><p class="prompt">${esc(micro.prompt)}</p><ol type="A">${micro.choices.map(choice => `<li>${esc(stripLeadingBullet(choice.label))}</li>`).join('')}</ol><p><em>Registre mentalmente sua resposta antes de consultar o gabarito do capítulo.</em></p></section>`);
    const resource = resourceByPage.get(page.number);
    if (resource) body.push(`<aside class="box resource"><p class="boxLabel">Material complementar</p><p><a href="${esc(resource.url)}" hreflang="pt-BR">${esc(resource.title)}</a></p>${resource.note ? `<p>${esc(resource.note)}</p>` : ''}</aside>`);
    const quiz = quizByPage.get(page.number);
    if (quiz) {
      body.push('<section class="quiz" aria-label="Teste do capítulo"><h3>Teste do capítulo</h3><p>Responda antes de consultar o gabarito comentado.</p>');
      quiz.questions.forEach((question, index) => body.push(`<div class="question"><p class="prompt">${index + 1}. ${esc(question.prompt)}</p><ol type="A">${question.choices.map(choice => `<li>${esc(stripLeadingBullet(choice.label))}</li>`).join('')}</ol></div>`));
      body.push('</section><section class="quiz answers" aria-label="Gabarito comentado"><h3>Gabarito comentado</h3>');
      const chapterMicro = enrichmentChapters.find(item => item.chapter === quiz.chapter)?.microlearning;
      if (chapterMicro) { const correct = chapterMicro.choices.find(choice => choice.correct); if (correct) body.push(`<p><strong>Microlearning:</strong> ${esc(correct.id)} — ${esc(stripLeadingBullet(correct.label))}. ${esc(chapterMicro.reveal)}</p>`); }
      quiz.questions.forEach((question, index) => { const correct = question.choices.find(choice => choice.correct); body.push(`<p><strong>${index + 1}.</strong> ${correct ? `${esc(correct.id)} — ${esc(stripLeadingBullet(correct.label))}` : 'Consulte o capítulo.'}. ${esc(question.feedback)}</p>`); });
      body.push('</section>');
    }
    body.push('</section>');
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR" lang="pt-BR"><head><meta charset="utf-8"/><title>Manual do Participante CATS — conteúdo</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body epub:type="bodymatter">${body.join('')}</body></html>`;
}

const frontNav = navigation.frontMatter.map(section => `<li><a href="${pageHref(section.openingPage)}">${esc(section.title)}</a></li>`).join('');
const partsNav = navigation.parts.map(part => {
  const chapters = part.chapters.map(chapter => `<li><a href="${pageHref(chapter.openingPage)}">Capítulo ${chapter.chapter} — ${esc(chapter.title)}</a></li>`).join('');
  const supplements = part.supplementarySections.map(section => `<li><a href="${pageHref(section.openingPage)}">${esc(section.title)}</a></li>`).join('');
  return `<li><a href="${pageHref(part.openingPage)}">Parte ${part.part} — ${esc(part.title)}</a><ol>${chapters}${supplements}</ol></li>`;
}).join('');
const pageList = pages.map(page => `<li><a href="${pageHref(page.number)}">${page.number}</a></li>`).join('');
const nav = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR" lang="pt-BR"><head><meta charset="utf-8"/><title>Sumário</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><nav epub:type="toc" id="toc" aria-label="Sumário"><h1>Sumário</h1><ol><li><a href="cover.xhtml#page-1">Capa</a></li>${frontNav}${partsNav}</ol></nav><nav epub:type="page-list" id="page-list" aria-label="Navegação por páginas" hidden="hidden"><h2>Páginas</h2><ol>${pageList}</ol></nav><nav epub:type="landmarks" id="landmarks" aria-label="Marcos da publicação" hidden="hidden"><h2>Marcos</h2><ol><li><a epub:type="cover" href="cover.xhtml#page-1">Capa</a></li><li><a epub:type="bodymatter" href="manual.xhtml#page-2">Conteúdo principal</a></li></ol></nav></body></html>`;

function renderCoverSvg(image: Buffer) {
  const encoded = image.toString('base64');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1087 1536" width="1087" height="1536" role="img" aria-labelledby="cover-title cover-desc"><title id="cover-title">Capa oficial do Manual do Participante CATS</title><desc id="cover-desc">Atendimento a Tentativas de Suicídio. Escuta, Técnica, Segurança e Humanidade. Corpo de Bombeiros Militar de Minas Gerais. GTO ATS. CATS. Edição Digital 2026.</desc><image href="data:image/jpeg;base64,${encoded}" xlink:href="data:image/jpeg;base64,${encoded}" x="0" y="0" width="1087" height="1536" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR" lang="pt-BR"><head><meta charset="utf-8"/><title>Capa</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body class="coverPage" epub:type="cover"><span id="page-1" epub:type="pagebreak" role="doc-pagebreak" aria-label="Página 1"></span><img src="cover.svg" alt="Capa oficial do Manual do Participante CATS — Atendimento a Tentativas de Suicídio — Edição Digital 2026"/></body></html>`;

const css = `html{font-size:100%;}body{font-family:Georgia,"Times New Roman",serif;font-size:1em;line-height:1.62;color:#183537;background:#fff;margin:0 auto;padding:1.25em;max-width:42em;}h1,h2,h3{font-family:Arial,Helvetica,sans-serif;color:#0f6260;line-height:1.25;break-after:avoid;page-break-after:avoid;}h1{border-bottom:.18em solid #e86d2b;padding-bottom:.35em;margin-top:1.4em;}h2{margin-top:1.5em;}h3{margin-top:1.25em;}p{margin:.7em 0;text-align:justify;hyphens:auto;-webkit-hyphens:auto;orphans:2;widows:2;}.kicker{font-family:Arial,Helvetica,sans-serif;color:#b64f17;font-weight:bold;letter-spacing:.08em;text-align:left}.page{margin:0 0 1.5em}.page.chapter{break-before:page;page-break-before:always}.list{margin:.65em 0 .85em;padding-left:1.45em}.list li{margin:.35em 0;text-align:left}.box{border-left:.28em solid #0f6260;background:#eef6f4;padding:.75em 1em;margin:1em 0;break-inside:avoid;page-break-inside:avoid}.attention,.decide{border-left-color:#c65a1c;background:#fff2ec}.boxLabel{font-family:Arial,Helvetica,sans-serif;font-size:.88em;font-weight:bold;letter-spacing:.03em;text-transform:uppercase;text-align:left;margin:0 0 .35em}.boxLabel:only-child{margin-bottom:0}.reference{padding-left:1.5em;text-indent:-1.5em;text-align:left;font-size:.94em;margin:.8em 0;break-inside:avoid;page-break-inside:avoid;hyphens:none;-webkit-hyphens:none;word-break:normal;overflow-wrap:normal;orphans:3;widows:3}.external{overflow-wrap:anywhere}.resource a,a{color:#0b5f5b;text-decoration:underline;text-underline-offset:.12em;overflow-wrap:anywhere}.quiz{margin-top:2em;border-top:.14em solid #e86d2b;padding-top:1em}.question{margin:1.2em 0;break-inside:avoid}.prompt{font-weight:bold;text-align:left}.answer{margin-top:.5em;color:#0f6260}.coverPage{margin:0;padding:0;max-width:none;background:#f5f0e6}.coverPage img{display:block;width:100%;height:auto;max-width:100%}[epub\\:type="pagebreak"]{display:block;height:0;overflow:hidden}@media(prefers-color-scheme:dark){body{background:#111;color:#f0f1ed}h1,h2,h3,a,.answer{color:#86d9d2}.box{background:#183130;color:#f0f1ed}.attention,.decide{background:#3a281f}}`;
const identifier = 'urn:uuid:6f8a7f60-3e64-4cb0-8ae7-9c1e6fd3a226';
const opf = `<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="pt-BR" prefix="schema: http://schema.org/"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub-id">${identifier}</dc:identifier><dc:title>Manual do Participante CATS</dc:title><dc:language>pt-BR</dc:language><dc:creator>Corpo de Bombeiros Militar de Minas Gerais</dc:creator><dc:publisher>Corpo de Bombeiros Militar de Minas Gerais</dc:publisher><dc:description>Manual de formação especializada em Atendimento a Tentativas de Suicídio — edição digital 2026.</dc:description><dc:date>2026</dc:date><dc:rights>Corpo de Bombeiros Militar de Minas Gerais — edição 2026.</dc:rights><meta property="dcterms:modified">2026-09-16T00:00:00Z</meta><meta property="rendition:layout">reflowable</meta><meta property="schema:accessMode">textual</meta><meta property="schema:accessModeSufficient">textual</meta><meta property="schema:accessibilityFeature">tableOfContents</meta><meta property="schema:accessibilityFeature">structuralNavigation</meta><meta property="schema:accessibilityFeature">pageNavigation</meta><meta property="schema:accessibilityFeature">pageBreakMarkers</meta><meta property="schema:accessibilityFeature">displayTransformability</meta><meta property="schema:accessibilityHazard">none</meta><meta property="schema:accessibilitySummary" xml:lang="pt-BR">Publicação reflowable em português do Brasil, com estrutura semântica, listas reais, sumário hierárquico, navegação por páginas e texto adaptável. A capa oficial possui alternativa textual.</meta></metadata><manifest><item id="cover-image" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="manual" href="manual.xhtml" media-type="application/xhtml+xml"/><item id="css" href="styles.css" media-type="text/css"/></manifest><spine page-progression-direction="ltr"><itemref idref="cover"/><itemref idref="manual"/></spine></package>`;
const containerXml = `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function dosStamp() { return { time: 0, date: ((2026 - 1980) << 9) | (9 << 5) | 16 }; }
function zipStore(entries: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = []; const centrals: Buffer[] = []; let offset = 0;
  const stamp = dosStamp();
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8'); const data = entry.data; const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8);
    local.writeUInt16LE(stamp.time, 10); local.writeUInt16LE(stamp.date, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8); central.writeUInt16LE(0, 10);
    central.writeUInt16LE(stamp.time, 12); central.writeUInt16LE(stamp.date, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); central.writeUInt16LE(0, 32); central.writeUInt16LE(0, 34); central.writeUInt16LE(0, 36); central.writeUInt32LE(0, 38); central.writeUInt32LE(offset, 42);
    centrals.push(central, name); offset += local.length + name.length + data.length;
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, ...centrals, end]);
}

export async function GET() {
  const coverImage = await readFile(path.join(process.cwd(), 'public', 'assets', 'manual-cats', '2026', 'manual-cats-capa-ebook-2026.jpg'));
  const hash = createHash('sha256').update(coverImage).digest('hex');
  if (hash !== COVER_SHA256) throw new Error(`EPUB_COVER_HASH_MISMATCH ${hash}`);
  const coverSvg = renderCoverSvg(coverImage);
  const entries = [
    { name: 'mimetype', data: Buffer.from('application/epub+zip', 'utf8') },
    { name: 'META-INF/container.xml', data: Buffer.from(containerXml, 'utf8') },
    { name: 'OEBPS/cover.svg', data: Buffer.from(coverSvg, 'utf8') },
    { name: 'OEBPS/cover.xhtml', data: Buffer.from(coverXhtml, 'utf8') },
    { name: 'OEBPS/nav.xhtml', data: Buffer.from(nav, 'utf8') },
    { name: 'OEBPS/manual.xhtml', data: Buffer.from(renderManual(), 'utf8') },
    { name: 'OEBPS/styles.css', data: Buffer.from(css, 'utf8') },
    { name: 'OEBPS/content.opf', data: Buffer.from(opf, 'utf8') }
  ];
  const epub = zipStore(entries);
  return new Response(new Uint8Array(epub), { headers: {
    'Content-Type': 'application/epub+zip',
    'Content-Disposition': 'attachment; filename="Manual-do-Participante-CATS-Edicao-Digital-2026.epub"',
    'Content-Length': String(epub.length),
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=60',
    'X-Content-Type-Options': 'nosniff',
    'X-CATS-EPUB-Edition': 'epub3.3-reflowable-2026',
    'X-CATS-EPUB-Accessibility': 'semantic-navigation-page-list-pt-BR',
    'X-CATS-EPUB-Cover-SHA256': COVER_SHA256
  } });
}
