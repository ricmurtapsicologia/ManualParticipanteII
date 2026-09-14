'use client';

import { useMemo, useState } from 'react';

export type ChapterQuizChoice = { id: string; label: string; correct: boolean };
export type ChapterQuizQuestion = { id: string; prompt: string; choices: ChapterQuizChoice[]; feedback: string };
export type ChapterQuizData = { chapter: number; title: string; openingPage: number; endingPage: number; questions: ChapterQuizQuestion[] };

export function ChapterQuiz({ quiz }: { quiz: ChapterQuizData }) {
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = quiz.questions[currentIndex];
  const selectedId = answers[current.id] ?? null;
  const selected = current.choices.find(choice => choice.id === selectedId) ?? null;
  const answered = useMemo(() => Object.keys(answers).filter(id => quiz.questions.some(question => question.id === id)).length, [answers, quiz.questions]);
  const percent = ((currentIndex + 1) / quiz.questions.length) * 100;

  return <section className="chapterQuiz" data-testid="chapter-quiz" data-chapter={quiz.chapter} aria-labelledby={`chapter-quiz-${quiz.chapter}`}>
    <div className="chapterQuizHead">
      <span className="chapterQuizEyebrow">Verificação de aprendizagem</span>
      <h3 id={`chapter-quiz-${quiz.chapter}`}>Teste do capítulo</h3>
      <p>Uma questão por vez. Escolha uma alternativa e veja a correção imediatamente.</p>
      <div className="chapterQuizProgress" aria-label={`Questão ${currentIndex + 1} de ${quiz.questions.length}`}>
        <div><span>Questão {currentIndex + 1} de {quiz.questions.length}</span><span data-testid="chapter-quiz-answered">{answered} respondidas</span></div>
        <div className="chapterQuizTrack" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
      </div>
    </div>

    <fieldset className="chapterQuizQuestion" data-testid="chapter-quiz-question" data-question-index={currentIndex + 1}>
      <legend>{current.prompt}</legend>
      <div className="chapterQuizChoices" role="radiogroup" aria-label={`Questão ${currentIndex + 1}`}>
        {current.choices.map(choice => {
          const chosen = selectedId === choice.id;
          const state = chosen ? (choice.correct ? 'correct' : 'incorrect') : 'idle';
          return <button type="button" key={choice.id} role="radio" aria-checked={chosen} className="chapterQuizChoice" data-testid="chapter-quiz-choice" data-choice-state={state} onClick={() => setAnswers(previous => ({ ...previous, [current.id]: choice.id }))}>
            <span className="chapterQuizLetter" aria-hidden="true">{choice.id}</span><span>{choice.label}</span>
          </button>;
        })}
      </div>
      {selected && <div className="chapterQuizFeedback" data-testid="chapter-quiz-feedback" data-result={selected.correct ? 'correct' : 'incorrect'} aria-live="polite">
        <span className="chapterQuizResult">{selected.correct ? 'Correto.' : 'Resposta incorreta.'}</span>
        <span>{current.feedback}</span>
      </div>}
    </fieldset>

    <div className="chapterQuizNav">
      <button type="button" onClick={() => setCurrentIndex(index => Math.max(0, index - 1))} disabled={currentIndex === 0} aria-label="Questão anterior">Anterior</button>
      <span>{currentIndex + 1} / {quiz.questions.length}</span>
      <button type="button" onClick={() => setCurrentIndex(index => Math.min(quiz.questions.length - 1, index + 1))} disabled={currentIndex === quiz.questions.length - 1} aria-label="Próxima questão">Próxima</button>
    </div>
  </section>;
}
