(async () => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));

  async function fetchJson(url, cache = 'force-cache') {
    const response = await fetch(url, { cache });
    if (!response.ok) throw new Error(`Falha ao carregar ${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function fetchChunk(chunk) {
    const response = await fetch(chunk.url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Falha ao carregar ${chunk.url}: HTTP ${response.status}`);
    const source = await response.text();
    if (chunk.sha256 && crypto?.subtle) {
      const bytes = new TextEncoder().encode(source);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      if (actual !== chunk.sha256) throw new Error(`Integridade inválida no bloco ${chunk.id}.`);
    }
    return JSON.parse(source);
  }

  const manifest = await fetchJson('/api/book', 'no-store');
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) {
    throw new Error('O manifesto não informa blocos de conteúdo.');
  }
  const loadedChunks = await Promise.all(manifest.chunks.map(fetchChunk));
  const pageRows = loadedChunks.flat();
  if (pageRows.length !== manifest.availablePages) {
    throw new Error(`Manifesto informa ${manifest.availablePages} páginas, mas ${pageRows.length} foram recebidas.`);
  }
  pageRows.forEach((row, index) => {
    if (!Array.isArray(row) || row[0] !== index + 1) throw new Error(`Sequência inválida na página ${index + 1}.`);
  });

  const classify = (value) => {
    const text = String(value || '').trim();
    const upper = text.toLocaleUpperCase('pt-BR');
    if (/^CAPÍTULO\s+\d+/.test(upper)) return { type: 'chapter', text };
    if (/^REFERÊNCIAS? PRINCIPAIS?:/i.test(text)) return { type: 'ref', text };
    if (/^\d+\.\s+/.test(text)) return { type: 'sub', text };
    if (/^[A-ZÁÀÃÂÉÊÍÓÔÕÚÇ0-9 —–-]{4,}$/.test(text) && text === upper) return { type: 'section', text };
    if (/^[•▪◦]\s*/.test(text)) return { type: 'bullet', text: text.replace(/^[•▪◦]\s*/, '') };
    return { type: 'paragraph', text };
  };
  const mapPart = (value) => Array.isArray(value)
    ? { number: value[0], page: value[1], title: value[2] }
    : value;
  const mapChapter = (value) => Array.isArray(value)
    ? { number: value[0], page: value[1], title: value[2] }
    : value;

  const BOOK = {
    title: manifest.title,
    edition: manifest.edition,
    release: manifest.release,
    complete: manifest.complete,
    targetPages: manifest.targetPages,
    parts: (manifest.meta?.parts || []).map(mapPart),
    chapters: (manifest.meta?.chapters || []).map(mapChapter),
    pages: pageRows.map((row) => ({
      number: row[0],
      part: row[1],
      partTitle: row[2],
      chapter: row[3],
      title: row[4],
      blocks: (row[5] || []).map((block) => Array.isArray(block)
        ? { type: block[0], text: block[1] }
        : classify(block)),
    })),
  };
  const TOTAL = BOOK.pages.length;
  const COVER = `data:image/webp;base64,${window.C || ''}`;
  $('#goto').max = String(TOTAL);
  $('#bookStatus').innerHTML = `<i class="statusdot"></i>${TOTAL} páginas validadas • acervo-alvo ${BOOK.targetPages}`;
  let page = 1;
  let mode = 'book';
  let doublePage = false;
  let busy = false;
  let speaking = false;

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem('catsBookProgress') || '{}'); } catch { return {}; }
  })();
  const hashPage = () => {
    const match = location.hash.match(/p=(\d+)/);
    return match ? Number(match[1]) : null;
  };
  page = Math.min(TOTAL, Math.max(1, hashPage() || saved.page || 1));
  mode = saved.mode || 'book';

  function toast(text) {
    const element = $('#toast');
    element.textContent = text;
    element.classList.add('on');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('on'), 2200);
  }

  function save() {
    try {
      localStorage.setItem('catsBookProgress', JSON.stringify({ page, mode, release: BOOK.release, updatedAt: Date.now() }));
    } catch {}
    history.replaceState(null, '', `#p=${page}`);
  }

  function blockHtml(block) {
    if (block.type === 'section') return `<div class="section">${escapeHtml(block.text)}</div>`;
    if (block.type === 'sub') return `<div class="sub">${escapeHtml(block.text)}</div>`;
    if (block.type === 'bullet') return `<div class="bullet"><span>${escapeHtml(block.text)}</span></div>`;
    if (block.type === 'ref') return `<p class="ref">${escapeHtml(block.text)}</p>`;
    if (block.type === 'chapter') return `<div class="kicker">${escapeHtml(block.text)}</div>`;
    return `<p>${escapeHtml(block.text)}</p>`;
  }

  function enhancement(number) {
    if (number === 6) return '<div class="enh"><h3>Mapa do manual</h3><div class="flow"><span class="chip">Fenômeno</span><span class="arrow">→</span><span class="chip">Ocorrência</span><span class="arrow">→</span><span class="chip">Abordagem</span><span class="arrow">→</span><span class="chip">Tática</span><span class="arrow">→</span><span class="chip">Contextos</span><span class="arrow">→</span><span class="chip">Pós-crise</span><span class="arrow">→</span><span class="chip">Integração</span></div></div>';
    return '';
  }

  function pageHtml(item, side = 'single', scroll = false) {
    const className = scroll ? 'scrollpage' : 'page';
    if (item.number === 1) {
      return `<article id="s1" class="${className} cover ${side}"><img alt="Capa oficial do Manual do Participante CATS" src="${COVER}"></article>`;
    }
    const body = item.blocks.map(blockHtml).join('');
    return `<article id="s${item.number}" class="${className} ${side}"><div class="running"><span>${item.part ? `Parte ${item.part} • ${escapeHtml(item.partTitle)}` : 'CATS • Manual do Participante'}</span><span>${item.chapter ? `Cap. ${item.chapter}` : '2026'}</span></div><div class="kicker">${item.chapter ? `CAPÍTULO ${item.chapter}` : 'CATS'}</div><h2>${escapeHtml(item.title)}</h2>${enhancement(item.number)}${body}<div class="pageno">${item.number}</div></article>`;
  }

  function responsive() {
    doublePage = matchMedia('(min-width:980px)').matches;
    if (doublePage && page > 1 && page % 2 === 1) page -= 1;
  }

  function normalize(number) {
    let normalized = Math.min(TOTAL, Math.max(1, Number(number) || 1));
    if (doublePage && normalized > 1 && normalized % 2 === 1) normalized -= 1;
    return normalized;
  }

  function render() {
    page = normalize(page);
    const spread = $('#spread');
    if (page === 1 || !doublePage) spread.innerHTML = pageHtml(BOOK.pages[page - 1], 'single');
    else spread.innerHTML = pageHtml(BOOK.pages[page - 1], 'left') + (page < TOTAL ? pageHtml(BOOK.pages[page], 'right') : '');
    $('#count').textContent = `${doublePage && page > 1 ? `${page}–${Math.min(TOTAL, page + 1)}` : page} / ${TOTAL}`;
    $('#goto').value = page;
    $('#prev').disabled = page <= 1;
    $('#next').disabled = doublePage && page > 1 ? page + 1 >= TOTAL : page >= TOTAL;
    $('#progress').style.width = `${Math.max(1, page / TOTAL * 100)}%`;
    save();
  }

  function turn(direction) {
    if (busy || mode !== 'book') return;
    const step = doublePage && page > 1 ? 2 : 1;
    const target = page + (direction === 'next' ? step : -step);
    if (target < 1 || target > TOTAL) return;
    busy = true;
    const element = direction === 'next' ? $('#spread .right,#spread .single') : $('#spread .left,#spread .single');
    if (element) element.classList.add(direction === 'next' ? 'turn-next' : 'turn-prev');
    setTimeout(() => { page = target; render(); busy = false; }, 260);
  }

  function closeDrawers() {
    $$('.drawer').forEach((drawer) => drawer.classList.remove('on'));
    if (document.activeElement?.matches('input')) document.activeElement.blur();
  }

  function goToPage(number) {
    page = normalize(number);
    closeDrawers();
    if (mode === 'scroll') {
      buildScroll();
      requestAnimationFrame(() => $(`#s${page}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      save();
    } else render();
  }

  function buildToc() {
    let html = '';
    const availableParts = BOOK.parts.filter((part) => part.page <= TOTAL);
    for (const part of availableParts) {
      html += `<button class="part" data-p="${part.page}"><span>Parte ${part.number} — ${escapeHtml(part.title)}</span><small>${part.page}</small></button>`;
      const nextPart = BOOK.parts.find((candidate) => candidate.number === part.number + 1)?.page || Infinity;
      for (const chapter of BOOK.chapters.filter((candidate) => candidate.page >= part.page && candidate.page < nextPart && candidate.page <= TOTAL)) {
        html += `<button data-p="${chapter.page}"><span>Cap. ${chapter.number} — ${escapeHtml(chapter.title)}</span><small>${chapter.page}</small></button>`;
      }
    }
    $('#toc').innerHTML = html;
    $$('#toc [data-p]').forEach((button) => { button.onclick = () => goToPage(button.dataset.p); });
  }

  function search(query) {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (normalized.length < 2) {
      $('#hits').innerHTML = '<p style="padding:16px;color:#647374">Digite pelo menos 2 caracteres.</p>';
      return;
    }
    const results = [];
    for (const item of BOOK.pages) {
      const text = [item.title, ...item.blocks.map((block) => block.text)].join(' ');
      const index = text.toLocaleLowerCase('pt-BR').indexOf(normalized);
      if (index >= 0) results.push({ number: item.number, title: item.title, excerpt: text.slice(Math.max(0, index - 75), index + 170) });
      if (results.length >= 60) break;
    }
    $('#hits').innerHTML = results.length
      ? results.map((result) => `<button data-h="${result.number}"><b>P. ${result.number} • ${escapeHtml(result.title)}</b><p>${escapeHtml(result.excerpt)}…</p></button>`).join('')
      : '<p style="padding:16px;color:#647374">Nenhum resultado.</p>';
    $$('#hits [data-h]').forEach((button) => { button.onclick = () => goToPage(button.dataset.h); });
  }

  function buildScroll() {
    const element = $('#scroll');
    if (element.dataset.built) return;
    element.innerHTML = BOOK.pages.map((item) => pageHtml(item, 'single', true)).join('');
    element.dataset.built = '1';
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
          const number = Number(entry.target.id.slice(1));
          if (number) { page = number; $('#progress').style.width = `${Math.max(1, page / TOTAL * 100)}%`; save(); }
        }
      }
    }, { threshold: [0.5] });
    $$('#scroll .scrollpage').forEach((element) => observer.observe(element));
  }

  function setMode(nextMode) {
    mode = nextMode;
    if (nextMode === 'scroll') {
      buildScroll();
      $('#workspace').classList.add('hidden');
      $('#nav').classList.add('hidden');
      $('#scroll').classList.add('on');
      $('#scrollB').classList.add('active');
      $('#bookB').classList.remove('active');
      setTimeout(() => $(`#s${page}`)?.scrollIntoView({ block: 'start' }), 30);
    } else {
      $('#workspace').classList.remove('hidden');
      $('#nav').classList.remove('hidden');
      $('#scroll').classList.remove('on');
      $('#bookB').classList.add('active');
      $('#scrollB').classList.remove('active');
      render();
    }
    save();
  }

  function openDrawer(id) {
    $(`#${id}`).classList.add('on');
    setTimeout(() => $(`#${id} input`)?.focus(), 100);
  }

  function textToSpeech() {
    if (!('speechSynthesis' in window)) { toast('Leitura em voz alta indisponível neste navegador.'); return; }
    if (speaking) { speechSynthesis.cancel(); speaking = false; toast('Leitura interrompida.'); return; }
    const item = BOOK.pages[page - 1];
    const text = [item.title, ...item.blocks.filter((block) => !['ref', 'chapter'].includes(block.type)).map((block) => block.text)].join('. ').slice(0, 12000);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.96;
    utterance.onend = () => { speaking = false; };
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    speaking = true;
    toast('Leitura em voz alta iniciada. Toque novamente para parar.');
  }

  function bind() {
    $('#prev').onclick = () => turn('prev');
    $('#next').onclick = () => turn('next');
    $('#tocB').onclick = () => openDrawer('tocD');
    $('#searchB').onclick = () => openDrawer('searchD');
    $('#speakB').onclick = textToSpeech;
    $('#bookB').onclick = () => setMode('book');
    $('#scrollB').onclick = () => setMode('scroll');
    $('#goto').onchange = (event) => goToPage(event.target.value);
    $('#q').oninput = (event) => search(event.target.value);
    $$('[data-close]').forEach((element) => { element.onclick = closeDrawers; });
    $$('.shade').forEach((element) => { element.onclick = closeDrawers; });
    let pointerStart = null;
    $('#stage').addEventListener('pointerdown', (event) => { pointerStart = event.clientX; });
    $('#stage').addEventListener('pointerup', (event) => {
      if (pointerStart == null) return;
      const distance = event.clientX - pointerStart;
      pointerStart = null;
      if (Math.abs(distance) > 60) turn(distance < 0 ? 'next' : 'prev');
    });
    addEventListener('keydown', (event) => {
      if (event.target.matches('input')) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') turn('next');
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') turn('prev');
      if (event.key === 'Escape') closeDrawers();
      if (event.key === '/') { event.preventDefault(); openDrawer('searchD'); }
    });
    addEventListener('hashchange', () => { const number = hashPage(); if (number && number !== page) goToPage(number); });
    matchMedia('(min-width:980px)').addEventListener('change', () => { responsive(); if (mode === 'book') render(); });
  }

  $('#goto').max = TOTAL;
  $('#bookStatus').textContent = BOOK.complete
    ? `Livro digital • ${TOTAL} páginas • 2026`
    : `Onda 1 validada • ${TOTAL} de ${BOOK.targetPages} páginas`;
  responsive();
  buildToc();
  bind();
  setMode(mode);
  setTimeout(() => toast(`Fatia vertical carregada • ${TOTAL} páginas íntegras`), 350);
  window.__CATS_TEST__ = {
    book: BOOK,
    manifest,
    getState: () => ({ page, mode, doublePage, total: TOTAL, target: BOOK.targetPages }),
    goToPage,
    search,
  };
})().catch((error) => {
  console.error(error);
  const spread = document.getElementById('spread');
  if (spread) spread.innerHTML = `<article class="page single"><h2>Falha ao carregar o livro</h2><p>${String(error.message || error)}</p></article>`;
});
