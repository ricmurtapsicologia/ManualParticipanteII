export const SEMANTIC_SCHEMA_VERSION = 1;

export const SEMANTIC_BLOCK_KINDS = Object.freeze([
  'paragraph',
  'heading',
  'list-item',
  'opening',
  'objectives',
  'doctrine',
  'evidence',
  'practice',
  'attention',
  'decide',
  'case',
  'guided-analysis',
  'summary',
  'review',
  'figure',
  'diagram',
  'audio',
  'video',
  'quiz',
  'external-resource'
]);

const EXACT_MARKERS = new Map([
  ['SITUAÇÃO DE ABERTURA', 'opening'],
  ['O QUE VOCÊ DEVERÁ CONSEGUIR FAZER', 'objectives'],
  ['DOUTRINA', 'doctrine'],
  ['DOUTRINA VIGENTE', 'doctrine'],
  ['EVIDÊNCIA', 'evidence'],
  ['NA PRÁTICA', 'practice'],
  ['ATENÇÃO', 'attention'],
  ['DECIDA', 'decide'],
  ['CASO PARA DECISÃO', 'case'],
  ['ANÁLISE ORIENTADORA', 'guided-analysis'],
  ['SÍNTESE DO CAPÍTULO', 'summary'],
  ['QUESTÕES DE REVISÃO', 'review'],
  ['QUESTÕES DE REVISÃO E APLICAÇÃO', 'review']
]);

function markerKey(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const NORMALIZED_MARKERS = new Map(
  [...EXACT_MARKERS.entries()].map(([label, kind]) => [markerKey(label), kind])
);

export function classifySemanticBlock(text) {
  const raw = String(text ?? '');
  const trimmed = raw.trim();
  const marker = NORMALIZED_MARKERS.get(markerKey(trimmed));
  if (marker) return marker;
  if (/^•\s+/.test(trimmed)) return 'list-item';
  if (/^\d+\.\s+\S/.test(trimmed)) return 'heading';
  if (trimmed.length <= 110 && /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(trimmed) && trimmed === trimmed.toUpperCase()) return 'heading';
  return 'paragraph';
}

export function pageRoleFor(sourcePage, previousPage) {
  if (sourcePage.cover) return 'cover';
  if (!previousPage || sourcePage.part !== previousPage.part) return 'part-transition';
  if (sourcePage.chapter && sourcePage.chapter !== previousPage.chapter) return 'chapter-opening';
  if (!sourcePage.part) return 'front-matter';
  return 'continuation';
}

export function buildSemanticDocument(sourcePages, sourceSha256) {
  const pages = sourcePages.map((sourcePage, index) => {
    const previousPage = index > 0 ? sourcePages[index - 1] : null;
    return {
      number: sourcePage.number,
      part: sourcePage.part ?? null,
      partTitle: sourcePage.partTitle ?? '',
      chapter: sourcePage.chapter ?? null,
      title: sourcePage.title,
      cover: sourcePage.cover === true,
      pageRole: pageRoleFor(sourcePage, previousPage),
      blocks: sourcePage.paragraphs.map((text, sourceIndex) => ({
        id: `p${sourcePage.number}-b${sourceIndex + 1}`,
        kind: classifySemanticBlock(text),
        sourceIndex,
        text
      }))
    };
  });

  const partMap = new Map();
  for (const page of pages) {
    if (page.cover) continue;
    const partNumber = page.part ?? 0;
    if (!partMap.has(partNumber)) {
      partMap.set(partNumber, {
        part: partNumber,
        title: partNumber === 0 ? 'Elementos iniciais' : page.partTitle || `Parte ${partNumber}`,
        chapters: new Map()
      });
    }
    const part = partMap.get(partNumber);
    const chapterNumber = page.chapter ?? 0;
    if (!part.chapters.has(chapterNumber)) {
      part.chapters.set(chapterNumber, {
        chapter: chapterNumber,
        title: page.title,
        pageNumbers: []
      });
    }
    part.chapters.get(chapterNumber).pageNumbers.push(page.number);
  }

  const navigation = {
    parts: [...partMap.values()].map(part => ({
      part: part.part,
      title: part.title,
      chapters: [...part.chapters.values()]
    }))
  };

  const blockKinds = {};
  const pageRoles = {};
  let blockCount = 0;
  for (const page of pages) {
    pageRoles[page.pageRole] = (pageRoles[page.pageRole] ?? 0) + 1;
    for (const block of page.blocks) {
      blockKinds[block.kind] = (blockKinds[block.kind] ?? 0) + 1;
      blockCount += 1;
    }
  }

  return {
    schemaVersion: SEMANTIC_SCHEMA_VERSION,
    editorialModel: 'part>chapter>page>block',
    source: {
      file: 'pages.json',
      pageCount: sourcePages.length,
      sha256: sourceSha256,
      preservation: 'lossless-title-and-paragraph-text'
    },
    capabilities: {
      currentlyMigrated: ['paragraph', 'heading', 'list-item', 'opening', 'objectives', 'doctrine', 'evidence', 'practice', 'attention', 'decide', 'case', 'guided-analysis', 'summary', 'review'],
      reservedForLaterWaves: ['figure', 'diagram', 'audio', 'video', 'quiz', 'external-resource']
    },
    navigation,
    pages,
    manifest: {
      pageCount: pages.length,
      blockCount,
      partCount: navigation.parts.filter(part => part.part > 0).length,
      chapterCount: navigation.parts.reduce((sum, part) => sum + part.chapters.filter(chapter => chapter.chapter > 0).length, 0),
      pageRoles,
      blockKinds
    }
  };
}
