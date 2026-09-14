'use client';

import { useState } from 'react';

export type ChapterResource = { chapter: number; label: string; url: string };

type Props = {
  chapter: number;
  chapterTitle: string;
  objective: string;
  summary: string;
  resource: ChapterResource;
};

function cleanBullet(value: string) {
  return value.replace(/^\s*•\s*/u, '').trim();
}

export function ChapterLearning({ chapter, chapterTitle, objective, summary, resource }: Props) {
  const [revealed, setRevealed] = useState(false);
  const objectiveText = cleanBullet(objective);
  const summaryText = cleanBullet(summary);
  const answerId = `chapter-${chapter}-microlearning-answer`;

  return <section className="chapterLearning" data-testid="chapter-learning" aria-label={`Consolidação do capítulo ${chapter}`}>
    <div className="microlearningChapter" data-testid="microlearning-chapter">
      <div className="learningLabel">Microlearning</div>
      <h3>Recupere antes de consultar</h3>
      <p className="learningPrompt">No capítulo “{chapterTitle}”, qual princípio precisa permanecer acessível quando a situação muda?</p>
      <button type="button" className="learningReveal" aria-expanded={revealed} aria-controls={answerId} onClick={() => setRevealed(value => !value)}>
        {revealed ? 'Ocultar ponto-chave' : 'Mostrar ponto-chave'}
      </button>
      {revealed && <div id={answerId} className="learningAnswer" aria-live="polite"><span>Ponto-chave</span><p>{summaryText}</p></div>}
    </div>

    <div className="applicationTransfer" data-testid="application-transfer">
      <div className="learningLabel">Aplicação e transferência</div>
      <div className="transferGrid">
        <div><span className="transferTag">Aplicação</span><p>{objectiveText}</p></div>
        <div><span className="transferTag">Transferência</span><p>Leve este princípio para um cenário diferente e identifique o que permanece válido, o que muda e qual dado exigiria reavaliar a decisão.</p></div>
      </div>
    </div>

    <a className="chapterResource" data-testid="chapter-resource" href={resource.url} target="_blank" rel="noopener noreferrer">
      <span><small>Aprofundamento</small>{resource.label}</span><strong aria-hidden="true">↗</strong>
    </a>
  </section>;
}
