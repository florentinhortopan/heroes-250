import React, { useContext, useEffect, useRef, useState } from 'react';
import useTypewriter from '../hooks/useTypewriter';
import { useNavigate, useParams } from 'react-router-dom';
import quizData from '../data/quiz_data.json';
import { QuizContext } from '../state/QuizContext';
import './Quiz.css';

import Q1 from '../assets/Q1.jpg';
import Q2 from '../assets/Q2.jpg';
import Q3 from '../assets/Q3.jpg';
import Q4 from '../assets/Q4.jpg';

const quizBackgrounds = [Q1, Q2, Q3, Q4];

const ArrowLeftSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" className="injected-svg" role="img" style={{height: '100%', width: '100%'}}>
    <title>arrow-left</title>
    <path d="M13.4481 8.68289L6.67113 15.9999L13.4481 23.3169L14.7171 22.1289L9.74913 16.8099L25.3281 16.8099L25.3281 15.1629L9.74913 15.1629L14.7171 9.84389L13.4481 8.68289Z" fill="white"></path>
  </svg>
);

const CheckMarkSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="41" viewBox="0 0 40 41" fill="none" className="injected-svg" role="img" style={{height: '100%', width: '100%'}}>
    <title>check-mark-circle-v1</title>
    <rect x="1" y="1.98633" width="38" height="38" rx="19" stroke="#221F20" strokeWidth="2"></rect>
    <path d="M16.4596 26.9362L11.3496 20.3661L13.1396 18.9761L16.8096 23.6961L27.1996 15.0361L28.6496 16.7762L16.4596 26.9362Z" fill="#221F20"></path>
  </svg>
);

const QuizPage = () => {
  const { questionId } = useParams();
  // Fade effect removed
  const navigate = useNavigate();
  const { userAnswers, setUserAnswers } = useContext(QuizContext);
  const questionIndex = parseInt(questionId, 10) - 1;
  const question = quizData.questions[questionIndex];

  // Fade effect removed

  if (!question) return <div>Question not found.</div>;

  // Typewriter effect for question text
  const typedQuestion = useTypewriter(question.question, 30);


  const handleSelect = (option) => {
    setUserAnswers({ ...userAnswers, [question.id]: option });
  };

  const handleNext = () => {
    if (questionIndex + 1 < quizData.questions.length) {
      navigate(`/quiz/${questionIndex + 2}`);
    } else {
      navigate('/results');
    }
  };

  const handleBack = () => {
    if (questionIndex > 0) {
      navigate(`/quiz/${questionIndex}`);
    } else {
      navigate('/');
    }
  };

  const selectedId = userAnswers[question.id]?.id;


  const bgImage = quizBackgrounds[questionIndex] || quizBackgrounds[0];

  return (
    <div className="q" data-loading-type="dynamic" data-component="Quiz" data-component-family="CMT">
      <div className="q-bg" style={{backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center center', backgroundRepeat: 'no-repeat'}}></div>
      <fieldset className="q-flex" key={questionId}>
        <div className="q-question">
          <a className="q-back" onClick={handleBack} aria-label="Go back" style={{cursor: 'pointer'}}>
            <div className="icon q-svg"><ArrowLeftSVG /></div>
            <span aria-hidden="true" className="t5">{questionIndex + 1} / {quizData.questions.length}</span>
          </a>
          <legend className="t3" style={{opacity: 1}}>{typedQuestion}</legend>
        </div>
        <div className="q-choice">
          {question.options.map((opt) => (
            <button
              key={opt.id}
              className={`q-button caption${selectedId === opt.id ? ' q-active' : ''}`}
              aria-pressed={selectedId === opt.id}
              onClick={() => handleSelect(opt)}
              style={{pointerEvents: 'auto', opacity: 1}}
            >
              <span>{opt.text}</span>
              <div className="icon q-circle">{selectedId === opt.id && <CheckMarkSVG />}</div>
            </button>
          ))}
          <button
            className="q-next-btn"
            style={{
              marginTop: 32,
              alignSelf: 'flex-end',
              background: 'none',
              border: 'none',
              color: '#ffcc01',
              fontSize: 20,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              cursor: selectedId ? 'pointer' : 'not-allowed',
              opacity: selectedId ? 1 : 0.5,
              pointerEvents: selectedId ? 'auto' : 'none',
              padding: 0
            }}
            onClick={handleNext}
            disabled={!selectedId}
          >
            Next
            <svg style={{marginLeft: 8}} xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><title>arrow-right</title><path d="M18.5519 23.3171L25.3289 16.0001L18.5519 8.68311L17.2829 9.87111L22.2509 15.1901L6.67188 15.1901L6.67188 16.8371L22.2509 16.8371L17.2829 22.1561L18.5519 23.3171Z" fill="#ffcc01"></path></svg>
          </button>
        </div>
      </fieldset>
    </div>
  );
};

export default QuizPage;
