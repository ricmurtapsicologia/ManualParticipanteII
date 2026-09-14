'use client';

import { useState } from 'react';

export type ChapterQuizChoice = { id: string; label: string; correct: boolean };
export type ChapterQuizQuestion = { id: string; prompt: string; choices: ChapterQuizChoice[]; feedback: string };
export type ChapterQuizData = { chapter: number; title: string; openingPage: number; endingPage: number; questions: ChapterQuizQuestion[] };

export function ChapterQuiz({ quiz }: { quiz: ChapterQuizData }) {
  const [answers, setAnswers] = useState<Record<string,string>>({});
  return <section className="chapterQuiz" data-testid="chapter-quiz" data-chapter={quiz.chapter} aria-labelledby={`chapter-quiz-${quiz.chapter}`}>
    <div className="chapterQuizHead">
      <span className="chapterQuizEyebrow">Verificação de aprendizagem</span>
      <h3 id={`chapter-quiz-${quiz.chapter}`}>5 questões de múltipla escolha</h3>
      <p>Selecione uma alternativa. A correção aparece imediatamente.</p>
    </div>
    <div className="chapterQuizQuestions">
      {quiz.questions.map((question, questionIndex) => {
        const selectedId = answers[question.id] ?? null;
        const selected = question.choices.find(choice => choice.id === selectedId) ?? null;
        return <fieldset className="chapterQuizQuestion" data-testid="chapter-quiz-question" key={question.id}>
          <legend><span>{questionIndex + 1}.</span> {question.prompt}</legend>
          <div className="chapterQuizChoices" role="radiogroup" aria-label={`Questão ${questionIndex + 1}`}>
            {question.choices.map(choice => {
              const chosen = selectedId === choice.id;
              const state = chosen ? (choice.correct ? 'correct' : 'incorrect') : 'idle';
              return <button
                type="button"
                key={choice.id}
                role="radio"
                aria-checked={chosen}
                className="chapterQuizChoice"
                data-testid="chapter-quiz-choice"
                data-choice-state={state}
                onClick={() => setAnswers(previous => ({ ...previous, [question.id]: choice.id }))}
              ><span className="chapterQuizLetter" aria-hidden="true">{choice.id}</span><span>{choice.label}</span></button>;
            })}
          </div>
          {selected && <div className="chapterQuizFeedback" data-testid="chapter-quiz-feedback" data-result={selected.correct ? 'correct' : 'incorrect'} aria-live="polite">
            <span className="chapterQuizResult">{selected.correct ? 'Correto.' : 'Resposta incorreta.'}</span>
            <span>{question.feedback}</span>
          </div>}
        </fieldset>;
      })}
    </div>
  </section>;
}
