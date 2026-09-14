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

export function selectPreferredVoice(preferredName = 'Antônio', fallbackLang = 'pt-BR') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const normalizedPreferred = preferredName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const preferred = voices.find(voice => voice.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedPreferred));
  const exactFallback = voices.find(voice => voice.lang.toLowerCase() === fallbackLang.toLowerCase());
  const genericPortuguese = voices.find(voice => voice.lang.toLowerCase().startsWith('pt'));
  return preferred ?? exactFallback ?? genericPortuguese ?? null;
}

export function ApprovedCover() {
  return (
    <figure className="wave54Cover" data-testid="approved-cover">
      <svg className="wave54CoverArt" viewBox="0 0 800 1000" role="img" aria-labelledby="cats-cover-title cats-cover-desc" data-testid="approved-cover-image">
        <title id="cats-cover-title">Capa do Manual do Participante CATS</title>
        <desc id="cats-cover-desc">Capa institucional em verde escuro e laranja com a marca tipográfica CATS, sem ilustração figurativa.</desc>
        <defs>
          <linearGradient id="cats-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#062f31"/><stop offset="1" stopColor="#01191b"/></linearGradient>
        </defs>
        <rect width="800" height="1000" fill="url(#cats-bg)"/>
        <rect x="0" y="0" width="800" height="16" fill="#ff7300"/>
        <rect x="64" y="650" width="7" height="230" rx="3" fill="#ff7300"/>

        <text x="72" y="152" fill="#f4f2e9" fontSize="46" fontWeight="700" fontFamily="Arial, sans-serif">Manual do</text>
        <text x="72" y="202" fill="#f4f2e9" fontSize="46" fontWeight="700" fontFamily="Arial, sans-serif">Participante</text>
        <text x="72" y="252" fill="#bcd0cb" fontSize="21" fontFamily="Arial, sans-serif">Atendimento a Tentativas de Suicídio</text>
        <line x1="72" y1="292" x2="500" y2="292" stroke="#ff7300" strokeWidth="5"/>
        <text x="72" y="332" fill="#d9e4e1" fontSize="16" fontFamily="Arial, sans-serif" letterSpacing="2">ESCUTA  •  TÉCNICA  •  SEGURANÇA  •  HUMANIDADE</text>

        <g data-testid="cats-logo" transform="translate(150 420)">
          <rect x="0" y="0" width="500" height="190" rx="24" fill="#082b2d" stroke="#ff7300" strokeWidth="8"/>
          <text x="250" y="105" textAnchor="middle" fill="#ff7300" fontSize="86" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="9">CATS</text>
          <text x="250" y="145" textAnchor="middle" fill="#f4f2e9" fontSize="15" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="1.5">ATENDIMENTO A TENTATIVAS DE SUICÍDIO</text>
        </g>

        <text x="72" y="900" fill="#f4f2e9" fontSize="18" fontWeight="700" fontFamily="Arial, sans-serif">CORPO DE BOMBEIROS MILITAR DE MINAS GERAIS</text>
        <text x="72" y="936" fill="#a8beb9" fontSize="15" fontFamily="Arial, sans-serif">Edição digital interativa</text>
        <text x="700" y="936" textAnchor="end" fill="#ff7300" fontSize="18" fontWeight="700" fontFamily="Arial, sans-serif">2026</text>
      </svg>
      <figcaption className="srOnly">Manual do Participante do Curso de Atendimento a Tentativas de Suicídio - CATS.</figcaption>
    </figure>
  );
}

export function AudioResourceCard({ resource }: { resource: Wave54AudioResource }) {
  const [state, setState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const preferredVoice = resource.preferredVoice ?? 'Antônio';
  const fallbackLang = resource.fallbackLang ?? 'pt-BR';
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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (state === 'paused') {
      window.speechSynthesis.resume();
      setState('speaking');
      return;
    }
    if (state === 'speaking') return;

    const utterance = new SpeechSynthesisUtterance(resource.transcript);
    utterance.lang = fallbackLang;
    utterance.rate = 0.96;
    utterance.voice = selectPreferredVoice(preferredVoice, fallbackLang);
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

  const status = state === 'speaking' ? 'Reproduzindo áudio.' : state === 'paused' ? 'Áudio pausado.' : 'Áudio parado.';

  return (
    <section
      className="wave54AudioCard"
      data-testid="audio-resource"
      data-media-id={resource.id}
      data-media-kind="audio"
      data-media-src={resource.src}
      data-preferred-voice={preferredVoice}
      data-fallback-lang={fallbackLang}
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
        <button type="button" onClick={stop} disabled={state === 'idle'} data-testid="audio-stop">Parar</button>
      </div>
      <div id={statusId} className="wave54AudioStatus" aria-live="polite">{status} Voz preferencial: {preferredVoice}; fallback: {fallbackLang}.</div>
      <details className="wave54Transcript" data-testid="audio-transcript">
        <summary>Ver transcrição</summary>
        <p>{resource.transcript}</p>
      </details>
    </section>
  );
}
