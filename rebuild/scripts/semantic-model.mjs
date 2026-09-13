export const SEMANTIC_SCHEMA_VERSION = 2;

export const SEMANTIC_BLOCK_KINDS = Object.freeze([
  'paragraph','heading','list-item','opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review','figure','diagram','audio','video','quiz','external-resource'
]);

export const PEDAGOGICAL_BLOCK_KINDS = Object.freeze([
  'opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review'
]);

const PEDAGOGICAL_KIND_SET = new Set(PEDAGOGICAL_BLOCK_KINDS);

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
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

const NORMALIZED_MARKERS = new Map([...EXACT_MARKERS.entries()].map(([label, kind]) => [markerKey(label), kind]));

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

function sourceChapterNumber(page) {
  const value = Number(page?.chapter);
  return Number.isFinite(value) ? value : 0;
}

function editorialTaxonomyFor(sourcePage, previousSourcePage) {
  if (sourcePage.cover) {
    return {
      part: null,
      partTitle: '',
      chapter: null,
      taxonomyAdjusted: false,
      normalizationReason: null
    };
  }

  const part = Number(sourcePage.part ?? 0);
  const chapter = sourceChapterNumber(sourcePage);
  if (part === 0) {
    return {
      part: 0,
      partTitle: sourcePage.partTitle ?? '',
      chapter: 0,
      taxonomyAdjusted: false,
      normalizationReason: null
    };
  }

  const partChanged = !previousSourcePage || Number(previousSourcePage.part ?? 0) !== part;
  const previousChapter = sourceChapterNumber(previousSourcePage);
  const isDedicatedPartOpening = partChanged && (chapter === 0 || chapter === previousChapter);
  const normalizedChapter = isDedicatedPartOpening ? 0 : chapter;
  const taxonomyAdjusted = normalizedChapter !== chapter;

  return {
    part,
    partTitle: sourcePage.partTitle ?? '',
    chapter: normalizedChapter,
    taxonomyAdjusted,
    normalizationReason: taxonomyAdjusted ? 'part-boundary-carries-previous-chapter' : null
  };
}

function normalizedPageRole(page, previousPage) {
  if (page.cover) return 'cover';
  if (page.editorial.part === 0) return 'front-matter';
  const partChanged = !previousPage || page.editorial.part !== previousPage.editorial.part;
  if (partChanged && page.editorial.chapter === 0) return 'part-opening';
  if (page.editorial.chapter === 0) return 'supplementary';
  if (partChanged || !previousPage || page.editorial.chapter !== previousPage.editorial.chapter) return 'chapter-opening';
  return 'continuation';
}

function groupContiguousByTitle(pages) {
  const groups = [];
  for (const page of pages) {
    const current = groups.at(-1);
    if (!current || current.title !== page.title) {
      groups.push({ title: page.title, pageNumbers: [page.number] });
    } else {
      current.pageNumbers.push(page.number);
    }
  }
  return groups;
}

function pedagogicalMarkersFor(pages) {
  const markers = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      if (!PEDAGOGICAL_KIND_SET.has(block.kind)) continue;
      markers.push({
        kind: block.kind,
        pageNumber: page.number,
        blockId: block.id,
        text: block.text
      });
    }
  }
  return markers;
}

function markerSummary(markers) {
  const counts = {};
  const kinds = [];
  const seen = new Set();
  for (const marker of markers) {
    counts[marker.kind] = (counts[marker.kind] ?? 0) + 1;
    if (!seen.has(marker.kind)) {
      seen.add(marker.kind);
      kinds.push(marker.kind);
    }
  }
  return { pedagogicalKinds: kinds, pedagogicalCounts: counts };
}

