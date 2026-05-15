import React, { createContext, useCallback, useMemo, useState } from 'react';

export const QuizContext = createContext();

export const QuizProvider = ({ children }) => {
  const [history, setHistory] = useState([]); // [{ question, answerText, keyword, optionId }]
  const [current, setCurrent] = useState(null); // { question, options: [{ id, text, keyword }] }
  const [done, setDone] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [quizError, setQuizError] = useState(null);
  // Anti-repetition memory for the session: every question stem and every
  // option text the user has been shown, picked or not. seenScenarios tracks
  // which life-context frames (challenge, group, change, legacy, ...) have
  // already been used so the conversation moves across distinct scenarios.
  const [seenQuestions, setSeenQuestions] = useState([]);
  const [seenOptions, setSeenOptions] = useState([]);
  const [seenScenarios, setSeenScenarios] = useState([]);

  const resetQuiz = useCallback(() => {
    setHistory([]);
    setCurrent(null);
    setDone(false);
    setLoadingNext(false);
    setQuizError(null);
    setSeenQuestions([]);
    setSeenOptions([]);
    setSeenScenarios([]);
  }, []);

  const userAnswersMap = useMemo(() => {
    const map = {};
    history.forEach((h, idx) => {
      map[`q${idx + 1}`] = {
        id: h.optionId,
        text: h.answerText,
        keyword: { id: h.keyword },
      };
    });
    return map;
  }, [history]);

  const value = useMemo(
    () => ({
      history,
      setHistory,
      current,
      setCurrent,
      done,
      setDone,
      loadingNext,
      setLoadingNext,
      quizError,
      setQuizError,
      resetQuiz,
      userAnswers: userAnswersMap,
      seenQuestions,
      setSeenQuestions,
      seenOptions,
      setSeenOptions,
      seenScenarios,
      setSeenScenarios,
    }),
    [
      history,
      current,
      done,
      loadingNext,
      quizError,
      resetQuiz,
      userAnswersMap,
      seenQuestions,
      seenOptions,
      seenScenarios,
    ],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
};
