import semanticData from '../../../content/semantic-pages.json';
import { approvedCoverDataUrl } from '../../cover-data';
import quizData from '../../../content/chapter-quizzes.json';
import enrichmentData from '../../../content/chapter-enrichment.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Block = { kind: string; text: string };
type ManualPage = { number: number; title: string; chapter?: number | null; part?: number | null; partTitle?: string; blocks: Block[] };
type QuizChoice = { id: string; label: string; correct: boolean };
type QuizQuestion = { prompt: string; choices: QuizChoice[]; feedback: string };
type QuizChapter = { chapter: number; endingPage: number; questions: QuizQuestion[] };
type ChapterResource = { pageNumber: number; title: string; url: string; language: string; note?: string };
const pages = (semanticData as { pages: ManualPage[] }).pages;
const coverBase64 = approvedCoverDataUrl.replace(/^data:image\/webp;base64,/, '');
const quizzes = (quizData as { chapters: QuizChapter[] }).chapters;
const resources = (enrichmentData as { chapters: Array<{ resource?: ChapterResource }> }).chapters.map(item => item.resource).filter(Boolean) as ChapterResource[];
const quizByPage = new Map(quizzes.map(item => [item.endingPage, item]));
const resourceByPage = new Map(resources.map(item => [item.pageNumber, item]));

const esc = (value: string) => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const chapterStarts = new Map<number, ManualPage>();
for (const page of pages) if (page.chapter && !chapterStarts.has(page.chapter)) chapterStarts.set(page.chapter, page);
const chapters = [...chapterStarts.entries()].sort((a, b) => a[0] - b[0]);

