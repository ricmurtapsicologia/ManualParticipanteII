import semanticData from '../../../content/semantic-pages.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Block = { kind: string; text: string };
type SourcePage = { number: number; title: string; cover?: boolean; part?: number | null; partTitle?: string; chapter?: number | null; blocks: Block[] };
type Font = 'F1' | 'F2' | 'F3' | 'F4';
type FigureKind = 'psp' | 'risk' | 'network' | 'communication' | 'crisis' | 'continuity';
type ParagraphItem = { kind: 'paragraph'; lines: string[]; font: Font; size: number; leading: number; color: string; indent?: number; justify?: boolean; maxWidth?: number };
type HeadingItem = { kind: 'heading'; text: string; level: 1 | 2 | 3; color?: string };
type KickerItem = { kind: 'kicker'; text: string; color?: string };
type CalloutItem = { kind: 'callout'; label: string; lines: string[]; tone: 'teal' | 'orange' | 'blue'; height: number };
type FigureItem = { kind: 'figure'; figure: FigureKind; title: string; height: number };
type SpacerItem = { kind: 'spacer'; height: number };
type RuleItem = { kind: 'rule'; height: number };
type Item = ParagraphItem | HeadingItem | KickerItem | CalloutItem | FigureItem | SpacerItem | RuleItem;
type LayoutPage = { items: Item[]; sourcePage?: number; title?: string; chapter?: number | null; part?: number | null; partTitle?: string; cover?: boolean; divider?: boolean; front?: boolean };

const sourcePages = (semanticData as { pages: SourcePage[] }).pages;
const A4 = { w: 595.28, h: 841.89 };
const MARGIN_X = 54;
const CONTENT_W = A4.w - (MARGIN_X * 2);
const TOP_Y = 764;
const BOTTOM_Y = 72;
const FLOW_H = TOP_Y - BOTTOM_Y;
const C = {
  navy: '0.015 0.105 0.115',
  deep: '0.025 0.185 0.195',
  teal: '0.055 0.315 0.305',
  aqua: '0.455 0.815 0.785',
  orange: '0.965 0.345 0.020',
  ink: '0.105 0.145 0.145',
  muted: '0.365 0.430 0.415',
  line: '0.840 0.865 0.850',
  paper: '0.985 0.982 0.965',
  paleTeal: '0.925 0.960 0.950',
  paleOrange: '0.995 0.950 0.915',
  paleBlue: '0.930 0.955 0.970',
  white: '0.985 0.985 0.970'
};

