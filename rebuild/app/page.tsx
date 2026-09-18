'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import semanticData from '../content/semantic-pages.json';
import navigationData from '../content/navigation.json';
import multimediaData from '../content/multimedia-manifest.json';
import quizData from '../content/chapter-quizzes.json';
import enrichmentData from '../content/chapter-enrichment.json';
import { ApprovedCover, AudioResourceCard, selectPreferredVoice, type Wave54AudioResource } from './wave54';
import { VideoResourceCard, type Wave55VideoResource } from './wave55';
import { useReaderPageTurn } from './wave16';
import { ChapterQuiz, type ChapterQuizData } from './wave18';
import { ChapterMicrolearningCard, ChapterResourceCard, type ChapterEnrichment } from './wave10';

type SemanticBlock = { id: string; kind: string; sourceIndex: number; text: string; url?: string; href?: string };
type SemanticPage = { number: number; part?: number | null; partTitle?: string; chapter?: number | null; title: string; cover?: boolean; pageRole?: string; blocks: SemanticBlock[] };
type SemanticArtifact = { pages: SemanticPage[] };
type PedagogicalMarker = { kind: string; pageNumber: number; blockId: string };
type NavChapter = { chapter: number; title: string; openingPage: number; pageNumbers: number[]; pedagogicalMarkers: PedagogicalMarker[] };
type NavSupplement = { id: string; title: string; openingPage: number; pageNumbers: number[]; pedagogicalMarkers: PedagogicalMarker[] };
type NavPart = { id: string; part: number; title: string; openingPage: number; pedagogicalMarkers: PedagogicalMarker[]; chapters: NavChapter[]; supplementarySections: NavSupplement[] };
type NavigationArtifact = { schemaVersion: number; sourcePageCount: number; chapterCount: number; pedagogicalMarkerCount: number; frontMatter: NavSupplement[]; parts: NavPart[] };
type MultimediaStep = { order: number; title: string; detail: string };
type MicrolearningChoice = { id: string; label: string; correct: boolean };
type MultimediaResource = { id: string; kind: string; pageNumber: number; title: string; src?: string; alt?: string; steps?: MultimediaStep[]; transverse?: string; sourceBlockId?: string; prompt?: string; reveal?: string; choices?: MicrolearningChoice[]; transcript?: string; preferredVoice?: string; fallbackLang?: string };
type MultimediaArtifact = { schemaVersion: number; wave: string; resources: MultimediaResource[] };
type QuizArtifact = { schemaVersion: number; wave: string; chapters: ChapterQuizData[] };
type EnrichmentArtifact = { schemaVersion: number; wave: string; chapters: ChapterEnrichment[] };

const pages = (semanticData as SemanticArtifact).pages;
const navigation = navigationData as NavigationArtifact;
const multimedia = multimediaData as MultimediaArtifact;
const quizzes = quizData as QuizArtifact;
const enrichment = enrichmentData as EnrichmentArtifact;
const pageNumberToIndex = new Map(pages.map((item, index) => [item.number ?? index + 1, index]));
const markerLabels: Record<string, string> = {
  opening: 'Situação de abertura', objectives: 'Objetivos do capítulo', doctrine: 'Doutrina', evidence: 'Evidência',
  practice: 'Na prática', attention: 'Atenção', decide: 'Decida', case: 'Caso para decisão',
  'guided-analysis': 'Análise orientadora', summary: 'Resumo do capítulo', review: 'Questões de revisão'
};
const markerIcons: Record<string, string> = {
  opening: '◐', objectives: '◎', doctrine: '§', evidence: '◆', practice: '▶', attention: '!',
  decide: '↯', case: '◇', 'guided-analysis': '↳', summary: '≡', review: '?'
};
const pedagogicalKinds = new Set(Object.keys(markerLabels));

