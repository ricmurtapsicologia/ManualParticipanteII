'use client';

import { useState } from 'react';

export type ChapterQuizChoice = { id: string; label: string; correct: boolean };
export type ChapterQuizQuestion = { id: string; prompt: string; choices: ChapterQuizChoice[]; feedback: string };
export type ChapterQuizData = { chapter: number; title: string; openingPage: number; endingPage: number; questions: ChapterQuizQuestion[] };

export function ChapterQuiz({ quiz }: { quiz: ChapterQuizData }) {
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const answeredCount = quiz.questions.filter(question => Boolean(answers[question.id])).length;
  return <section className="chapterQuiz" data-testid="chapter-quiz" data-chapter={quiz.chapter} aria-labelledby={`chapter-quiz-${quiz.chapter}`}>
    <div className="chapterQuizHead">
      <div className="chapterQuizHeadText">
        <span className="chapterQuizEyebrow">Teste do capítulo</span>
        <h3 id={`chapter-quiz-${quiz.chapter}`}>5 questões para checar compreensão</h3>
        <p>Responda uma questão por vez. A devolutiva aparece imediatamente após a escolha.</p>
      </div>
      <span className="chapterQuizProgress" aria-label={`${answeredCount} de 5 questões respondidas`}>{answeredCount}/5 respondidas</span>
    </div>
    <div className="chapterQuizQuestions">
      {quiz.questions.map((question, questionIndex) => {
        const selectedId = answers[question.id] ?? null;
        const selected = question.choices.find(choice => choice.id === selectedId) ?? null;
        return <fieldset className="chapterQuizQuestion" data-testid="chapter-quiz-question" key={question.id}>
          <legend><span className="chapterQuizQuestionIndex">{questionIndex + 1}</span>{question.prompt}</legend>
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
              ><span className="chapterQuizLetter" aria-hidden="true">{choice.id.toUpperCase()}</span><span>{choice.label}</span></button>;
            })}
          </div>
          {selected && <div className="chapterQuizFeedback" data-testid="chapter-quiz-feedback" data-result={selected.correct ? 'correct' : 'incorrect'} aria-live="polite">
            <span className="chapterQuizResult">{selected.correct ? 'Correto' : 'Revise este ponto'}</span>
            <span>{question.feedback}</span>
          </div>}
        </fieldset>;
      })}
    </div>
  </section>;
}
