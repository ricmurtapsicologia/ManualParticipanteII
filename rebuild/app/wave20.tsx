'use client';

import { useState } from 'react';

export type ChapterLearningData = {
  chapter: number;
  title: string;
  openingPage: number;
  endingPage: number;
  application: string;
  transfer: string;
  microPrompt: string;
  microAnswer: string;
  resource: { label: string; url: string };
};

export function ChapterLearningCard({ item }: { item: ChapterLearningData }) {
  const [revealed, setRevealed] = useState(false);
  const labelId = `chapter-learning-${item.chapter}`;
  const microId = `chapter-micro-${item.chapter}`;

  return <section className="chapterLearning" data-testid="chapter-learning" data-chapter={item.chapter} aria-labelledby={labelId}>
    <div className="chapterLearningHead">
      <span className="chapterLearningEyebrow">Fechamento do capítulo</span>
      <h3 id={labelId}>Aplicação e transferência</h3>
      <p>Converta o conteúdo em uma ação observável antes de avançar.</p>
    </div>

    <div className="chapterTransferGrid">
      <div className="chapterTransferCard">
        <span className="chapterTransferLabel">Aplicação imediata</span>
        <p>{item.application}</p>
      </div>
      <div className="chapterTransferCard">
        <span className="chapterTransferLabel">Transferência para a ocorrência</span>
        <p>{item.transfer}</p>
      </div>
    </div>

    <div className="chapterMicro" data-testid="chapter-microlearning" aria-labelledby={microId}>
      <div className="chapterMicroHead">
        <span className="chapterMicroTag">Microlearning • 60 segundos</span>
        <h4 id={microId}>Recuperação ativa</h4>
      </div>
      <p className="chapterMicroPrompt">{item.microPrompt}</p>
      <button type="button" className="chapterMicroButton" onClick={() => setRevealed(value => !value)} aria-expanded={revealed}>
        {revealed ? 'Ocultar ponto-chave' : 'Conferir ponto-chave'}
      </button>
      {revealed && <div className="chapterMicroAnswer" data-testid="chapter-microlearning-answer" aria-live="polite">
        <span>Ponto-chave</span>
        <p>{item.microAnswer}</p>
      </div>}
    </div>

    <div className="chapterResource">
      <div>
        <span className="chapterResourceLabel">Aprofundamento</span>
        <p>{item.resource.label}</p>
      </div>
      <a href={item.resource.url} target="_blank" rel="noreferrer noopener" data-testid="chapter-resource-link">Abrir recurso externo ↗</a>
    </div>
  </section>;
}
