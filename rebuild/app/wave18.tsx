'use client';

import { useState } from 'react';

export type ChapterQuizChoice = { id: string; label: string; correct: boolean };
export type ChapterQuizQuestion = { id: string; prompt: string; choices: ChapterQuizChoice[]; feedback: string };
export type ChapterQuizData = { chapter: number; title: string; openingPage: number; endingPage: number; questions: ChapterQuizQuestion[] };

export function ChapterQuiz({ quiz }: { quiz: ChapterQuizData }) {
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const answered = Object.keys(answers).filter(id => quiz.questions.some(question => question.id === id)).length;

  return <section className="chapterQuiz" data-testid="chapter-quiz" data-chapter={quiz.chapter} aria-labelledby={`chapter-quiz-${quiz.chapter}`}>
    <div className="chapterQuizHead">
      <div className="chapterQuizMeta"><span>Autoavaliação do capítulo</span><span>{answered} de 5 respondidas</span></div>
      <h3 id={`chapter-quiz-${quiz.chapter}`}>Verificação de aprendizagem</h3>
      <p>São cinco questões, com quatro alternativas cada. Selecione uma opção e confira o feedback imediatamente.</p>
      <div className="chapterQuizProgress" aria-hidden="true"><span style={{ width: `${(answered / 5) * 100}%` }} /></div>
    </div>
    <div className="chapterQuizQuestions">
      {quiz.questions.map((question, questionIndex) => {
        const selectedId = answers[question.id] ?? null;
        const selected = question.choices.find(choice => choice.id === selectedId) ?? null;
        return <fieldset className="chapterQuizQuestion" data-testid="chapter-quiz-question" key={question.id}>
          <legend><span className="chapterQuizQuestionNo">Questão {questionIndex + 1} de 5</span><span className="chapterQuizPrompt">{question.prompt}</span></legend>
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
            <span className="chapterQuizResult">{selected.correct ? 'Correto' : 'Revise esta ideia'}</span>
            <p>{question.feedback}</p>
          </div>}
        </fieldset>;
      })}
    </div>
  </section>;
}
