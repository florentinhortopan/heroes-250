import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import useTypewriter from '../hooks/useTypewriter';
import { useNavigate } from 'react-router-dom';
import quizFallback from '../data/quiz_data.json';
import heroData from '../data/hero_data.json';
import { computeSnapshot } from '../lib/scoring';
import { QuizContext } from '../state/QuizContext';
import './Quiz.css';

import Q1 from '../../public/assets/Q1.jpg';
import Q2 from '../../public/assets/Q2.jpg';
import Q3 from '../../public/assets/Q3.jpg';
import Q4 from '../../public/assets/Q4.jpg';
import Q5 from '../../public/assets/army-career-match-searching_lg.jpg';
import Q6 from '../../public/assets/army-career-match-doctors_lg.jpg';
import Q7 from '../../public/assets/army-career-match-programing_lg.jpg';

const quizBackgrounds = [Q1, Q2, Q3, Q4, Q5, Q6, Q7];

// Quiz length is configurable so we can A/B test shorter flows. Resolution
// order (highest priority first):
//   1. URL query param  ->  /quiz?length=3   (great for ad-hoc testing)
//   2. sessionStorage   ->  persists across in-session navigations / retakes
//   3. Vite env var     ->  VITE_QUIZ_LENGTH (deployment-level default)
//   4. Hardcoded 6      ->  product default
// Setting MIN == MAX disables the server's early-stop, so every quiz lands
// on exactly the chosen length and the breadcrumb progression stays honest.
const QUIZ_LENGTH_DEFAULT = 6;
const MIN_QUIZ_LENGTH = 3;
const MAX_QUIZ_LENGTH = 10;
const QUIZ_LENGTH_STORAGE_KEY = 'quizLength';
const QUIZ_ANSWERS_DEFAULT = 4;
const MIN_QUIZ_ANSWERS = 2;
const MAX_QUIZ_ANSWERS = 6;
const QUIZ_ANSWERS_STORAGE_KEY = 'quizAnswers';

function clampLength(n) {
  if (!Number.isFinite(n)) return null;
  if (n < MIN_QUIZ_LENGTH || n > MAX_QUIZ_LENGTH) return null;
  return Math.floor(n);
}

function clampAnswers(n) {
  if (!Number.isFinite(n)) return null;
  if (n < MIN_QUIZ_ANSWERS || n > MAX_QUIZ_ANSWERS) return null;
  return Math.floor(n);
}

function readQuizLength() {
  if (typeof window === 'undefined') return QUIZ_LENGTH_DEFAULT;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = clampLength(parseInt(params.get('length') || '', 10));
    if (fromUrl) {
      window.sessionStorage?.setItem(QUIZ_LENGTH_STORAGE_KEY, String(fromUrl));
      return fromUrl;
    }
  } catch {
    // sessionStorage / URL access can throw in some embedded contexts; fall through.
  }
  const fromEnv = clampLength(parseInt(import.meta.env?.VITE_QUIZ_LENGTH || '', 10));
  if (fromEnv) return fromEnv;
  try {
    const fromSession = clampLength(
      parseInt(window.sessionStorage?.getItem(QUIZ_LENGTH_STORAGE_KEY) || '', 10),
    );
    if (fromSession) return fromSession;
  } catch {
    // ignore sessionStorage read errors
  }
  return QUIZ_LENGTH_DEFAULT;
}

function readQuizAnswers() {
  if (typeof window === 'undefined') return QUIZ_ANSWERS_DEFAULT;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = clampAnswers(parseInt(params.get('answers') || '', 10));
    if (fromUrl) {
      window.sessionStorage?.setItem(QUIZ_ANSWERS_STORAGE_KEY, String(fromUrl));
      return fromUrl;
    }
  } catch {
    // sessionStorage / URL access can throw in some embedded contexts; fall through.
  }
  const fromEnv = clampAnswers(parseInt(import.meta.env?.VITE_QUIZ_ANSWERS || '', 10));
  if (fromEnv) return fromEnv;
  try {
    const fromSession = clampAnswers(
      parseInt(window.sessionStorage?.getItem(QUIZ_ANSWERS_STORAGE_KEY) || '', 10),
    );
    if (fromSession) return fromSession;
  } catch {
    // ignore sessionStorage read errors
  }
  return QUIZ_ANSWERS_DEFAULT;
}

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