function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function findPartForPage(pageNumber: number) {
  return navigation.parts.find(part => part.openingPage === pageNumber || part.chapters.some(chapter => chapter.pageNumbers.includes(pageNumber)) || part.supplementarySections.some(section => section.pageNumbers.includes(pageNumber))) ?? null;
}
function renderPlainBlock(block: SemanticBlock) {
  if (block.kind === 'heading') return <h3 key={block.id} data-kind="heading">{block.text}</h3>;
  if (block.kind === 'list-item') return <p key={block.id} className="semanticListItem" data-kind="list-item">{block.text}</p>;
  if (block.kind === 'reference') return <p key={block.id} className="referenceEntry" data-kind="reference">{block.text}</p>;
  if ((block.kind === 'external-link' || block.kind === 'external-resource') && (block.url || block.href)) return <a key={block.id} className="externalResourceLink" href={block.url || block.href} target="_blank" rel="noopener noreferrer" data-kind="external-link">{block.text} <span aria-hidden="true">↗</span></a>;
  return <p key={block.id} data-kind={block.kind}>{block.text}</p>;
}
function renderSemanticBlocks(blocks: SemanticBlock[]) {
  const output = [];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index];
    if (!pedagogicalKinds.has(block.kind)) { output.push(renderPlainBlock(block)); index += 1; continue; }
    const content: SemanticBlock[] = [];
    let cursor = index + 1;
    while (cursor < blocks.length && !pedagogicalKinds.has(blocks[cursor].kind) && blocks[cursor].kind !== 'heading') { content.push(blocks[cursor]); cursor += 1; }
    const labelId = `${block.id}-label`;
    output.push(<section key={block.id} className="pedagogicalBox" data-testid="pedagogical-box" data-kind={block.kind} aria-labelledby={labelId}>
      <div className="pedagogicalHeader"><span className="pedagogicalIcon" aria-hidden="true">{markerIcons[block.kind] ?? '•'}</span><strong id={labelId} data-pedagogical-label={block.kind}>{block.text}</strong></div>
      {content.length > 0 && <div className="pedagogicalBody">{content.map(renderPlainBlock)}</div>}
    </section>);
    index = cursor;
  }
  return output;
}

function MicrolearningCard({ resource }: { resource: MultimediaResource }) {
  const [selected, setSelected] = useState<string | null>(null);
  const choices = resource.choices ?? [];
  const selectedChoice = choices.find(choice => choice.id === selected) ?? null;
  const labelId = `${resource.id}-label`;
  if (!resource.prompt || !resource.reveal || choices.length < 2) return null;
  return <section className="pedagogicalBox" data-testid="microlearning-resource" data-media-id={resource.id} data-media-kind="microlearning" aria-labelledby={labelId}>
    <div className="pedagogicalHeader"><span className="pedagogicalIcon" aria-hidden="true">?</span><strong id={labelId}>Microlearning • {resource.title}</strong></div>
    <div className="pedagogicalBody"><p data-testid="microlearning-prompt" style={{ fontWeight: 500, textAlign: 'left' }}>{resource.prompt}</p>
      <div data-testid="microlearning-choices" role="group" aria-label="Escolha uma resposta" style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {choices.map(choice => <button key={choice.id} type="button" data-testid="microlearning-choice" data-choice-id={choice.id} aria-pressed={selected === choice.id} onClick={() => setSelected(choice.id)} style={{ minHeight: 42, padding: '9px 11px', borderRadius: 9, border: '1px solid var(--ds2-line)', background: selected === choice.id ? '#eef4f2' : '#fff', color: 'var(--ds2-ink)', fontWeight: 500, textAlign: 'left', cursor: 'pointer' }}>{choice.label}</button>)}
      </div>
      {selectedChoice && <div data-testid="microlearning-feedback" aria-live="polite" style={{ marginTop: 12, padding: '10px 11px', borderRadius: 9, background: selectedChoice.correct ? '#edf6f4' : '#fff4ed' }}><span>{selectedChoice.correct ? 'Correto.' : 'Revise o ponto-chave.'}</span><p style={{ marginTop: 5, textAlign: 'left' }}>{resource.reveal}</p></div>}
    </div>
  </section>;
}

function renderMultimediaResource(resource: MultimediaResource) {
  if (resource.kind === 'audio' && resource.src === 'native://speech-synthesis' && resource.transcript) return <AudioResourceCard key={resource.id} resource={resource as Wave54AudioResource} />;
  if (resource.kind === 'video' && resource.src === 'native://ats-system-video' && resource.transcript && resource.steps?.length) return <VideoResourceCard key={resource.id} resource={resource as Wave55VideoResource} />;
  if (resource.kind === 'microlearning') return <MicrolearningCard key={resource.id} resource={resource} />;
  const infographicSources = new Set(['native://ats-system-macro', 'native://cats-infographic']);
  if (resource.kind !== 'infographic' || !resource.src || !infographicSources.has(resource.src) || !resource.steps?.length) return null;
  const labelId = `${resource.id}-label`; const descriptionId = `${resource.id}-description`; const flowAria = resource.alt || resource.title;
  return <figure key={resource.id} className="multimediaFigure atsMacro" data-testid="multimedia-resource" data-media-id={resource.id} data-media-kind={resource.kind} data-media-src={resource.src} aria-labelledby={labelId} aria-describedby={descriptionId}>
    <div className="multimediaEyebrow">Infográfico</div><figcaption id={labelId}>{resource.title}</figcaption><p id={descriptionId} className="multimediaDescription">{resource.alt}</p>
    <div className="atsFlow" role="list" aria-label={flowAria}>{resource.steps.sort((a,b) => a.order-b.order).map(step => <div key={step.order} className="atsFlowStep" data-testid="multimedia-step" data-step={step.order} role="listitem"><span className="atsStepNo" aria-hidden="true">{step.order}</span><div><strong>{step.title}</strong><span>{step.detail}</span></div></div>)}</div>
    {resource.transverse && <div className="atsTransverse"><span aria-hidden="true">↻</span><strong>{resource.transverse}</strong></div>}
  </figure>;
}

