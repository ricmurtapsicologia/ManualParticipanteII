'use client';

import { useEffect, useMemo, useState } from 'react';
import pagesData from '../content/pages.json';
import navigationData from '../content/navigation.json';

type BookPage = {
  number?: number;
  part?: number | null;
  partTitle?: string;
  chapter?: number | null;
  title: string;
  paragraphs: string[];
  cover?: boolean;
};

type PedagogicalMarker = { kind: string; pageNumber: number; blockId: string };
type NavChapter = { chapter: number; title: string; openingPage: number; pageNumbers: number[]; pedagogicalMarkers: PedagogicalMarker[] };
type NavSupplement = { id: string; title: string; openingPage: number; pageNumbers: number[] };
type NavPart = { id: string; part: number; title: string; openingPage: number; chapters: NavChapter[]; supplementarySections: NavSupplement[] };
type NavigationArtifact = {
  schemaVersion: number;
  sourcePageCount: number;
  chapterCount: number;
  pedagogicalMarkerCount: number;
  frontMatter: NavSupplement[];
  parts: NavPart[];
};

const pages = pagesData as BookPage[];
const navigation = navigationData as NavigationArtifact;
const pageNumberToIndex = new Map(pages.map((item, index) => [item.number ?? index + 1, index]));

const markerLabels: Record<string, string> = {
  opening: 'Situação de abertura',
  objectives: 'Objetivos',
  doctrine: 'Doutrina',
  evidence: 'Evidência',
  practice: 'Na prática',
  attention: 'Atenção',
  decide: 'Decida',
  case: 'Caso para decisão',
  'guided-analysis': 'Análise orientadora',
  summary: 'Síntese',
  review: 'Questões de revisão'
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function findPartForPage(pageNumber: number) {
  return navigation.parts.find(part =>
    part.openingPage === pageNumber ||
    part.chapters.some(chapter => chapter.pageNumbers.includes(pageNumber)) ||
    part.supplementarySections.some(section => section.pageNumbers.includes(pageNumber))
  ) ?? null;
}

export default function Home() {
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<'toc' | 'search' | null>(null);
  const [query, setQuery] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [openParts, setOpenParts] = useState<Record<number, boolean>>({ 1: true });

  const current = pages[page];
  const currentPageNumber = current.number ?? page + 1;
  const currentPart = findPartForPage(currentPageNumber);
  const currentPartNumber = currentPart?.part ?? null;
  const currentChapter = currentPart?.chapters.find(chapter => chapter.pageNumbers.includes(currentPageNumber)) ?? null;

  useEffect(() => {
    const saved = Number(localStorage.getItem('cats-rebuild-page'));
    if (Number.isInteger(saved) && saved >= 0 && saved < pages.length) setPage(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('cats-rebuild-page', String(page));
  }, [page]);

  useEffect(() => {
    if (drawer !== 'toc' || !currentPartNumber) return;
    setOpenParts(previous => previous[currentPartNumber] ? previous : { ...previous, [currentPartNumber]: true });
  }, [drawer, currentPartNumber]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setPage(p => Math.min(pages.length - 1, p + 1));
      if (event.key === 'ArrowLeft') setPage(p => Math.max(0, p - 1));
      if (event.key === '/' && !drawer) { event.preventDefault(); setDrawer('search'); }
      if (event.key === 'Escape') setDrawer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    return pages.map((item, index) => ({ item, index })).filter(({ item }) => normalize([item.title, ...item.paragraphs].join(' ')).includes(q));
  }, [query]);

  const go = (index: number) => {
    setPage(Math.min(pages.length - 1, Math.max(0, index)));
    setDrawer(null);
  };

  const goPageNumber = (pageNumber: number) => {
    go(pageNumberToIndex.get(pageNumber) ?? pageNumber - 1);
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance([current.title, ...current.paragraphs].join('. '));
    const voices = window.speechSynthesis.getVoices();
    const antonio = voices.find(v => /ant[oô]nio/i.test(v.name));
    const ptBr = voices.find(v => v.lang.toLowerCase() === 'pt-br');
    utterance.voice = antonio ?? ptBr ?? null;
    utterance.lang = 'pt-BR';
    utterance.rate = 0.96;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const progress = ((page + 1) / pages.length) * 100;
  const runningLeft = currentPart ? `PARTE ${currentPart.part} • ${currentPart.title}` : 'CATS • MANUAL DO PARTICIPANTE';
  const runningRight = currentChapter ? `CAPÍTULO ${currentChapter.chapter}` : currentPart ? `PARTE ${currentPart.part}` : '2026';

  return (
    <div className="shell" data-testid="reader-shell" data-page-count={pages.length} data-wave="8" data-editorial-wave="13">
      <header className="top">
        <div className="topin">
          <div className="mark">CATS</div>
          <div className="brand"><strong>Manual do Participante CATS</strong><span>Edição Digital Interativa • 249 páginas</span></div>
          <div className="tools">
            <button onClick={speak} className={speaking ? 'active' : ''} aria-label="Leitura em voz alta">◖)) <span>{speaking ? 'Parar' : 'Ouvir'}</span></button>
            <button onClick={() => setDrawer('search')} aria-label="Pesquisar">⌕ <span>Buscar</span></button>
            <button onClick={() => setDrawer('toc')} aria-label="Sumário">☰ <span>Sumário</span></button>
          </div>
        </div>
        <div className="progressTrack"><div className="progress" style={{ width: `${progress}%` }} /></div>
      </header>

      <main className="main">
        <div className="book">
          <article className={`page${current.cover ? ' cover' : ''}`} lang="pt-BR" data-testid="book-page">
            {current.cover ? (
              <div className="coverContent"><div className="coverEyebrow">Corpo de Bombeiros Militar de Minas Gerais</div><h1>{current.title}</h1>{current.paragraphs.map((text, i) => <p key={i}>{text}</p>)}</div>
            ) : (
              <><div className="running"><span>{runningLeft}</span><span>{runningRight}</span></div><h2>{current.title}</h2>{current.paragraphs.map((text, i) => <p key={i}>{text}</p>)}<div className="pageno">{currentPageNumber}</div></>
            )}
          </article>
        </div>
        <div className="status">Use <span className="kbd">←</span> <span className="kbd">→</span> para navegar. <span className="kbd">/</span> abre a busca. Conteúdo canônico.</div>
      </main>

      <nav className="nav" aria-label="Navegação do livro">
        <button onClick={() => go(page - 1)} disabled={page === 0} aria-label="Página anterior">‹</button>
        <div className="counter" data-testid="page-counter">{page + 1} / {pages.length}</div>
        <button onClick={() => go(page + 1)} disabled={page === pages.length - 1} aria-label="Próxima página">›</button>
      </nav>

      {drawer && <div className="drawer" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget) setDrawer(null); }}>
        <aside className="panel">
          <div className="panelHead"><strong>{drawer === 'toc' ? 'Sumário' : 'Pesquisar'}</strong><button onClick={() => setDrawer(null)}>Fechar</button></div>
          {drawer === 'toc' ? (
            <div className="toc" data-testid="hierarchical-toc">
              <button className={`tocPrimary${currentPageNumber === 1 ? ' current' : ''}`} onClick={() => goPageNumber(1)}><strong>Capa</strong><span>p. 1</span></button>
              {navigation.frontMatter.map(section => <button key={section.id} className={`tocFront${section.pageNumbers.includes(currentPageNumber) ? ' current' : ''}`} onClick={() => goPageNumber(section.openingPage)}><strong>{section.title}</strong><span>p. {section.openingPage}</span></button>)}
              {navigation.parts.map(part => {
                const partCurrent = part.part === currentPartNumber;
                return (
                  <details key={part.id} className={`tocPart${partCurrent ? ' currentPart' : ''}`} data-testid="toc-part" data-part={part.part} open={Boolean(openParts[part.part])} onToggle={event => {
                    const isOpen = event.currentTarget.open;
                    setOpenParts(previous => previous[part.part] === isOpen ? previous : { ...previous, [part.part]: isOpen });
                  }}>
                    <summary><span className="tocPartTitle"><b>Parte {part.part}</b>{part.title}</span><span className="tocMeta">{part.chapters.length} capítulos</span></summary>
                    <div className="tocChildren">
                      <button className={`tocPartOpening${part.openingPage === currentPageNumber ? ' current' : ''}`} onClick={() => goPageNumber(part.openingPage)}><strong>Abertura da parte</strong><span>p. {part.openingPage}</span></button>
                      {part.chapters.map(chapter => {
                        const chapterCurrent = chapter.pageNumbers.includes(currentPageNumber);
                        return (
                          <details key={chapter.chapter} className={`tocChapterGroup${chapterCurrent ? ' currentChapter' : ''}`} data-testid="toc-chapter" data-chapter={chapter.chapter}>
                            <summary><span><b>Cap. {chapter.chapter}</b> {chapter.title}</span><span className="tocMeta">p. {chapter.openingPage}</span></summary>
                            <div className="tocChapterBody">
                              <button data-testid="toc-chapter-open" onClick={() => goPageNumber(chapter.openingPage)}><strong>Abrir capítulo {chapter.chapter}</strong><span>p. {chapter.openingPage}</span></button>
                              {chapter.pedagogicalMarkers.length > 0 && <div className="tocMarkers" aria-label={`Seções pedagógicas do capítulo ${chapter.chapter}`}>{chapter.pedagogicalMarkers.map(marker => <button key={marker.blockId} data-testid="toc-marker" onClick={() => goPageNumber(marker.pageNumber)}><span>{markerLabels[marker.kind] ?? marker.kind}</span><small>p. {marker.pageNumber}</small></button>)}</div>}
                            </div>
                          </details>
                        );
                      })}
                      {part.supplementarySections.map(section => <button key={section.id} className={`tocSupplement${section.pageNumbers.includes(currentPageNumber) ? ' current' : ''}`} data-testid="toc-supplement" onClick={() => goPageNumber(section.openingPage)}><strong>{section.title}</strong><span>p. {section.openingPage}</span></button>)}
                    </div>
                  </details>
                );
              })}
            </div>
          ) : <><input className="search" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite pelo menos 2 caracteres" /><div className="hits">{query.trim().length < 2 ? <p>Digite pelo menos 2 caracteres.</p> : results.length ? results.map(({ item, index }) => <button key={`${index}-${item.title}`} onClick={() => go(index)}><strong>P. {index + 1} — {item.title}</strong></button>) : <p>Nenhum resultado.</p>}</div></>}
        </aside>
      </div>}
    </div>
  );
}
