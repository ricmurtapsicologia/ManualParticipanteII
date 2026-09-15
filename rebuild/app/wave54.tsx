'use client';

import { useEffect, useRef, useState } from 'react';
import { approvedCoverDataUrl } from './cover-data';

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
    <figure className="wave54Cover" data-testid="approved-cover">
      <img
        className="wave54CoverArt"
        src={approvedCoverDataUrl}
        alt="Capa oficial do Manual do Participante CATS, com bombeiros militares acolhendo uma pessoa em crise."
        data-testid="approved-cover-image"
      />
      <span className="srOnly" data-testid="cats-logo">CATS</span>
      <figcaption className="srOnly">Manual do Participante do Curso de Atendimento a Tentativas de Suicídio - CATS.</figcaption>
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