export default function Home() {
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<'toc' | 'search' | null>(null);
  const [query, setQuery] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [openParts, setOpenParts] = useState<Record<number, boolean>>({ 1: true });
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const readerTurn = useReaderPageTurn({ page, pageCount: pages.length, setPage });
  const current = pages[page];
  const currentPageNumber = current.number ?? page + 1;
  const currentPart = findPartForPage(currentPageNumber);
  const currentPartNumber = currentPart?.part ?? null;
  const currentChapter = currentPart?.chapters.find(chapter => chapter.pageNumbers.includes(currentPageNumber)) ?? null;
  const pageMedia = multimedia.resources.filter(resource => resource.pageNumber === currentPageNumber && resource.kind !== 'microlearning');
  const currentQuiz = quizzes.chapters.find(item => item.endingPage === currentPageNumber) ?? null;
  const chapterEnrichment = currentChapter ? enrichment.chapters.find(item => item.chapter === currentChapter.chapter) ?? null : null;
  const pageMicrolearning = chapterEnrichment?.microlearning.pageNumber === currentPageNumber ? chapterEnrichment.microlearning : null;
  const pageResource = chapterEnrichment?.resource.pageNumber === currentPageNumber ? chapterEnrichment.resource : null;

  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get('pagina'));
    if (Number.isInteger(requested) && requested >= 1 && requested <= pages.length) { setPage(requested - 1); return; }
    const saved = Number(localStorage.getItem('cats-rebuild-page'));
    if (Number.isInteger(saved) && saved >= 0 && saved < pages.length) setPage(saved);
  }, []);
  useEffect(() => { localStorage.setItem('cats-rebuild-page', String(page)); }, [page]);
  useEffect(() => { if (drawer !== 'toc' || !currentPartNumber) return; setOpenParts(previous => previous[currentPartNumber] ? previous : { ...previous, [currentPartNumber]: true }); }, [drawer, currentPartNumber]);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  }, []);
  const openDrawer = useCallback((kind: 'toc' | 'search') => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDrawer(kind);
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('hidden'));
    const initial = drawer === 'search' ? searchInputRef.current : focusables()[0];
    window.setTimeout(() => initial?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); return; }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer, closeDrawer]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = Boolean(target?.closest('input,textarea,select,button,a,[contenteditable="true"]'));
      if (drawer) return;
      if (event.key === 'ArrowRight' && !interactive) { event.preventDefault(); readerTurn.turnBy(1); }
      if (event.key === 'ArrowLeft' && !interactive) { event.preventDefault(); readerTurn.turnBy(-1); }
      if (event.key === '/' && !interactive) { event.preventDefault(); openDrawer('search'); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [drawer, readerTurn.turnBy, openDrawer]);

  const results = useMemo(() => { const q = normalize(query.trim()); if (q.length < 2) return []; return pages.map((item,index) => ({item,index})).filter(({item}) => normalize([item.title,...item.blocks.map(block => block.text)].join(' ')).includes(q)); }, [query]);
  const go = (index: number) => { readerTurn.go(index); if (drawer) closeDrawer(); };
  const goPageNumber = (pageNumber: number) => go(pageNumberToIndex.get(pageNumber) ?? pageNumber - 1);
  const renderMarkers = (markers: PedagogicalMarker[]) => markers.length > 0 ? <div className="tocMarkers">{markers.map(marker => { const label = markerLabels[marker.kind] ?? marker.kind; return <button key={marker.blockId} data-testid="toc-marker" data-kind={marker.kind} aria-label={`${label}, página ${marker.pageNumber}`} onClick={() => goPageNumber(marker.pageNumber)}><span className="tocMarkerLabel"><span className="markerIcon" aria-hidden="true">{markerIcons[marker.kind] ?? '•'}</span><span>{label}</span></span><small>p. {marker.pageNumber}</small></button>; })}</div> : null;

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance([current.title, ...current.blocks.map(block => block.text)].join('. '));
    utterance.voice = selectPreferredVoice('Antônio', 'pt-BR'); utterance.lang = 'pt-BR'; utterance.rate = 0.96;
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); setSpeaking(true);
  };

  const progress = ((page + 1) / pages.length) * 100;
  const runningLeft = currentPart ? `PARTE ${currentPart.part} • ${currentPart.title}` : 'CATS • MANUAL DO PARTICIPANTE';
  const runningRight = currentChapter ? `CAPÍTULO ${currentChapter.chapter}` : currentPart ? `PARTE ${currentPart.part}` : '2026';
  const pageRole = current.cover ? 'cover' : currentChapter ? (currentChapter.openingPage === currentPageNumber ? 'chapter-opening' : 'chapter-continuation') : currentPart?.openingPage === currentPageNumber ? 'part-opening' : current.pageRole === 'supplementary' ? 'supplementary' : 'standard';

  return <div className="shell" data-testid="reader-shell" data-page-count={pages.length}>
    <a className="skipLink" href="#conteudo-principal">Pular para o conteúdo</a>
    <header className="top"><div className="topin"><div className="mark">CATS</div><div className="brand"><strong>Manual do Participante CATS</strong><span>Edição Digital Interativa • {pages.length} páginas</span></div><div className="tools"><a className="manualDownload" href="/api/manual" download="Manual-do-Participante-CATS.pdf" data-testid="manual-download" aria-label="Baixar Manual do Participante CATS em PDF">⇩ <span>Baixar PDF</span></a><button onClick={speak} className={speaking ? 'active' : ''} aria-label="Leitura em voz alta">◖)) <span>{speaking ? 'Parar' : 'Ouvir'}</span></button><button onClick={() => openDrawer('search')} aria-label="Pesquisar">⌕ <span>Buscar</span></button><button onClick={() => openDrawer('toc')} aria-label="Sumário">☰ <span>Sumário</span></button></div></div><div className="progressTrack" aria-hidden="true"><div className="progress" style={{ width: `${progress}%` }} /></div></header>
    <main className="main" id="conteudo-principal" tabIndex={-1}><div className="book"><div className={`readerSurface${readerTurn.className ? ` ${readerTurn.className}` : ''}`} data-testid="reader-surface" data-turn-direction={readerTurn.direction ?? 'idle'} data-dragging={readerTurn.dragging ? 'true' : 'false'} style={readerTurn.style} tabIndex={0} role="region" aria-label={`Leitor do Manual CATS, página ${currentPageNumber} de ${pages.length}`} aria-describedby="reader-instructions" {...readerTurn.gestureProps}>
      <article className={`page${current.cover ? ' cover' : ''}${pageRole === 'chapter-opening' ? ' chapterOpening' : ''}${pageRole === 'chapter-continuation' ? ' chapterContinuation' : ''}`} lang="pt-BR" data-testid="book-page" data-page-role={pageRole}>{current.cover ? <ApprovedCover /> : <><div className="running"><span>{runningLeft}</span><span>{runningRight}</span></div>{pageRole === 'chapter-continuation' && currentChapter ? <div className="continuationHeading" data-testid="continuation-heading"><span>Capítulo {currentChapter.chapter}</span><strong>Continuação</strong></div> : <h2 data-testid={pageRole === 'chapter-opening' ? 'chapter-title' : undefined}>{current.title}</h2>}{pageMedia.length > 0 && <div className="multimediaLayer" data-testid="multimedia-layer">{pageMedia.map(renderMultimediaResource)}</div>}{renderSemanticBlocks(current.blocks)}{pageMicrolearning && <ChapterMicrolearningCard data={pageMicrolearning} />}{pageResource && <ChapterResourceCard data={pageResource} />}{currentQuiz && <ChapterQuiz quiz={currentQuiz} />}<div className="pageno">{currentPageNumber}</div></>}</article><div className="readerAnnouncement" aria-live="polite" aria-atomic="true" data-testid="reader-announcement">Página {currentPageNumber} de {pages.length}</div>
    </div></div><div className="status" id="reader-instructions"><span className="readerGestureHint"><span className="gestureWord">Deslize ou arraste</span> para virar a página, clique nas bordas ou use <span className="kbd">←</span> <span className="kbd">→</span>. <span className="kbd">/</span> abre a busca.</span></div></main>
    <nav className="nav" aria-label="Navegação do livro"><button onClick={() => go(page - 1)} disabled={page === 0} aria-label="Página anterior">‹</button><div className="counter" data-testid="page-counter">{page + 1} / {pages.length}</div><button onClick={() => go(page + 1)} disabled={page === pages.length - 1} aria-label="Próxima página">›</button></nav>
    {drawer && <div className="drawer" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="drawer-title" onMouseDown={e => { if (e.target === e.currentTarget) closeDrawer(); }}><aside className="panel"><div className="panelHead"><strong id="drawer-title">{drawer === 'toc' ? 'Sumário' : 'Pesquisar'}</strong><button onClick={closeDrawer} aria-label="Fechar painel">Fechar</button></div>{drawer === 'toc' ? <div className="toc" data-testid="hierarchical-toc">
      <button className={`tocPrimary${currentPageNumber === 1 ? ' current' : ''}`} onClick={() => goPageNumber(1)}><strong>Capa</strong><span>p. 1</span></button>
      {navigation.frontMatter.map(section => <div className="tocFrontGroup" key={section.id}><button className={`tocFront${section.pageNumbers.includes(currentPageNumber) ? ' current' : ''}`} onClick={() => goPageNumber(section.openingPage)}><strong>{section.title}</strong><span>p. {section.openingPage}</span></button>{renderMarkers(section.pedagogicalMarkers)}</div>)}
      {navigation.parts.map(part => { const partCurrent = part.part === currentPartNumber; return <details key={part.id} className={`tocPart${partCurrent ? ' currentPart' : ''}`} data-testid="toc-part" data-part={part.part} open={Boolean(openParts[part.part])} onToggle={event => { const isOpen = event.currentTarget.open; setOpenParts(previous => previous[part.part] === isOpen ? previous : { ...previous, [part.part]: isOpen }); }}><summary><span className="tocPartTitle"><b>Parte {part.part}</b>{part.title}</span><span className="tocMeta">{part.chapters.length} capítulos</span></summary><div className="tocChildren"><div className="tocFrontGroup"><button className={`tocPartOpening${part.openingPage === currentPageNumber ? ' current' : ''}`} onClick={() => goPageNumber(part.openingPage)}><strong>Abertura da parte</strong><span>p. {part.openingPage}</span></button>{renderMarkers(part.pedagogicalMarkers)}</div>
        {part.chapters.map(chapter => { const chapterCurrent = chapter.pageNumbers.includes(currentPageNumber); return <details key={chapter.chapter} className={`tocChapterGroup${chapterCurrent ? ' currentChapter' : ''}`} data-testid="toc-chapter" data-chapter={chapter.chapter}><summary><span><b>Cap. {chapter.chapter}</b> {chapter.title}</span><span className="tocMeta">p. {chapter.openingPage}</span></summary><div className="tocChapterBody"><button data-testid="toc-chapter-open" onClick={() => goPageNumber(chapter.openingPage)}><strong>Abrir capítulo {chapter.chapter}</strong><span>p. {chapter.openingPage}</span></button>{renderMarkers(chapter.pedagogicalMarkers)}</div></details>; })}
        {part.supplementarySections.map(section => <div className="tocSupplementGroup" key={section.id}><button className={`tocSupplement${section.pageNumbers.includes(currentPageNumber) ? ' current' : ''}`} data-testid="toc-supplement" onClick={() => goPageNumber(section.openingPage)}><strong>{section.title}</strong><span>p. {section.openingPage}</span></button>{renderMarkers(section.pedagogicalMarkers)}</div>)}
      </div></details>; })}
    </div> : <><label className="fieldLabel" htmlFor="manual-search">Pesquisar no conteúdo do manual</label><input id="manual-search" ref={searchInputRef} className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite pelo menos 2 caracteres" aria-describedby="manual-search-help" /><p className="srOnly" id="manual-search-help">Digite pelo menos dois caracteres para localizar páginas por título ou conteúdo.</p><div className="hits">{query.trim().length < 2 ? <p>Digite pelo menos 2 caracteres.</p> : results.length ? results.map(({item,index}) => <button key={`${index}-${item.title}`} onClick={() => go(index)}><strong>P. {index + 1} — {item.title}</strong></button>) : <p>Nenhum resultado.</p>}</div></>}</aside></div>}
  </div>;
}