'use client';

import { useState } from 'react';

export type EnrichmentChoice = { id: string; label: string; correct: boolean };
export type ChapterEnrichment = {
  chapter: number;
  title: string;
  openingPage: number;
  endingPage: number;
  microlearning: { id:string; pageNumber:number; title:string; prompt:string; choices:EnrichmentChoice[]; reveal:string };
  resource: { id:string; pageNumber:number; type:'link'; title:string; url:string; note:string; language?:'pt-BR' };
};

export function ChapterMicrolearningCard({ data }: { data: ChapterEnrichment['microlearning'] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const choice = data.choices.find(item => item.id === selected) ?? null;
  return <section className="w10Micro" data-testid="chapter-microlearning" aria-labelledby={`${data.id}-title`}>
    <div className="w10Kicker">Microlearning</div>
    <h3 id={`${data.id}-title`}>{data.title}</h3>
    <p className="w10MicroPrompt">{data.prompt}</p>
    <div className="w10MicroChoices" role="radiogroup" aria-label="Microlearning do capítulo">
      {data.choices.map(item => <button
        key={item.id}
        type="button"
        role="radio"
        aria-checked={selected === item.id}
        data-testid="chapter-microlearning-choice"
        data-state={selected === item.id ? (item.correct ? 'correct' : 'incorrect') : 'idle'}
        onClick={() => setSelected(item.id)}
      ><span className="w10ChoiceLetter" aria-hidden="true">{item.id}</span><span>{item.label}</span></button>)}
    </div>
    {choice && <div className="w10MicroFeedback" data-testid="chapter-microlearning-feedback" data-result={choice.correct ? 'correct' : 'incorrect'} aria-live="polite">
      <span className="w10FeedbackState">{choice.correct ? 'Correto.' : 'Revise o ponto-chave.'}</span>
      <span>{data.reveal}</span>
    </div>}
  </section>;
}

export function ChapterResourceCard({ data }: { data: ChapterEnrichment['resource'] }) {
  return <aside className="w10Resource" data-testid="chapter-resource" data-resource-language={data.language ?? 'pt-BR'}>
    <div><span className="w10ResourceType">Material escrito em português</span><h3>{data.title}</h3><p>{data.note}</p></div>
    <a href={data.url} target="_blank" rel="noopener noreferrer" data-testid="chapter-resource-link" lang="pt-BR">Abrir material <span aria-hidden="true">↗</span></a>
  </aside>;
}
