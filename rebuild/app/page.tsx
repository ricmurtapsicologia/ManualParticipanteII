'use client';

import { useEffect, useMemo, useState } from 'react';
import pagesData from '../content/pages.json';

type BookPage = {
  number?: number;
  part?: number | null;
  partTitle?: string;
  chapter?: number | null;
  title: string;
  paragraphs: string[];
  cover?: boolean;
};
const pages = pagesData as BookPage[];

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function Home() {
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<'toc' | 'search' | null>(null);
  const [query, setQuery] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem('cats-rebuild-page'));
    if (Number.isInteger(saved) && saved >= 0 && saved < pages.length) setPage(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('cats-rebuild-page', String(page));
  }, [page]);

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

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const current = pages[page];
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

  const current = pages[page];
  const progress = ((page + 1) / pages.length) * 100;
  const runningLeft = current.part ? `PARTE ${current.part}${current.partTitle ? ` • ${current.partTitle}` : ''}` : 'CATS • MANUAL DO PARTICIPANTE';
  const runningRight = current.chapter ? `CAPÍTULO ${current.chapter}` : '2026';

  return (
    <div className="shell" data-testid="reader-shell" data-page-count={pages.length} data-wave="6">
      <header className="top">
        <div className="topin">
          <div className="mark">CATS</div>
          <div className="brand"><strong>Manual do Participante CATS</strong><span>Rebuild limpo • Onda 6 • 150 páginas reais</span></div>
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
              <><div className="running"><span>{runningLeft}</span><span>{runningRight}</span></div><h2>{current.title}</h2>{current.paragraphs.map((text, i) => <p key={i}>{text}</p>)}<div className="pageno">{current.number ?? page + 1}</div></>
            )}
          </article>
        </div>
        <div className="status">Use <span className="kbd">←</span> <span className="kbd">→</span> para navegar. <span className="kbd">/</span> abre a busca. Branch: rebuild-clean-v1.</div>
      </main>

      <nav className="nav" aria-label="Navegação do livro">
        <button onClick={() => go(page - 1)} disabled={page === 0} aria-label="Página anterior">‹</button>
        <div className="counter" data-testid="page-counter">{page + 1} / {pages.length}</div>
        <button onClick={() => go(page + 1)} disabled={page === pages.length - 1} aria-label="Próxima página">›</button>
      </nav>

      {drawer && <div className="drawer" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget) setDrawer(null); }}>
        <aside className="panel">
          <div className="panelHead"><strong>{drawer === 'toc' ? 'Sumário' : 'Pesquisar'}</strong><button onClick={() => setDrawer(null)}>Fechar</button></div>
          {drawer === 'toc' ? <div className="toc">{pages.map((item, index) => <button key={`${index}-${item.title}`} onClick={() => go(index)}>{index + 1}. {item.title}</button>)}</div> : <><input className="search" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite pelo menos 2 caracteres" /><div className="hits">{query.trim().length < 2 ? <p>Digite pelo menos 2 caracteres.</p> : results.length ? results.map(({ item, index }) => <button key={`${index}-${item.title}`} onClick={() => go(index)}><strong>P. {index + 1} — {item.title}</strong></button>) : <p>Nenhum resultado.</p>}</div></>}
        </aside>
      </div>}
    </div>
  );
}