function buildNormalizedNavigation(pages) {
  const frontMatterPages = pages.filter(page => page.pageRole === 'front-matter');
  const parts = [];

  for (let partNumber = 1; partNumber <= 7; partNumber += 1) {
    const partPages = pages.filter(page => page.editorial.part === partNumber);
    if (!partPages.length) continue;
    const openingPages = partPages.filter(page => page.pageRole === 'part-opening').map(page => page.number);
    const chapterNumbers = [...new Set(partPages.map(page => page.editorial.chapter).filter(chapter => chapter > 0))];
    const chapters = chapterNumbers.map(chapterNumber => {
      const chapterPages = partPages.filter(page => page.editorial.chapter === chapterNumber);
      const markers = pedagogicalMarkersFor(chapterPages);
      const summary = markerSummary(markers);
      return {
        id: `chapter-${chapterNumber}`,
        chapter: chapterNumber,
        title: chapterPages[0].title,
        openingPage: chapterPages[0].number,
        pageNumbers: chapterPages.map(page => page.number),
        continuationPages: chapterPages.slice(1).map(page => page.number),
        pedagogicalKinds: summary.pedagogicalKinds,
        pedagogicalCounts: summary.pedagogicalCounts,
        pedagogicalMarkers: markers
      };
    });

    const supplementaryPages = partPages.filter(page => page.pageRole === 'supplementary');
    const supplementarySections = groupContiguousByTitle(supplementaryPages).map((section, index) => ({
      id: `part-${partNumber}-supplement-${index + 1}`,
      title: section.title,
      openingPage: section.pageNumbers[0],
      pageNumbers: section.pageNumbers
    }));

    parts.push({
      id: `part-${partNumber}`,
      part: partNumber,
      title: partPages[0].editorial.partTitle || `Parte ${partNumber}`,
      openingPages,
      chapters,
      supplementarySections
    });
  }

  const frontMatter = groupContiguousByTitle(frontMatterPages).map((section, index) => ({
    id: `front-matter-${index + 1}`,
    title: section.title,
    openingPage: section.pageNumbers[0],
    pageNumbers: section.pageNumbers
  }));

  const toc = parts.map(part => ({
    id: part.id,
    kind: 'part',
    part: part.part,
    title: part.title,
    pageNumber: part.openingPages[0] ?? part.chapters[0]?.openingPage ?? part.supplementarySections[0]?.openingPage ?? null,
    children: [
      ...part.chapters.map(chapter => ({
        id: chapter.id,
        kind: 'chapter',
        chapter: chapter.chapter,
        title: chapter.title,
        pageNumber: chapter.openingPage
      })),
      ...part.supplementarySections.map(section => ({
        id: section.id,
        kind: 'supplementary',
        title: section.title,
        pageNumber: section.openingPage
      }))
    ]
  }));

  return { frontMatter, parts, toc };
}

function sourceChapterDiagnostics(pages) {
  const chapterParts = new Map();
  for (const page of pages) {
    const chapter = Number(page.chapter);
    if (!(chapter > 0)) continue;
    if (!chapterParts.has(chapter)) chapterParts.set(chapter, new Set());
    chapterParts.get(chapter).add(page.part ?? 0);
  }
  const distinctChapterNumbers = [...chapterParts.keys()].sort((a, b) => a - b);
  const sourceChapterPairs = [];
  for (const chapter of distinctChapterNumbers) {
    for (const part of [...chapterParts.get(chapter)].sort((a, b) => a - b)) sourceChapterPairs.push(`${part}:${chapter}`);
  }
  const boundaryChapterOverlaps = distinctChapterNumbers
    .map(chapter => ({ chapter, parts: [...chapterParts.get(chapter)].sort((a, b) => a - b) }))
    .filter(item => item.parts.length > 1);
  return { distinctChapterNumbers, sourceChapterPairs, boundaryChapterOverlaps };
}

function normalizedChapterDiagnostics(pages) {
  const chapterParts = new Map();
  for (const page of pages) {
    const chapter = Number(page.editorial.chapter);
    if (!(chapter > 0)) continue;
    if (!chapterParts.has(chapter)) chapterParts.set(chapter, new Set());
    chapterParts.get(chapter).add(page.editorial.part);
  }
  const chapterNumbers = [...chapterParts.keys()].sort((a, b) => a - b);
  const overlaps = chapterNumbers
    .map(chapter => ({ chapter, parts: [...chapterParts.get(chapter)].sort((a, b) => a - b) }))
    .filter(item => item.parts.length > 1);
  return { chapterNumbers, overlaps };
}

