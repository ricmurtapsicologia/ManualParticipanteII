'use client';

import { useEffect, useMemo, useState } from 'react';

export type Wave55VideoStep = {
  order: number;
  title: string;
  detail: string;
};

export type Wave55VideoResource = {
  id: string;
  kind: 'video';
  pageNumber: number;
  title: string;
  src: string;
  transcript: string;
  alt?: string;
  steps: Wave55VideoStep[];
  transverse?: string;
};

export function VideoResourceCard({ resource }: { resource: Wave55VideoResource }) {
  const steps = useMemo(() => [...resource.steps].sort((a, b) => a.order - b.order), [resource.steps]);
  const [state, setState] = useState<'idle' | 'playing' | 'paused' | 'ended'>('idle');
  const [index, setIndex] = useState(0);
  const current = steps[index] ?? steps[0];
  const labelId = `${resource.id}-label`;
  const statusId = `${resource.id}-status`;

  useEffect(() => {
    if (state !== 'playing' || steps.length === 0) return;
    const timer = window.setTimeout(() => {
      if (index >= steps.length - 1) {
        setState('ended');
        return;
      }
      setIndex(value => value + 1);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [state, index, steps.length]);

  if (!current || steps.length === 0) return null;

  const play = () => {
    if (state === 'ended') setIndex(0);
    setState('playing');
  };
  const pause = () => {
    if (state === 'playing') setState('paused');
  };
  const restart = () => {
    setIndex(0);
    setState('playing');
  };

  const status = state === 'playing'
    ? `Em reprodução — etapa ${index + 1} de ${steps.length}.`
    : state === 'paused'
      ? `Pausado — etapa ${index + 1} de ${steps.length}.`
      : state === 'ended'
        ? 'Vídeo concluído.'
        : 'Vídeo pronto para reprodução.';

  return (
    <section
      data-testid="video-resource"
      data-media-id={resource.id}
      data-media-kind="video"
      data-media-src={resource.src}
      data-renderer="native-animation"
      aria-labelledby={labelId}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        margin: '0 0 22px',
        padding: 16,
        border: '1px solid #b8cfcb',
        borderRadius: 14,
        background: '#f4f9f8',
        boxShadow: '0 8px 24px rgba(16,75,76,.08)',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 38px', borderRadius: '50%', background: '#0f6260', color: '#fff', fontWeight: 900 }}>▶</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 10, fontWeight: 900, color: '#5b7471', marginBottom: 3 }}>Vídeo didático</div>
          <strong id={labelId} style={{ display: 'block', color: '#104b4c', lineHeight: 1.3 }}>{resource.title}</strong>
          {resource.alt && <span style={{ display: 'block', marginTop: 4, color: '#5e706e', fontSize: 11, lineHeight: 1.45 }}>{resource.alt}</span>}
        </div>
      </div>

      <div
        data-testid="video-stage"
        aria-live="polite"
        style={{
          marginTop: 14,
          minHeight: 190,
          aspectRatio: '16 / 9',
          boxSizing: 'border-box',
          display: 'grid',
          alignContent: 'center',
          gap: 10,
          padding: '18px clamp(14px, 4vw, 28px)',
          borderRadius: 12,
          background: 'linear-gradient(145deg,#082f31,#155c5b)',
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flex: '0 0 36px', borderRadius: '50%', background: 'rgba(255,255,255,.16)', fontWeight: 900 }}>{current.order}</span>
          <strong style={{ fontSize: 'clamp(17px, 4vw, 23px)', lineHeight: 1.15 }}>{current.title}</strong>
        </div>
        <p style={{ margin: 0, color: '#fff', fontSize: 'clamp(14px, 3.5vw, 17px)', lineHeight: 1.45, textAlign: 'left' }}>{current.detail}</p>
        {resource.transverse && <div style={{ marginTop: 4, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,.2)', fontSize: 11, lineHeight: 1.4, fontWeight: 800 }}>↻ {resource.transverse}</div>}
      </div>

      <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 4, marginTop: 9 }}>
        {steps.map((step, stepIndex) => <span key={step.order} style={{ height: 4, borderRadius: 999, background: stepIndex <= index ? '#0f6260' : '#cbdad7' }} />)}
      </div>

      <div role="group" aria-label={`Controles do vídeo: ${resource.title}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 13 }}>
        <button type="button" data-testid="video-play" onClick={play} disabled={state === 'playing'} style={{ minHeight: 40, flex: '1 1 92px', padding: '8px 12px', borderRadius: 9, border: '1px solid #8eb7b1', background: '#fff', color: '#174f4e', fontWeight: 800, cursor: state === 'playing' ? 'not-allowed' : 'pointer', opacity: state === 'playing' ? .5 : 1 }}>{state === 'paused' ? 'Retomar' : state === 'ended' ? 'Rever' : 'Reproduzir'}</button>
        <button type="button" data-testid="video-pause" onClick={pause} disabled={state !== 'playing'} style={{ minHeight: 40, flex: '1 1 92px', padding: '8px 12px', borderRadius: 9, border: '1px solid #8eb7b1', background: '#fff', color: '#174f4e', fontWeight: 800, cursor: state === 'playing' ? 'pointer' : 'not-allowed', opacity: state === 'playing' ? 1 : .5 }}>Pausar</button>
        <button type="button" data-testid="video-restart" onClick={restart} style={{ minHeight: 40, flex: '1 1 92px', padding: '8px 12px', borderRadius: 9, border: '1px solid #8eb7b1', background: '#fff', color: '#174f4e', fontWeight: 800, cursor: 'pointer' }}>Reiniciar</button>
      </div>

      <div id={statusId} data-testid="video-status" aria-live="polite" style={{ marginTop: 9, color: '#5e706e', fontSize: 11, lineHeight: 1.45 }}>{status}</div>
      <details data-testid="video-transcript" style={{ marginTop: 11, borderTop: '1px solid #d2e1de', paddingTop: 10 }}>
        <summary style={{ cursor: 'pointer', color: '#0f6260', fontSize: 12, fontWeight: 900 }}>Ver transcrição completa</summary>
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 14, lineHeight: 1.65 }}>{resource.transcript}</p>
      </details>
    </section>
  );
}