function latin(value: string) {
  return String(value ?? '')
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, '-')
    .replace(/…/g, '...').replace(/[•◆◇◎◐↯↳↻▶§→]/g, '-')
    .replace(/[^\x00-\xFF]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function normalize(value: string) {
  return latin(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function hex(value: string) { return `<${Buffer.from(latin(value), 'latin1').toString('hex').toUpperCase()}>`; }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function fontFactor(font: Font) { return font === 'F3' || font === 'F4' ? 0.96 : 1; }
function textWidth(value: string, size: number, font: Font) {
  let units = 0;
  for (const ch of latin(value)) {
    if (ch === ' ') units += 0.27;
    else if (/[MW@%]/.test(ch)) units += 0.82;
    else if (/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(ch)) units += 0.62;
    else if (/[ilI1.,:;!'`]/.test(ch)) units += 0.25;
    else if (/[mw]/.test(ch)) units += 0.72;
    else if (/[0-9]/.test(ch)) units += 0.51;
    else units += 0.47;
  }
  return units * size * fontFactor(font);
}
function wrapWidth(value: string, maxWidth: number, size: number, font: Font) {
  const words = latin(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (!line || textWidth(next, size, font) <= maxWidth) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
function itemHeight(item: Item) {
  if (item.kind === 'paragraph') return item.lines.length * item.leading + 7;
  if (item.kind === 'heading') return item.level === 1 ? 54 : item.level === 2 ? 34 : 25;
  if (item.kind === 'kicker') return 20;
  if (item.kind === 'callout' || item.kind === 'figure' || item.kind === 'spacer' || item.kind === 'rule') return item.height;
  return 0;
}
function markerTone(kind: string): CalloutItem['tone'] {
  if (['attention', 'decide', 'safety', 'warning'].includes(kind)) return 'orange';
  if (['evidence', 'doctrine', 'reference'].includes(kind)) return 'blue';
  return 'teal';
}
function markerLabel(kind: string) {
  const labels: Record<string, string> = {
    opening: 'ABERTURA', objectives: 'OBJETIVOS', doctrine: 'REFERÊNCIA TÉCNICA', evidence: 'EVIDÊNCIA', practice: 'NA PRÁTICA',
    attention: 'ATENÇÃO', decide: 'DECISÃO', case: 'CASO', 'guided-analysis': 'ANÁLISE ORIENTADA', summary: 'SÍNTESE', review: 'REVISÃO',
    resource: 'MATERIAL COMPLEMENTAR', 'external-link': 'MATERIAL COMPLEMENTAR'
  };
  return labels[kind] ?? latin(kind).toUpperCase();
}
function selectFigure(page: SourcePage): FigureKind | null {
  const text = normalize(`${page.title} ${page.blocks.slice(0, 8).map(block => block.text).join(' ')}`);
  if (/primeiros socorros psicolog|\bpsp\b/.test(text)) return 'psp';
  if (/avaliacao de risco|avaliar risco|seguranca operacional|tomada de decisao/.test(text)) return 'risk';
  if (/rede de atencao|rede de cuidado|encaminhamento|articulacao em rede/.test(text)) return 'network';
  if (/comunicacao|escuta ativa|vinculo|rapport/.test(text)) return 'communication';
  if (/crise suicida|comportamento suicida|ideacao suicida/.test(text)) return 'crisis';
  if (/posvencao|continuidade do cuidado|seguimento|follow-up/.test(text)) return 'continuity';
  return null;
}
function figureTitle(kind: FigureKind) {
  const titles: Record<FigureKind, string> = {
    psp: 'Primeiros Socorros Psicológicos: sequência operacional',
    risk: 'Avaliação de risco: observar, avaliar, proteger',
    network: 'Cuidado em rede: conexão entre pessoa, equipe e serviços',
    communication: 'Comunicação em crise: escuta, vínculo e clareza',
    crisis: 'Crise suicida: do reconhecimento à proteção',
    continuity: 'Continuidade do cuidado: acolher, conectar e acompanhar'
  };
  return titles[kind];
}
function chapterStarts() {
  const map = new Map<number, SourcePage>();
  for (const page of sourcePages) if (page.chapter && !map.has(page.chapter)) map.set(page.chapter, page);
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function buildLayout() {
  const out: LayoutPage[] = [];
  let current: LayoutPage | null = null;
  let used = 0;
  const start = (meta: Partial<LayoutPage> = {}) => { current = { items: [], ...meta }; used = 0; out.push(current); return current; };
  const ensure = (height: number, meta: Partial<LayoutPage>) => {
    if (!current || used + height > FLOW_H) start(meta);
    return current!;
  };
  const add = (item: Item, meta: Partial<LayoutPage>) => { ensure(itemHeight(item), meta).items.push(item); used += itemHeight(item); };
  const addParagraph = (text: string, meta: Partial<LayoutPage>, opts: Partial<ParagraphItem> = {}) => {
    const font = opts.font ?? 'F3'; const size = opts.size ?? 10.4; const leading = opts.leading ?? 15.2; const indent = opts.indent ?? 0;
    const maxWidth = opts.maxWidth ?? (CONTENT_W - indent);
    const lines = wrapWidth(text, maxWidth, size, font);
    let cursor = 0;
    while (cursor < lines.length) {
      const available = Math.max(1, Math.floor((FLOW_H - used - 7) / leading));
      if (!current || available < 2) { start(meta); continue; }
      const chunk = lines.slice(cursor, cursor + available);
      const item: ParagraphItem = { kind: 'paragraph', lines: chunk, font, size, leading, color: opts.color ?? C.ink, indent, justify: opts.justify ?? true, maxWidth };
      current.items.push(item); used += itemHeight(item); cursor += chunk.length;
      if (cursor < lines.length) start(meta);
    }
  };

  start({ cover: true, front: true, title: 'Manual do Participante CATS' });

  start({ front: true, title: 'Sobre esta edição' });
  add({ kind: 'kicker', text: 'EDIÇÃO DIGITAL 2026', color: C.orange }, {});
  add({ kind: 'heading', text: 'Manual do Participante CATS', level: 1 }, {});
  addParagraph('Atendimento a Tentativas de Suicídio. Edição preparada para leitura contínua em tela e impressão, com hierarquia editorial, texto justificado, navegação por capítulos e recursos visuais usados apenas quando aumentam a compreensão.', {}, { size: 11.2, leading: 17.2 });
  add({ kind: 'callout', label: 'PROJETO EDITORIAL', lines: wrapWidth('A publicação preserva o conteúdo técnico do manual digital e reorganiza sua apresentação para o formato de e-book. Diagramas e infográficos são vetoriais e autorais; não há dependência de imagens decorativas ou de fontes sem licença editorial clara.', 430, 9.5, 'F1'), tone: 'teal', height: 96 }, {});
  addParagraph('Corpo de Bombeiros Militar de Minas Gerais', {}, { font: 'F2', size: 10, leading: 15, justify: false });

  const chapters = chapterStarts();
  start({ front: true, title: 'Sumário' });
  add({ kind: 'kicker', text: 'NAVEGAÇÃO', color: C.orange }, {});
  add({ kind: 'heading', text: 'Sumário', level: 1 }, {});
  let tocUsed = used;
  for (const [chapter, page] of chapters) {
    const title = `Capítulo ${chapter}  ${latin(page.title)}`;
    const available = FLOW_H - tocUsed;
    if (available < 23) { start({ front: true, title: 'Sumário - continuação' }); add({ kind: 'kicker', text: 'SUMÁRIO - CONTINUAÇÃO', color: C.orange }, {}); tocUsed = used; }
    const dots = '.'.repeat(clamp(54 - latin(title).length, 4, 28));
    const item: ParagraphItem = { kind: 'paragraph', lines: [`${title} ${dots} ${page.number}`], font: 'F1', size: 9.2, leading: 14.2, color: C.ink, justify: false, maxWidth: CONTENT_W };
    current!.items.push(item); used += itemHeight(item); tocUsed = used;
  }

  let lastPart: number | null | undefined = undefined;
  let lastChapter: number | null | undefined = undefined;
  for (const source of sourcePages) {
    if (source.cover) continue;
    const meta = { sourcePage: source.number, title: source.title, chapter: source.chapter, part: source.part, partTitle: source.partTitle };
    if (source.part && source.part !== lastPart) {
      start({ ...meta, divider: true, items: [] });
      lastPart = source.part;
      current = null; used = 0;
    }
    const chapterOpening = Boolean(source.chapter && source.chapter !== lastChapter);
    if (chapterOpening) {
      start(meta);
      add({ kind: 'kicker', text: `CAPÍTULO ${source.chapter}  •  PÁGINA DIGITAL ${source.number}`, color: C.orange }, meta);
      add({ kind: 'heading', text: source.title, level: 1 }, meta);
      const figure = selectFigure(source);
      if (figure) add({ kind: 'figure', figure, title: figureTitle(figure), height: 154 }, meta);
      add({ kind: 'rule', height: 16 }, meta);
      lastChapter = source.chapter;
    } else {
      if (!current) start(meta);
      add({ kind: 'kicker', text: `PÁGINA DIGITAL ${source.number}`, color: C.muted }, meta);
      if (source.title && normalize(source.title) !== normalize(current?.title ?? '')) add({ kind: 'heading', text: source.title, level: 2 }, meta);
    }

    for (const block of source.blocks) {
      const text = latin(block.text); if (!text) continue;
      if (block.kind === 'heading') { add({ kind: 'heading', text, level: 3 }, meta); continue; }
      if (block.kind === 'list-item') { addParagraph(`• ${text}`, meta, { indent: 14, size: 10.1, leading: 14.6 }); continue; }
      const isCallout = ['opening', 'objectives', 'doctrine', 'evidence', 'practice', 'attention', 'decide', 'case', 'guided-analysis', 'summary', 'review', 'resource', 'external-link'].includes(block.kind);
      if (isCallout) {
        const lines = wrapWidth(text, 430, 9.45, 'F1');
        const height = clamp(36 + lines.length * 13, 62, 176);
        if (lines.length > 10) {
          add({ kind: 'kicker', text: markerLabel(block.kind), color: markerTone(block.kind) === 'orange' ? C.orange : C.teal }, meta);
          addParagraph(text, meta, { size: 10.2, leading: 15 });
        } else add({ kind: 'callout', label: markerLabel(block.kind), lines, tone: markerTone(block.kind), height }, meta);
        continue;
      }
      addParagraph(text, meta, { size: 10.35, leading: 15.1, justify: true });
    }
    add({ kind: 'spacer', height: 8 }, meta);
  }
  return out;
}

function circle(cx: number, cy: number, r: number, color: string) {
  const k = r * 0.5522847498;
  return `${color} rg ${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c f`;
}
function line(x1: number, y1: number, x2: number, y2: number, color = C.teal, width = 1.4) { return `${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`; }
function box(x: number, y: number, w: number, h: number, fill: string, stroke = C.line) { return `${fill} rg ${stroke} RG 0.8 w ${x} ${y} ${w} ${h} re B`; }
function textCmd(text: string, x: number, y: number, font: Font, size: number, color: string, tw = 0) { return `BT /${font} ${size} Tf ${color} rg ${tw.toFixed(2)} Tw ${x.toFixed(2)} ${y.toFixed(2)} Td ${hex(text)} Tj ET`; }
function centered(text: string, cx: number, y: number, font: Font, size: number, color: string) { return textCmd(text, cx - textWidth(text, size, font) / 2, y, font, size, color); }

function renderCover() {
  const c: string[] = [];
  c.push(`${C.navy} rg 0 0 ${A4.w} ${A4.h} re f`);
  c.push(`${C.orange} rg 0 ${A4.h - 13} ${A4.w} 13 re f`);
  c.push(circle(485, 700, 150, '0.035 0.270 0.280'));
  c.push(circle(520, 730, 86, '0.045 0.335 0.340'));
  c.push(`${C.orange} rg 54 78 5 186 re f`);
  c.push(textCmd('CATS', 58, 733, 'F2', 18, C.orange));
  c.push(textCmd('Manual do', 58, 674, 'F2', 34, C.white));
  c.push(textCmd('Participante', 58, 632, 'F2', 34, C.white));
  c.push(textCmd('Atendimento a Tentativas de Suicídio', 58, 596, 'F1', 13.5, '0.760 0.845 0.825'));
  c.push(`${C.orange} rg 58 574 320 4 re f`);
  c.push(textCmd('ESCUTA  •  TÉCNICA  •  SEGURANÇA  •  HUMANIDADE', 58, 545, 'F1', 9.2, '0.865 0.915 0.900'));
  c.push(`${C.orange} rg 112 258 292 32 re f`);
  c.push(`${C.navy} rg 142 264 232 22 re f`);
  c.push(`${C.orange} rg 227 287 62 28 re f`);
  c.push(`${C.deep} rg 132 218 252 43 re f`);
  c.push(`${C.navy} rg 164 183 188 36 re f`);
  c.push(textCmd('CORPO DE BOMBEIROS MILITAR DE MINAS GERAIS', 58, 112, 'F2', 9.4, C.white));
  c.push(textCmd('Edição digital • projeto editorial para e-book', 58, 88, 'F1', 8.7, '0.670 0.760 0.740'));
  c.push(textCmd('2026', 498, 88, 'F2', 12, C.orange));
  return c.join('\n');
}

function renderDivider(page: LayoutPage) {
  const c: string[] = [];
  c.push(`${C.deep} rg 0 0 ${A4.w} ${A4.h} re f`);
  c.push(`${C.orange} rg 0 0 18 ${A4.h} re f`);
  c.push(textCmd(`PARTE ${page.part ?? ''}`, 58, 610, 'F2', 13, C.orange));
  const title = latin(page.partTitle || page.title || '');
  const lines = wrapWidth(title, 430, 31, 'F2');
  let y = 558;
  for (const l of lines.slice(0, 4)) { c.push(textCmd(l, 58, y, 'F2', 31, C.white)); y -= 39; }
  c.push(line(58, y - 4, 360, y - 4, C.orange, 3));
  c.push(textCmd('MANUAL DO PARTICIPANTE CATS', 58, 112, 'F1', 9, '0.720 0.825 0.805'));
  return c.join('\n');
}

function renderFigure(item: FigureItem, yTop: number) {
  const c: string[] = [];
  const x = MARGIN_X; const w = CONTENT_W; const h = item.height - 10; const y = yTop - h;
  c.push(box(x, y, w, h, C.paleTeal));
  c.push(textCmd('INFOGRÁFICO', x + 16, yTop - 22, 'F2', 7.8, C.orange));
  c.push(textCmd(item.title, x + 16, yTop - 42, 'F2', 10.2, C.deep));
  const nodeY = y + 36; const nodeH = 38;
  const drawSequence = (labels: string[]) => {
    const gap = 10; const nodeW = (w - 32 - gap * (labels.length - 1)) / labels.length; let nx = x + 16;
    labels.forEach((label, idx) => {
      c.push(box(nx, nodeY, nodeW, nodeH, C.white, '0.640 0.755 0.735'));
      c.push(centered(label, nx + nodeW / 2, nodeY + 14, 'F2', 7.5, C.deep));
      if (idx < labels.length - 1) { const ax1 = nx + nodeW + 2; const ax2 = nx + nodeW + gap - 2; c.push(line(ax1, nodeY + 19, ax2, nodeY + 19, C.orange, 1.5)); c.push(`${C.orange} rg ${ax2 - 4} ${nodeY + 16} m ${ax2} ${nodeY + 19} l ${ax2 - 4} ${nodeY + 22} l f`); }
      nx += nodeW + gap;
    });
  };
  if (item.figure === 'psp') drawSequence(['PREPARAR', 'OLHAR', 'ESCUTAR', 'CONECTAR']);
  else if (item.figure === 'risk') drawSequence(['OBSERVAR', 'AVALIAR RISCO', 'PROTEGER']);
  else if (item.figure === 'crisis') drawSequence(['RECONHECER', 'CONTATAR', 'PROTEGER', 'CONTINUAR']);
  else if (item.figure === 'continuity') drawSequence(['ACOLHER', 'CONECTAR', 'ACOMPANHAR']);
  else if (item.figure === 'communication') {
    const pts = [[x + w / 2, nodeY + 54, 'ESCUTA'], [x + 135, nodeY, 'VÍNCULO'], [x + w - 135, nodeY, 'CLAREZA']] as const;
    c.push(line(pts[0][0], pts[0][1], pts[1][0], pts[1][1] + 8, C.teal)); c.push(line(pts[0][0], pts[0][1], pts[2][0], pts[2][1] + 8, C.teal)); c.push(line(pts[1][0], pts[1][1], pts[2][0], pts[2][1], C.teal));
    for (const [cx, cy, label] of pts) { c.push(circle(cx, cy, 25, C.white)); c.push(centered(label, cx, cy - 3, 'F2', 7.2, C.deep)); }
  } else {
    const cx = x + w / 2; const cy = nodeY + 20;
    c.push(circle(cx, cy, 29, C.white)); c.push(centered('PESSOA', cx, cy - 3, 'F2', 7.3, C.deep));
    const nodes = [[x + 112, cy + 18, 'EQUIPE'], [x + w - 112, cy + 18, 'REDE'], [cx, cy + 66, 'SERVIÇOS']] as const;
    for (const [nx, ny, label] of nodes) { c.push(line(cx, cy, nx, ny, C.teal)); c.push(circle(nx, ny, 23, '0.985 0.985 0.970')); c.push(centered(label, nx, ny - 3, 'F2', 7.1, C.deep)); }
  }
  return c.join('\n');
}

function renderFlowPage(page: LayoutPage, index: number, total: number) {
  const c: string[] = [];
  c.push(`${C.paper} rg 0 0 ${A4.w} ${A4.h} re f`);
  c.push(`${C.orange} rg 0 ${A4.h - 5} ${A4.w} 5 re f`);
  c.push(textCmd('CATS  •  MANUAL DO PARTICIPANTE', MARGIN_X, 803, 'F2', 7.7, C.muted));
  const section = page.chapter ? `CAPÍTULO ${page.chapter}` : page.front ? 'EDIÇÃO DIGITAL' : page.part ? `PARTE ${page.part}` : '';
  c.push(textCmd(section, 470 - textWidth(section, 7.7, 'F1') / 2, 803, 'F1', 7.7, C.muted));
  c.push(line(MARGIN_X, 789, A4.w - MARGIN_X, 789, C.line, 0.7));
  let y = TOP_Y;
  for (const item of page.items) {
    if (item.kind === 'spacer') { y -= item.height; continue; }
    if (item.kind === 'rule') { c.push(line(MARGIN_X, y - 3, MARGIN_X + 72, y - 3, C.orange, 2.2)); y -= item.height; continue; }
    if (item.kind === 'kicker') { c.push(textCmd(item.text, MARGIN_X, y - 10, 'F2', 7.6, item.color ?? C.teal)); y -= itemHeight(item); continue; }
    if (item.kind === 'heading') {
      const size = item.level === 1 ? 22 : item.level === 2 ? 14.5 : 11.5;
      const font: Font = item.level === 1 ? 'F4' : 'F2';
      const maxW = item.level === 1 ? CONTENT_W : CONTENT_W - 10;
      const lines = wrapWidth(item.text, maxW, size, font);
      const leading = item.level === 1 ? 27 : item.level === 2 ? 19 : 15;
      let yy = y - (item.level === 1 ? 2 : 0);
      for (const l of lines.slice(0, item.level === 1 ? 3 : 4)) { c.push(textCmd(l, MARGIN_X, yy, font, size, item.color ?? C.deep)); yy -= leading; }
      y -= itemHeight(item); continue;
    }
    if (item.kind === 'paragraph') {
      const x = MARGIN_X + (item.indent ?? 0); const maxW = item.maxWidth ?? (CONTENT_W - (item.indent ?? 0));
      for (let i = 0; i < item.lines.length; i++) {
        const l = item.lines[i]; const isLast = i === item.lines.length - 1; const spaces = (l.match(/ /g) || []).length;
        let tw = 0;
        if (item.justify && !isLast && spaces > 0 && l.length > 28) tw = clamp((maxW - textWidth(l, item.size, item.font)) / spaces, 0, 2.8);
        c.push(textCmd(l, x, y, item.font, item.size, item.color, tw)); y -= item.leading;
      }
      y -= 7; continue;
    }
    if (item.kind === 'callout') {
      const h = item.height - 6; const yy = y - h;
      const fill = item.tone === 'orange' ? C.paleOrange : item.tone === 'blue' ? C.paleBlue : C.paleTeal;
      const accent = item.tone === 'orange' ? C.orange : item.tone === 'blue' ? '0.180 0.390 0.520' : C.teal;
      c.push(box(MARGIN_X, yy, CONTENT_W, h, fill)); c.push(`${accent} rg ${MARGIN_X} ${yy} 4 ${h} re f`);
      c.push(textCmd(item.label, MARGIN_X + 15, y - 21, 'F2', 7.5, accent));
      let ly = y - 40;
      for (const l of item.lines) { c.push(textCmd(l, MARGIN_X + 15, ly, 'F1', 9.45, C.ink)); ly -= 13; }
      y -= item.height; continue;
    }
    if (item.kind === 'figure') { c.push(renderFigure(item, y)); y -= item.height; continue; }
  }
  c.push(line(MARGIN_X, 53, A4.w - MARGIN_X, 53, C.line, 0.6));
  const left = page.sourcePage ? `Conteúdo digital • página ${page.sourcePage}` : 'Edição digital 2026';
  c.push(textCmd(left, MARGIN_X, 34, 'F1', 7.5, C.muted));
  c.push(textCmd(`${index + 1} / ${total}`, 500, 34, 'F2', 7.5, C.muted));
  return c.join('\n');
}

function streamFor(page: LayoutPage, index: number, total: number) {
  if (page.cover) return renderCover();
  if (page.divider) return renderDivider(page);
  return renderFlowPage(page, index, total);
}

function buildPdf() {
  const rendered = buildLayout();
  const objects: string[] = [''];
  const add = (value: string) => { objects.push(value); return objects.length - 1; };
  const catalog = add(''); const pagesObj = add('');
  const fontSans = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontSansBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const fontSerif = add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>');
  const fontSerifBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>');
  const info = add(`<< /Title ${hex('Manual do Participante CATS')} /Author ${hex('Corpo de Bombeiros Militar de Minas Gerais')} /Subject ${hex('Atendimento a Tentativas de Suicídio - edição digital 2026')} /Keywords ${hex('CATS, ATS, manual do participante, bombeiros, suicídio, intervenção em crise')} /Creator ${hex('Projeto editorial digital CATS 2026')} >>`);
  const pageIds: number[] = [];
  rendered.forEach((page, index) => {
    const stream = streamFor(page, index, rendered.length); const bytes = Buffer.byteLength(stream, 'latin1');
    const content = add(`<< /Length ${bytes} >>\nstream\n${stream}\nendstream`);
    const pid = add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 ${fontSans} 0 R /F2 ${fontSansBold} 0 R /F3 ${fontSerif} 0 R /F4 ${fontSerifBold} 0 R >> >> /Contents ${content} 0 R >>`);
    pageIds.push(pid);
  });
  objects[pagesObj] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`;
  objects[catalog] = `<< /Type /Catalog /Pages ${pagesObj} 0 R /PageLayout /SinglePage /PageMode /UseNone >>`;
  let pdf = '%PDF-1.4\n%âãÏÓ\n'; const offsets = [0];
  for (let i = 1; i < objects.length; i++) { offsets[i] = Buffer.byteLength(pdf, 'latin1'); pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export async function GET() {
  const pdf = buildPdf();
  return new Response(new Uint8Array(pdf), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="Manual-do-Participante-CATS-Edicao-Digital-2026.pdf"',
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=60',
    'X-Content-Type-Options': 'nosniff',
    'X-CATS-Editorial-Edition': 'publication-grade-2026'
  } });
}