export function buildSemanticDocument(sourcePages, sourceSha256) {
  const pages = sourcePages.map((sourcePage, index) => {
    const previousSourcePage = index > 0 ? sourcePages[index - 1] : null;
    return {
      number: sourcePage.number,
      part: sourcePage.part ?? null,
      partTitle: sourcePage.partTitle ?? '',
      chapter: sourcePage.chapter ?? null,
      title: sourcePage.title,
      cover: sourcePage.cover === true,
      editorial: editorialTaxonomyFor(sourcePage, previousSourcePage),
      pageRole: null,
      blocks: sourcePage.paragraphs.map((text, sourceIndex) => ({
        id: `p${sourcePage.number}-b${sourceIndex + 1}`,
        kind: classifySemanticBlock(text),
        sourceIndex,
        text
      }))
    };
  });

  for (let index = 0; index < pages.length; index += 1) {
    pages[index].pageRole = normalizedPageRole(pages[index], index > 0 ? pages[index - 1] : null);
  }

  const navigation = buildNormalizedNavigation(pages);
  const sourceDiagnostics = sourceChapterDiagnostics(pages);
  const normalizedDiagnostics = normalizedChapterDiagnostics(pages);
  const blockKinds = {};
  const pageRoles = {};
  let blockCount = 0;
  let pedagogicalMarkerCount = 0;

  for (const page of pages) {
    pageRoles[page.pageRole] = (pageRoles[page.pageRole] ?? 0) + 1;
    for (const block of page.blocks) {
      blockKinds[block.kind] = (blockKinds[block.kind] ?? 0) + 1;
      if (PEDAGOGICAL_KIND_SET.has(block.kind)) pedagogicalMarkerCount += 1;
      blockCount += 1;
    }
  }

  const transitionNormalizations = pages
    .filter(page => page.editorial.taxonomyAdjusted)
    .map(page => ({
      page: page.number,
      sourcePart: page.part,
      sourceChapter: page.chapter,
      editorialPart: page.editorial.part,
      editorialChapter: page.editorial.chapter,
      reason: page.editorial.normalizationReason
    }));

  return {
    schemaVersion: SEMANTIC_SCHEMA_VERSION,
    editorialModel: 'part>chapter>page>block',
    source: {
      file: 'pages.json',
      pageCount: sourcePages.length,
      sha256: sourceSha256,
      preservation: 'lossless-title-and-paragraph-text-and-source-taxonomy'
    },
    normalization: {
      stage: 'wave-12-taxonomy-navigation',
      strategy: 'preserve-source-taxonomy-add-editorial-taxonomy',
      transitionNormalizations
    },
    capabilities: {
      currentlyMigrated: ['paragraph','heading','list-item','opening','objectives','doctrine','evidence','practice','attention','decide','case','guided-analysis','summary','review'],
      reservedForLaterWaves: ['figure','diagram','audio','video','quiz','external-resource']
    },
    navigation,
    pages,
    manifest: {
      pageCount: pages.length,
      blockCount,
      partCount: navigation.parts.length,
      distinctChapterNumberCount: normalizedDiagnostics.chapterNumbers.length,
      distinctChapterNumbers: normalizedDiagnostics.chapterNumbers,
      sourceChapterPairCount: sourceDiagnostics.sourceChapterPairs.length,
      sourceChapterPairs: sourceDiagnostics.sourceChapterPairs,
      sourceBoundaryChapterOverlaps: sourceDiagnostics.boundaryChapterOverlaps,
      normalizedBoundaryChapterOverlaps: normalizedDiagnostics.overlaps,
      transitionNormalizationCount: transitionNormalizations.length,
      tocPartCount: navigation.toc.length,
      tocChapterCount: navigation.toc.reduce((sum, part) => sum + part.children.filter(child => child.kind === 'chapter').length, 0),
      pedagogicalMarkerCount,
      pageRoles,
      blockKinds
    }
  };
}
