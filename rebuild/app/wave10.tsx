'use client';

import { useState } from 'react';

export type ChapterLearningAsset = {
  chapter: number;
  title: string;
  openingPage: number;
  endingPage: number;
  microlearning: { title: string; prompt: string; reveal: string };
  transfer: { title: string; apply: string; transfer: string };
  resource: { title: string; url: string; source: string };
};

export function ChapterMicrolearning({ asset }: { asset: ChapterLearningAsset }) {
  const [revealed, setRevealed] = useState(false);
  return <section className="w10Card w10Microlearning" data-testid="chapter-microlearning" aria-labelledby={`w10-micro-${asset.chapter}`}>
    <div className="w10CardKicker">Microlearning</div>
    <h3 id={`w10-micro-${asset.chapter}`}>{asset.microlearning.title.replace(/^Microlearning\s*•\s*/u, '')}</h3>
    <p>{asset.microlearning.prompt}</p>
    <button type="button" className="w10Reveal" aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>
      {revealed ? 'Ocultar ponto de comparação' : 'Revelar ponto de comparação'}
    </button>
    {revealed && <div className="w10RevealPanel" data-testid="chapter-microlearning-reveal" aria-live="polite">{asset.microlearning.reveal}</div>}
  </section>;
}

export function ChapterTransfer({ asset }: { asset: ChapterLearningAsset }) {
  return <section className="w10Card w10Transfer" data-testid="chapter-transfer" aria-labelledby={`w10-transfer-${asset.chapter}`}>
    <div className="w10CardKicker">Aplicação e transferência</div>
    <h3 id={`w10-transfer-${asset.chapter}`}>Leve o conteúdo para outra cena</h3>
    <div className="w10TransferGrid">
      <div><span className="w10Step">1</span><p>{asset.transfer.apply}</p></div>
      <div><span className="w10Step">2</span><p>{asset.transfer.transfer}</p></div>
    </div>
  </section>;
}

export function ChapterResource({ asset }: { asset: ChapterLearningAsset }) {
  return <aside className="w10Resource" data-testid="chapter-resource" aria-labelledby={`w10-resource-${asset.chapter}`}>
    <div>
      <span className="w10ResourceLabel">Aprofundamento</span>
      <h3 id={`w10-resource-${asset.chapter}`}>{asset.resource.title}</h3>
      <p>Fonte: {asset.resource.source}. Abra em nova guia e retorne ao capítulo para registrar uma ideia aplicável.</p>
    </div>
    <a href={asset.resource.url} target="_blank" rel="noopener noreferrer" data-testid="chapter-resource-link">Abrir recurso externo <span aria-hidden="true">↗</span></a>
  </aside>;
}
