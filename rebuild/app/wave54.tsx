'use client';

import { useEffect, useRef, useState } from 'react';

export type Wave54AudioResource = {
  id: string;
  kind: 'audio';
  pageNumber: number;
  title: string;
  src: string;
  transcript: string;
  sourceBlockId?: string;
  preferredVoice?: string;
  fallbackLang?: string;
};

export function selectPreferredVoice(preferredName = 'Antônio', _fallbackLang = 'pt-BR') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const normalizedPreferred = preferredName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const preferred = voices.find(voice => voice.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedPreferred));
  if (preferred) return preferred;
  const message = `A voz ${preferredName} não está disponível neste dispositivo. A leitura não será iniciada.`;
  window.alert(message);
  throw new Error(message);
}

export function ApprovedCover() {
  return (
    <figure className="wave54Cover" data-testid="approved-cover" aria-labelledby="cats-cover-title">
      <div className="wave54CoverTopRule" aria-hidden="true" />
      <div className="wave54CoverInner">
        <header className="wave54CoverHeader">
          <div className="wave54CoverWordmark" data-testid="cats-logo" aria-label="CATS">
            <span>C</span><span>A</span><span className="wave54CoverMark">T</span><span>S</span>
          </div>
          <div className="wave54CoverKicker">MANUAL DO PARTICIPANTE</div>
          <h1 id="cats-cover-title">Atendimento a<br />Tentativas de<br />Suicídio</h1>
          <div className="wave54CoverRule" aria-hidden="true" />
          <p className="wave54CoverTagline">Escuta, técnica, segurança e humanidade.</p>
        </header>

        <div className="wave54CoverIllustration" aria-hidden="true">
          <svg viewBox="0 0 900 500" role="img" focusable="false">
            <defs>
              <linearGradient id="catsOrangeBand" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#ef6524" />
                <stop offset="1" stopColor="#ff8b45" />
              </linearGradient>
            </defs>
            <path className="wave54CoverArc" d="M35 420 C170 245, 340 205, 455 295 C585 400, 700 375, 860 190" />
            <path className="wave54CoverArc wave54CoverArcSoft" d="M25 455 C200 300, 320 315, 445 375 C575 438, 710 405, 875 250" />
            <circle cx="180" cy="220" r="70" className="wave54CoverPerson" />
            <path d="M80 410 C95 315, 132 265, 180 265 C232 265, 272 315, 286 410 Z" className="wave54CoverPerson" />
            <path d="M112 188 Q180 112 248 188 L234 213 Q180 172 126 213 Z" className="wave54CoverHelmet" />
            <circle cx="450" cy="250" r="62" className="wave54CoverCenterPerson" />
            <path d="M355 420 C370 335, 405 292, 450 292 C495 292, 530 335, 545 420 Z" className="wave54CoverCenterPerson" />
            <circle cx="720" cy="220" r="70" className="wave54CoverPerson" />
            <path d="M614 410 C628 315, 668 265, 720 265 C770 265, 810 315, 825 410 Z" className="wave54CoverPerson" />
            <path d="M652 188 Q720 112 788 188 L774 213 Q720 172 666 213 Z" className="wave54CoverHelmet" />
            <path d="M260 302 C325 315, 348 330, 392 350" className="wave54CoverSupport" />
            <path d="M640 302 C575 315, 552 330, 508 350" className="wave54CoverSupport" />
            <rect x="0" y="448" width="900" height="30" fill="url(#catsOrangeBand)" transform="rotate(3 450 463)" />
          </svg>
        </div>

        <footer className="wave54CoverFooter">
          <div>
            <strong>Corpo de Bombeiros Militar de Minas Gerais</strong>
            <span>GTO ATS · CATS · Formação especializada</span>
          </div>
          <div className="wave54CoverEdition">
            <strong>Conhecimento que salva vidas</strong>
            <span>Edição digital 2026</span>
          </div>
          <div className="wave54CoverYear">2026</div>
        </footer>
      </div>
      <figcaption className="srOnly">Capa editorial do Manual do Participante CATS - Atendimento a Tentativas de Suicídio.</figcaption>
    </figure>
  );
}

export function AudioResourceCard({ resource }: { resource: Wave54AudioResource }) {
  const [state, setState] = useState<'idle' | 'speaking' | 'paused' | 'unavailable'>('idle');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const preferredVoice = resource.preferredVoice ?? 'Antônio';
  const speechLang = resource.fallbackLang ?? 'pt-BR';
  const labelId = `${resource.id}-label`;
  const statusId = `${resource.id}-status`;

  const stop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setState('idle');
  };

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const play = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState('unavailable');
      return;
    }
    if (state === 'paused') {
      window.speechSynthesis.resume();
      setState('speaking');
      return;
    }
    if (state === 'speaking') return;

    let voice: SpeechSynthesisVoice | null = null;
    try {
      voice = selectPreferredVoice(preferredVoice, speechLang);
    } catch {
      setState('unavailable');
      return;
    }
    if (!voice) {
      setState('unavailable');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(resource.transcript);
    utterance.lang = speechLang;
    utterance.rate = 0.96;
    utterance.voice = voice;
    utterance.onend = () => {
      utteranceRef.current = null;
      setState('idle');
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setState('idle');
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setState('speaking');
  };

  const pause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || state !== 'speaking') return;
    window.speechSynthesis.pause();
    setState('paused');
  };

  const status = state === 'speaking'
    ? 'Reproduzindo áudio com a voz Antônio.'
    : state === 'paused'
      ? 'Áudio pausado.'
      : state === 'unavailable'
        ? 'A voz Antônio não está disponível neste dispositivo. A leitura não foi iniciada.'
        : 'Áudio parado. Voz obrigatória: Antônio.';

  return (
    <section
      className="wave54AudioCard"
      data-testid="audio-resource"
      data-media-id={resource.id}
      data-media-kind="audio"
      data-media-src={resource.src}
      data-preferred-voice={preferredVoice}
      data-voice-policy="required"
      data-speech-lang={speechLang}
      aria-labelledby={labelId}
    >
      <div className="wave54AudioHeader">
        <span className="wave54AudioIcon" aria-hidden="true">◖))</span>
        <div>
          <div className="wave54AudioEyebrow">Áudio de apoio</div>
          <strong id={labelId}>{resource.title}</strong>
        </div>
      </div>
      <div className="wave54AudioControls" role="group" aria-label={`Controles do áudio: ${resource.title}`}>
        <button type="button" onClick={play} disabled={state === 'speaking'} data-testid="audio-play">{state === 'paused' ? 'Retomar' : 'Ouvir'}</button>
        <button type="button" onClick={pause} disabled={state !== 'speaking'} data-testid="audio-pause">Pausar</button>
        <button type="button" onClick={stop} disabled={state === 'idle' || state === 'unavailable'} data-testid="audio-stop">Parar</button>
      </div>
      <div id={statusId} className="wave54AudioStatus" aria-live="polite">{status}</div>
      <details className="wave54Transcript" data-testid="audio-transcript">
        <summary>Ver transcrição</summary>
        <p>{resource.transcript}</p>
      </details>
    </section>
  );
}
