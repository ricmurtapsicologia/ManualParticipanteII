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
        <desc id="cats-cover-desc">Capa institucional em verde escuro e laranja, com composição gráfica inspirada em capacete de bombeiro e foco em escuta, técnica, segurança e humanidade.</desc>
        <defs>
          <linearGradient id="cats-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#062f31"/><stop offset="1" stopColor="#01191b"/></linearGradient>
          <linearGradient id="cats-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7a00"/><stop offset="1" stopColor="#d95200"/></linearGradient>
        </defs>
        <rect width="800" height="1000" fill="url(#cats-bg)"/>
        <rect x="0" y="0" width="800" height="16" fill="#ff7300"/>
        <rect x="64" y="660" width="7" height="220" rx="3" fill="#ff7300"/>
        <circle cx="650" cy="180" r="210" fill="#0a4648" opacity=".38"/>
        <circle cx="690" cy="220" r="125" fill="#0e5557" opacity=".25"/>
        <g opacity=".98">
          <path d="M95 590c20-125 104-205 225-205s205 80 225 205H95Z" fill="url(#cats-glow)"/>
          <path d="M145 590c15-92 78-151 175-151s160 59 175 151H145Z" fill="#0a2729"/>
          <rect x="118" y="565" width="404" height="54" rx="24" fill="#101b1c"/>
          <rect x="250" y="520" width="140" height="38" rx="12" fill="#ff7300"/>
          <path d="M182 610h278l60 116H122l60-116Z" fill="#071d1f"/>
          <path d="M225 622h192l30 92H195l30-92Z" fill="#0f3a3c"/>
        </g>
        <text x="72" y="112" fill="#ff7300" fontSize="26" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="2">CATS</text>
        <text x="72" y="166" fill="#f4f2e9" fontSize="46" fontWeight="700" fontFamily="Arial, sans-serif">Manual do</text>
        <text x="72" y="216" fill="#f4f2e9" fontSize="46" fontWeight="700" fontFamily="Arial, sans-serif">Participante</text>
        <text x="72" y="266" fill="#bcd0cb" fontSize="21" fontFamily="Arial, sans-serif">Atendimento a Tentativas de Suicídio</text>
        <line x1="72" y1="302" x2="500" y2="302" stroke="#ff7300" strokeWidth="5"/>
        <text x="72" y="342" fill="#d9e4e1" fontSize="16" fontFamily="Arial, sans-serif" letterSpacing="2">ESCUTA  •  TÉCNICA  •  SEGURANÇA  •  HUMANIDADE</text>
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
