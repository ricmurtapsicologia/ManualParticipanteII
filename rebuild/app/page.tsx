'use client';

import { useEffect, useMemo, useState } from 'react';

type BookPage = { title: string; paragraphs: string[]; cover?: boolean };

const pages: BookPage[] = [
  { cover: true, title: 'Manual do Participante CATS', paragraphs: ['Edição digital interativa 2026', 'Base limpa — Onda 1 • prova de arquitetura'] },
  { title: 'Apresentação', paragraphs: ['Esta versão é uma prova técnica isolada da produção anterior. O objetivo da primeira onda é validar uma base única, previsível e testável antes da migração integral do Manual do Participante CATS.', 'Nenhum componente essencial desta versão depende do jsDelivr. A aplicação, a navegação, o estilo, a busca e o health-check pertencem à própria base do projeto.'] },
  { title: 'Como utilizar este protótipo', paragraphs: ['Use os controles inferiores ou as setas do teclado para avançar e retornar. O sumário permite acesso direto às dez páginas desta primeira onda e a busca localiza termos nos títulos e textos.', 'O progresso é preservado no navegador. Ao retornar, o protótipo tenta restaurar a última página consultada.'] },
  { title: 'Princípio de fonte única', paragraphs: ['A reconstrução parte de um princípio operacional simples: o código versionado deve ser a fonte de verdade. O que estiver em produção deverá corresponder a um commit identificável, sem uma segunda cópia oculta do aplicativo sendo montada manualmente.', 'Esse desenho reduz divergências entre GitHub, build e domínio público e torna cada mudança rastreável.'] },
  { title: 'Leitura e legibilidade', paragraphs: ['O corpo textual deste protótipo utiliza alinhamento justificado, espaçamento confortável e hifenização quando suportada pelo navegador. A intenção é aproximar a leitura digital da experiência editorial do manual sem sacrificar responsividade.', 'A página adapta largura, tipografia e controles para telas menores sem depender de uma versão móvel separada.'] },
  { title: 'Navegação', paragraphs: ['A navegação mantém um estado único de página. Os botões anterior e próxima, o sumário, os resultados da busca e as teclas direcionais atualizam o mesmo estado, evitando múltiplos mecanismos concorrentes.', 'Nesta primeira onda, o efeito visual é deliberadamente simples. A animação de virada de página será acrescentada somente depois que o pipeline estiver comprovadamente estável.'] },
  { title: 'Busca', paragraphs: ['A busca funciona sobre o conteúdo já carregado no protótipo e apresenta resultados por página. Na migração integral, o mesmo contrato poderá ser alimentado pelo corpus completo sem alterar a interface do leitor.', 'Essa separação entre conteúdo e interface permitirá atualizar o manual sem reescrever o mecanismo de navegação.'] },
  { title: 'Leitura em voz alta', paragraphs: ['O comando de voz procura primeiro uma voz instalada cujo nome contenha Antônio ou Antonio. Se ela não existir no dispositivo, usa uma voz disponível em português do Brasil como fallback controlado.', 'A disponibilidade de uma voz específica é determinada pelo sistema operacional e pelo navegador. O aplicativo não deve presumir uma voz que o dispositivo não oferece.'] },
  { title: 'Saúde da aplicação', paragraphs: ['A nova base possui um endpoint próprio de saúde. Ele deve responder diretamente pela aplicação implantada e será utilizado como um dos primeiros sinais de integridade em cada publicação.', 'O health-check não substitui testes de interface. Smoke tests e testes ponta a ponta continuam necessários para confirmar que navegação, conteúdo e recursos do navegador funcionam.'] },
  { title: 'Gate da Onda 1', paragraphs: ['Esta onda é aprovada somente quando a base compilar sem erros, o health-check responder corretamente e uma alteração rastreável no código puder ser associada à versão publicada.', 'Depois desse gate, a próxima onda pode migrar conteúdo real do manual de forma progressiva, preservando a estrutura estável já validada.'] }
];

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

  return (
    <div className="shell">
      <header className="top">
        <div className="topin">
          <div className="mark">CATS</div>
          <div className="brand"><strong>Manual do Participante CATS</strong><span>Rebuild limpo • Onda 1 • 10 páginas</span></div>
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
          <article className={`page${current.cover ? ' cover' : ''}`} lang="pt-BR">
            {current.cover ? (
              <div className="coverContent"><div className="coverEyebrow">Corpo de Bombeiros Militar de Minas Gerais</div><h1>{current.title}</h1>{current.paragraphs.map((text, i) => <p key={i}>{text}</p>)}</div>
            ) : (
              <><div className="running"><span>CATS • Manual do Participante</span><span>Onda 1</span></div><h2>{current.title}</h2>{current.paragraphs.map((text, i) => <p key={i}>{text}</p>)}<div className="pageno">{page + 1}</div></>
            )}
          </article>
        </div>
        <div className="status">Use <span className="kbd">←</span> <span className="kbd">→</span> para navegar. <span className="kbd">/</span> abre a busca. Branch: rebuild-clean-v1.</div>
      </main>

      <nav className="nav" aria-label="Navegação do livro">
        <button onClick={() => go(page - 1)} disabled={page === 0} aria-label="Página anterior">‹</button>
        <div className="counter">{page + 1} / {pages.length}</div>
        <button onClick={() => go(page + 1)} disabled={page === pages.length - 1} aria-label="Próxima página">›</button>
      </nav>

      {drawer && <div className="drawer" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget) setDrawer(null); }}>
        <aside className="panel">
          <div className="panelHead"><strong>{drawer === 'toc' ? 'Sumário' : 'Pesquisar'}</strong><button onClick={() => setDrawer(null)}>Fechar</button></div>
          {drawer === 'toc' ? <div className="toc">{pages.map((item, index) => <button key={item.title} onClick={() => go(index)}>{index + 1}. {item.title}</button>)}</div> : <><input className="search" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite pelo menos 2 caracteres" /><div className="hits">{query.trim().length < 2 ? <p>Digite pelo menos 2 caracteres.</p> : results.length ? results.map(({ item, index }) => <button key={item.title} onClick={() => go(index)}><strong>P. {index + 1} — {item.title}</strong></button>) : <p>Nenhum resultado.</p>}</div></>}
        </aside>
      </div>}
    </div>
  );
}