function fallbackQuestion(historyLength, answerCount = 4) {
  // First static question as a graceful fallback if the API call fails.
  const fb = quizFallback.questions[Math.min(historyLength, quizFallback.questions.length - 1)];
  if (!fb) return null;
  const options = fb.options || [];
  const count = Math.max(1, Math.min(answerCount, options.length));
  // If a reduced answer count is requested, pick evenly across the list so
  // options remain clearly different (avoid taking only the first N).
  const indices = [];
  if (count === options.length) {
    for (let i = 0; i < options.length; i += 1) indices.push(i);
  } else {
    for (let i = 0; i < count; i += 1) {
      const idx = Math.min(options.length - 1, Math.floor((i * options.length) / count));
      if (!indices.includes(idx)) indices.push(idx);
    }
    // In rare collisions, fill from left to right until we have count items.
    for (let i = 0; indices.length < count && i < options.length; i += 1) {
      if (!indices.includes(i)) indices.push(i);
    }
  }
  return {
    question: fb.question,
    options: indices.map((idx) => {
      const o = options[idx];
      return { id: o.id, text: o.text, keyword: o.keyword.id };
    }),
  };
}

const QuizPage = () => {
  const navigate = useNavigate();
  const {
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
    seenQuestions,
    setSeenQuestions,
    seenOptions,
    setSeenOptions,
    seenScenarios,
    setSeenScenarios,
  } = useContext(QuizContext);

  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [exiting, setExiting] = useState(false);
  const [optionsReady, setOptionsReady] = useState(false);
  const inFlight = useRef(false);
  const advanceTimerRef = useRef(null);
  const AUTO_ADVANCE_MS = 550;
  const EXIT_FADE_MS = 900;
  const QUESTION_HOLD_MS = 950;

  // Resolve once per mount so query-param toggles are honored on entry but
  // don't drift mid-quiz if the URL changes for any reason.
  const QUIZ_LENGTH = useMemo(readQuizLength, []);
  const QUIZ_ANSWERS = useMemo(readQuizAnswers, []);
  const MIN_QUESTIONS = QUIZ_LENGTH;
  const MAX_QUESTIONS = QUIZ_LENGTH;

  const cancelAutoAdvance = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  useEffect(() => () => cancelAutoAdvance(), []);

  const fetchNext = async (currentHistory) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoadingNext(true);
    setQuizError(null);
    try {
      const snapshot = computeSnapshot(currentHistory, heroData.heroes);
      const lastEntry = currentHistory[currentHistory.length - 1] || null;
      const res = await fetch('/api/next-question', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          // Trim history to the signal the model needs; the snapshot already
          // carries the running tally and hero scoreboard.
          history: currentHistory.map(({ answerText, keyword }) => ({ answerText, keyword })),
          lastQuestion: lastEntry?.question || null,
          snapshot,
          // Guardrails against repeating questions or option texts within the
          // same session, including options the user did NOT pick.
          seenQuestions,
          seenOptions,
          // Scenario frames already used (challenge, group, change, ...). The
          // server picks a fresh one each call so the conversation walks the
          // user through different life contexts, not five variants of the
          // same prompt.
          seenScenarios,
          optionCount: QUIZ_ANSWERS,
          minQuestions: MIN_QUESTIONS,
          maxQuestions: MAX_QUESTIONS,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hasContent =
        data &&
        data.question &&
        Array.isArray(data.options) &&
        data.options.length >= QUIZ_ANSWERS;
      if (data.done) {
        setDone(true);
        setCurrent(null);
      } else if (!hasContent) {
        // The server is supposed to always return a question (the LLM was
        // asked to set done=false), but if every LLM retry returned empty
        // we'd rather give the user a real static question than an empty
        // screen. Fall through to the static fallback path.
        throw new Error('Empty response from /api/next-question');
      } else {
        setCurrent({ question: data.question, options: data.options });
        setSelectedOptionId(null);
        if (data.question) setSeenQuestions((prev) => [...prev, data.question]);
        if (Array.isArray(data.options) && data.options.length) {
          setSeenOptions((prev) => [...prev, ...data.options.map((o) => o.text)]);
        }
        if (data.scenario) setSeenScenarios((prev) => [...prev, data.scenario]);
      }
    } catch (err) {
      console.warn('next-question failed, using fallback', err);
      setQuizError(err?.message || 'Unable to reach quiz API');
      const fb = fallbackQuestion(currentHistory.length, QUIZ_ANSWERS);
      if (fb) {
        setCurrent(fb);
        setSelectedOptionId(null);
        if (fb.question) setSeenQuestions((prev) => [...prev, fb.question]);
        if (Array.isArray(fb.options) && fb.options.length) {
          setSeenOptions((prev) => [...prev, ...fb.options.map((o) => o.text)]);
        }
      } else {
        setDone(true);
      }
    } finally {
      setLoadingNext(false);
      inFlight.current = false;
    }
  };

  useEffect(() => {
    if (history.length === 0 && !current && !done) {
      fetchNext([]);
    }
  }, [history.length, current, done]);

  useEffect(() => {
    if (done && history.length > 0) {
      setExiting(true);
      const t = setTimeout(() => navigate('/results'), EXIT_FADE_MS);
      return () => clearTimeout(t);
    }
  }, [done, history.length, navigate]);

  // Choreograph the reveal: when a new question lands, hold the answer
  // buttons behind skeleton placeholders for a moment so the question text
  // can land first (legend fades in + typewriter starts).
  useEffect(() => {
    setOptionsReady(false);
    if (!current || loadingNext) return;
    const t = setTimeout(() => setOptionsReady(true), QUESTION_HOLD_MS);
    return () => clearTimeout(t);
  }, [current, loadingNext]);

  const typedQuestion = useTypewriter(current?.question || '', 30);

  const advanceWith = (chosen) => {
    cancelAutoAdvance();
    if (!current || !chosen) return;
    const nextHistory = [
      ...history,
      {
        question: current.question,
        answerText: chosen.text,
        keyword: chosen.keyword,
        optionId: chosen.id,
      },
    ];
    setHistory(nextHistory);
    setCurrent(null);
    setSelectedOptionId(null);
    fetchNext(nextHistory);
  };

  const handleSelect = (opt) => {
    cancelAutoAdvance();
    setSelectedOptionId(opt.id);
    advanceTimerRef.current = setTimeout(() => advanceWith(opt), AUTO_ADVANCE_MS);
  };

  const handleBack = () => {
    cancelAutoAdvance();
    if (history.length === 0) {
      resetQuiz();
      navigate('/');
      return;
    }
    const prev = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setSelectedOptionId(prev?.optionId || null);
    setCurrent({
      question: prev.question,
      options: [{ id: prev.optionId, text: prev.answerText, keyword: prev.keyword }],
    });
    fetchNext(newHistory);
  };

  const currentBgIndex = history.length % quizBackgrounds.length;
  const progressTotal = MAX_QUESTIONS;
  const progressIndex = Math.min(history.length + 1, MAX_QUESTIONS);

  const showLoader = (loadingNext && !current) || (!current && !done);
  const showOptions = !showLoader && current && optionsReady;
  // Scoped key on the legend so the typewriter + fade-in replay on phase
  // change, but the surrounding layout stays mounted to avoid layout shifts.
  const legendKey = `legend-${history.length}-${showLoader ? 'l' : 'q'}`;

  return (
    <div className={`q ${exiting ? 'q--exiting' : ''}`} data-loading-type="dynamic" data-component="Quiz" data-component-family="CMT">
      <div className="q-bg-stack" aria-hidden="true">
        {quizBackgrounds.map((img, i) => (
          <div
            key={i}
            className="q-bg-layer"
            style={{ backgroundImage: `url(${img})`, opacity: i === currentBgIndex ? 1 : 0 }}
          />
        ))}
      </div>
      <fieldset className="q-flex">
        <div className="q-question">
          <a className="q-back" onClick={handleBack} aria-label="Go back" style={{cursor: 'pointer'}}>
            <div className="icon q-svg"><ArrowLeftSVG /></div>
          </a>
          <div
            className="q-progress"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={progressTotal}
            aria-valuenow={progressIndex}
            aria-label={`Question ${progressIndex} of ${progressTotal}`}
          >
            {Array.from({ length: progressTotal }).map((_, i) => {
              const pos = i + 1;
              const state =
                pos < progressIndex ? 'done' : pos === progressIndex ? 'current' : 'upcoming';
              return (
                <span
                  key={i}
                  className={`q-progress__seg q-progress__seg--${state}`}
                  aria-hidden="true"
                />
              );
            })}
          </div>
          <legend className="t3 q-legend" key={legendKey} style={{opacity: 1}}>
            {showLoader ? (
              <span style={{opacity: 0.7}}>
                {history.length === 0
                  ? 'Setting the stage for your first question…'
                  : 'Tailoring your next question…'}
              </span>
            ) : (
              typedQuestion
            )}
          </legend>
          {quizError && (
            <p className="caption" style={{color: '#ffcc01', marginTop: 8, opacity: 0.8}}>
              (Using fallback question — couldn't reach AI: {quizError})
            </p>
          )}
        </div>
        <div className="q-choice">
          {showOptions && current.options.map((opt, i) => (
            <button
              key={opt.id}
              className={`q-button caption${selectedOptionId === opt.id ? ' q-active' : ''}`}
              aria-pressed={selectedOptionId === opt.id}
              onClick={() => handleSelect(opt)}
              style={{ '--stagger': i }}
            >
              <span>{opt.text}</span>
              <div className="icon q-circle">{selectedOptionId === opt.id && <CheckMarkSVG />}</div>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
};

export default QuizPage;
