import React, { createContext, useState } from 'react';

export const QuizContext = createContext();

export const QuizProvider = ({ children }) => {
  const [userAnswers, setUserAnswers] = useState({});
  return (
    <QuizContext.Provider value={{ userAnswers, setUserAnswers }}>
      {children}
    </QuizContext.Provider>
  );
};
