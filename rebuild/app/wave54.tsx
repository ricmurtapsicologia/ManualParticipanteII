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

function normalizeVoiceValue(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function selectPreferredVoice(preferredName = 'Antônio', fallbackLang = 'pt-BR') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const normalizedPreferred = normalizeVoiceValue(preferredName);
  const normalizedLang = fallbackLang.toLowerCase();
  const preferred = voices.find(voice => normalizeVoiceValue(voice.name).includes(normalizedPreferred));
  if (preferred) return preferred;

  const exactLanguage = voices.find(voice => voice.lang.toLowerCase() === normalizedLang);
  if (exactLanguage) return exactLanguage;

  const portuguese = voices.find(voice => voice.lang.toLowerCase().startsWith('pt'));
  if (portuguese) return portuguese;

  return voices.find(voice => voice.default) ?? voices[0] ?? null;
}

export function ApprovedCover() {
  return (
    <figure className="wave54Cover canonicalCoverStack" data-testid="approved-cover" aria-labelledby="cats-cover-caption">
      <div className="canonicalCoverFrame">
        <img
          className="canonicalCoverImage"
          data-testid="approved-cover-image"
          src="/assets/manual-cats/2026/manual-cats-capa-digital-2026.jpg"
          alt="Capa oficial do Manual do Participante CATS — Atendimento a Tentativas de Suicídio — Edição Digital 2026."
          width={961}
          height={1536}
          fetchPriority="high"
        />
      </div>
      <span className="srOnly" data-testid="cats-logo">CATS</span>
      <figcaption id="cats-cover-caption" className="srOnly">Manual do Participante CATS — Atendimento a Tentativas de Suicídio. Escuta, Técnica, Segurança e Humanidade. Edição Digital 2026. CBMMG · GTO ATS · CATS.</figcaption>
    </figure>
  );
}

export function AudioResourceCard({ resource }: { resource: Wave54AudioResource }) {
  const [state, setState] = useState<'idle' | 'speaking' | 'paused' | 'unavailable'>('idle');
  const [activeVoiceName, setActiveVoiceName] = useState<string | null>(null);
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

    const voice = selectPreferredVoice(preferredVoice, speechLang);
    const utterance = new SpeechSynthesisUtterance(resource.transcript);
    utterance.lang = speechLang;
    utterance.rate = 0.96;
    if (voice) utterance.voice = voice;
    setActiveVoiceName(voice?.name ?? `voz padrão ${speechLang}`);
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
    ? `Reproduzindo em português com ${activeVoiceName ?? preferredVoice}.`
    : state === 'paused'
      ? 'Áudio pausado.'
      : state === 'unavailable'
        ? 'A leitura em voz alta não é suportada por este navegador.'
        : `Voz preferencial: ${preferredVoice}. Se ela não estiver disponível, outra voz em português será usada automaticamente.`;

  return (
    <section
      className="wave54AudioCard"
      data-testid="audio-resource"
      data-media-id={resource.id}
      data-media-kind="audio"
      data-media-src={resource.src}
      data-preferred-voice={preferredVoice}
      data-voice-policy="prefer-with-fallback"
      data-fallback-lang={speechLang}
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