function renderManual() {
  let previousChapter: number | null = null;
  const body: string[] = [];
  for (const page of pages) {
    if (page.chapter && page.chapter !== previousChapter) {
      body.push(`<section class="chapter" id="chapter-${page.chapter}"><p class="kicker">CAPÍTULO ${page.chapter}</p><h1>${esc(page.title)}</h1>`);
      previousChapter = page.chapter;
    } else if (page.chapter) {
      body.push('<section class="page">');
      if (page.title) body.push(`<h2>${esc(page.title)}</h2>`);
    } else {
      body.push('<section class="page front">');
      if (page.title) body.push(`<h2>${esc(page.title)}</h2>`);
    }
    for (const block of page.blocks ?? []) {
      const text = esc(block.text);
      if (!text) continue;
      if (block.kind === 'heading') body.push(`<h3>${text}</h3>`);
      else if (block.kind === 'list-item') body.push(`<p class="list">• ${text}</p>`);
      else if (['opening','objectives','doctrine','evidence','practice','attention','decide','summary','review'].includes(block.kind)) body.push(`<aside class="box ${esc(block.kind)}"><strong>${esc(block.kind.toUpperCase())}</strong><p>${text}</p></aside>`);
      else if (block.kind === 'external-link') body.push(`<p>${text}</p>`);
      else body.push(`<p>${text}</p>`);
    }
    const resource = resourceByPage.get(page.number);
    if (resource) body.push(`<aside class="box resource"><strong>Material complementar</strong><p><a href="${esc(resource.url)}" hreflang="pt-BR">${esc(resource.title)}</a></p>${resource.note ? `<p>${esc(resource.note)}</p>` : ''}</aside>`);
    const quiz = quizByPage.get(page.number);
    if (quiz) {
      body.push('<section class="quiz"><h3>Teste do capítulo</h3>');
      quiz.questions.forEach((question, index) => {
        const correct = question.choices.find(choice => choice.correct);
        body.push(`<div class="question"><p class="prompt">${index + 1}. ${esc(question.prompt)}</p><ol type="A">${question.choices.map(choice => `<li>${esc(choice.label)}</li>`).join('')}</ol><p class="answer"><strong>Resposta:</strong> ${correct ? esc(correct.label) : 'Consulte o capítulo.'}</p><p>${esc(question.feedback)}</p></div>`);
      });
      body.push('</section>');
    }
    body.push('</section>');
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR" lang="pt-BR"><head><meta charset="utf-8"/><title>Manual do Participante CATS</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body>${body.join('')}</body></html>`;
}

const navItems = chapters.map(([chapter, page]) => `<li><a href="manual.xhtml#chapter-${chapter}">Capítulo ${chapter} — ${esc(page.title)}</a></li>`).join('');
const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR" lang="pt-BR"><head><meta charset="utf-8"/><title>Sumário</title></head><body><nav epub:type="toc" id="toc"><h1>Sumário</h1><ol>${navItems}</ol></nav></body></html>`;

const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR" lang="pt-BR"><head><meta charset="utf-8"/><title>Capa</title><style>html,body{margin:0;padding:0;background:#061f21}img{display:block;width:100%;height:auto}</style></head><body><img src="cover.webp" alt="Capa oficial do Manual do Participante CATS"/></body></html>`;

const css = `body{font-family:serif;line-height:1.5;color:#183537;margin:5%;}h1,h2,h3{font-family:sans-serif;color:#0f6260;}h1{page-break-before:always;border-bottom:3px solid #e86d2b;padding-bottom:.35em}.kicker{font-family:sans-serif;color:#e86d2b;font-weight:bold;letter-spacing:.08em}.page p,.chapter p{text-align:justify}.list{text-indent:0}.box{border-left:4px solid #0f6260;background:#eef6f4;padding:.7em 1em;margin:1em 0}.attention,.decide{border-left-color:#e86d2b;background:#fff2ec}.box strong{font-family:sans-serif;font-size:.8em;letter-spacing:.06em}.resource a{color:#0f6260}.quiz{margin-top:2em;border-top:2px solid #e86d2b;padding-top:1em}.question{margin:1.2em 0}.prompt{font-weight:400}.answer{margin-top:.5em;color:#0f6260}`;
const identifier = 'urn:uuid:manual-cats-2026-canonical';
const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="pt-BR"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub-id">${identifier}</dc:identifier><dc:title>Manual do Participante CATS</dc:title><dc:language>pt-BR</dc:language><dc:creator>Corpo de Bombeiros Militar de Minas Gerais</dc:creator><dc:date>2026</dc:date><meta property="dcterms:modified">2026-09-14T00:00:00Z</meta></metadata><manifest><item id="cover-image" href="cover.webp" media-type="image/webp" properties="cover-image"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="manual" href="manual.xhtml" media-type="application/xhtml+xml"/><item id="css" href="styles.css" media-type="text/css"/></manifest><spine><itemref idref="cover"/><itemref idref="manual"/></spine></package>`;
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
function dosStamp() { return { time: 0, date: ((2026 - 1980) << 9) | (9 << 5) | 14 }; }
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
  const entries = [
    { name: 'mimetype', data: Buffer.from('application/epub+zip', 'utf8') },
    { name: 'META-INF/container.xml', data: Buffer.from(containerXml, 'utf8') },
    { name: 'OEBPS/cover.webp', data: Buffer.from(coverBase64, 'base64') },
    { name: 'OEBPS/cover.xhtml', data: Buffer.from(coverXhtml, 'utf8') },
    { name: 'OEBPS/nav.xhtml', data: Buffer.from(nav, 'utf8') },
    { name: 'OEBPS/manual.xhtml', data: Buffer.from(renderManual(), 'utf8') },
    { name: 'OEBPS/styles.css', data: Buffer.from(css, 'utf8') },
    { name: 'OEBPS/content.opf', data: Buffer.from(opf, 'utf8') }
  ];
  const epub = zipStore(entries);
  return new Response(new Uint8Array(epub), { headers: {
    'Content-Type': 'application/epub+zip',
    'Content-Disposition': 'attachment; filename="Manual-do-Participante-CATS-2026.epub"',
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=60',
    'X-Content-Type-Options': 'nosniff',
    'X-CATS-EPUB-Edition': 'publication-grade-epub3-2026'
  } });
}
