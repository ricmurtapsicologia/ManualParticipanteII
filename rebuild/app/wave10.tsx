'use client';

import { useState } from 'react';

export type EnrichmentChoice = { id: string; label: string; correct: boolean };
export type ChapterEnrichment = {
  chapter: number;
  title: string;
  openingPage: number;
  endingPage: number;
  microlearning: { id:string; pageNumber:number; title:string; prompt:string; choices:EnrichmentChoice[]; reveal:string };
  transfer: { id:string; pageNumber:number; title:string; apply:string; transfer:string; verify:string };
  resource: { id:string; pageNumber:number; type:'link'|'video'; title:string; url:string; note:string };
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

export function ApplicationTransferCard({ data }: { data: ChapterEnrichment['transfer'] }) {
  return <section className="w10Transfer" data-testid="application-transfer" aria-labelledby={`${data.id}-title`}>
    <div className="w10Kicker">Aprender para usar</div>
    <h3 id={`${data.id}-title`}>{data.title}</h3>
    <div className="w10TransferGrid">
      <div><span className="w10Step">1</span><h4>Aplicar</h4><p>{data.apply}</p></div>
      <div><span className="w10Step">2</span><h4>Transferir</h4><p>{data.transfer}</p></div>
      <div><span className="w10Step">3</span><h4>Verificar</h4><p>{data.verify}</p></div>
    </div>
  </section>;
}

export function ChapterResourceCard({ data }: { data: ChapterEnrichment['resource'] }) {
  return <aside className="w10Resource" data-testid="chapter-resource">
    <div><span className="w10ResourceType">{data.type === 'video' ? 'Vídeo recomendado' : 'Aprofundamento'}</span><h3>{data.title}</h3><p>{data.note}</p></div>
    <a href={data.url} target="_blank" rel="noopener noreferrer" data-testid="chapter-resource-link">{data.type === 'video' ? 'Assistir' : 'Abrir recurso'} <span aria-hidden="true">↗</span></a>
  </aside>;
}
