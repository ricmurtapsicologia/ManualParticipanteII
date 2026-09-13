'use client';

import { useEffect, useMemo, useState } from 'react';

const pages = [
  { title: 'Manual do Participante CATS', body: 'Edição digital interativa — MVP técnico da reconstrução limpa.' },
  { title: 'Apresentação', body: 'Esta versão valida a nova arquitetura antes da migração integral do conteúdo canônico.' },
  { title: 'Como usar', body: 'Use os controles de navegação, o sumário, a busca, o progresso salvo e a leitura em voz alta.' },
  { title: 'Sumário inicial', body: 'Parte 1 — Compreender o fenômeno. Capítulo 1 — O CATS e a prática profissional.' },
  { title: 'Princípios do rebuild', body: 'Uma fonte de verdade, um projeto de produção, assets locais e publicação reproduzível.' },
  { title: 'Recursos validados', body: 'Navegação, persistência local, busca, responsividade, texto justificado e TTS.' },
  { title: 'Parte 1 — Compreender o fenômeno', body: 'Início da primeira parte do Manual do Participante CATS.' },
  { title: 'Capítulo 1 — O CATS e a prática profissional', body: 'Conteúdo provisório para validar estrutura, hierarquia editorial e experiência de leitura.' },
  { title: 'Leitura operacional', body: 'O conteúdo definitivo será migrado somente após o pipeline GitHub → Vercel ser comprovado.' },
  { title: 'Gate da Onda 1', body: 'A onda é aprovada quando build, health-check, navegação, busca, TTS e responsividade passarem sem erro.' },
];

export default function Home() {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [voiceName, setVoiceName] = useState('fallback pt-BR');

  useEffect(() => {
    const saved = Number(localStorage.getItem('cats-clean-page') || '0');
    if (saved >= 0 && saved < pages.length) setPage(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('cats-clean-page', String(page));
  }, [page]);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR');
    if (!q) return [];
    return pages.map((p, i) => ({ ...p, i })).filter(p => `${p.title} ${p.body}`.toLocaleLowerCase('pt-BR').includes(q));
  }, [query]);

  function speak() {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => /ant[oô]nio/i.test(v.name)) || voices.find(v => /^pt-BR$/i.test(v.lang)) || voices.find(v => /^pt/i.test(v.lang));
    const u = new SpeechSynthesisUtterance(`${pages[page].title}. ${pages[page].body}`);
    u.lang = 'pt-BR';
    if (preferred) {
      u.voice = preferred;
      setVoiceName(preferred.name);
    } else {
      setVoiceName('fallback pt-BR');
    }
    u.rate = 0.96;
    speechSynthesis.speak(u);
  }

  const current = pages[page];
  const progress = ((page + 1) / pages.length) * 100;

  return (
    <main>
      <header className="topbar">
        <div>
          <strong>Manual do Participante CATS</strong>
          <span>rebuild clean • wave 1</span>
        </div>
        <button onClick={speak}>Ouvir</button>
      </header>

      <div className="progress"><div style={{ width: `${progress}%` }} /></div>

      <section className="workspace">
        <aside>
          <h2>Sumário</h2>
          {pages.map((p, i) => <button key={p.title} className={i === page ? 'active' : ''} onClick={() => setPage(i)}>{i + 1}. {p.title}</button>)}
          <label>
            Buscar
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite um termo" />
          </label>
          {results.map(r => <button key={`r-${r.i}`} onClick={() => { setPage(r.i); setQuery(''); }}>P. {r.i + 1} — {r.title}</button>)}
        </aside>

        <article className="page">
          <div className="running">CATS • Manual do Participante <span>{page + 1} / {pages.length}</span></div>
          <p className="kicker">MVP TÉCNICO</p>
          <h1>{current.title}</h1>
          <p>{current.body}</p>
          <div className="voice">Voz TTS: {voiceName}</div>
        </article>
      </section>

      <nav className="nav">
        <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</button>
        <span>{page + 1} / {pages.length}</span>
        <button disabled={page === pages.length - 1} onClick={() => setPage(p => Math.min(pages.length - 1, p + 1))}>Próxima</button>
      </nav>
    </main>
  );
}
