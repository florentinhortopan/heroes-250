
import React, { useEffect, useState } from 'react';
import './LoaderScreen.css';

// Helper to convert to Title Case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const LoaderScreen = ({ labels = [], onComplete, pulseDuration = 700 }) => {
  // stages: 'analyzing', 'showStrengths', 'finding', 'done'
  const [stage, setStage] = useState('analyzing');
  const [activeIndex, setActiveIndex] = useState(-1);

  // Stage 1: Show only the text and bouncing dots for 2s
  useEffect(() => {
    setStage('analyzing');
    setActiveIndex(-1);
    const t = setTimeout(() => setStage('showStrengths'), 2000);
    return () => clearTimeout(t);
  }, [labels]);

  // Stage 2: Show strengths, pulse in sequence
  useEffect(() => {
    if (stage !== 'showStrengths' || !labels.length) return;
    let i = 0;
    setActiveIndex(0);
    let interval;
    function nextPulse() {
      i++;
      if (i < labels.length) {
        setActiveIndex(i);
        interval = setTimeout(nextPulse, pulseDuration + 200);
      } else {
        // Wait for the last pulse to finish, then un-pulse (set all to done)
        setTimeout(() => {
          setActiveIndex(-1); // all done
          setTimeout(() => setStage('finding'), 600); // longer delay before next stage
        }, pulseDuration);
      }
    }
    interval = setTimeout(nextPulse, pulseDuration + 200);
    return () => clearTimeout(interval);
    // eslint-disable-next-line
  }, [stage, labels, pulseDuration]);

  // Stage 3: Show 'Finding your hero' with progress bar (duration 2600ms), then complete
  useEffect(() => {
    if (stage !== 'finding') return;
    const t = setTimeout(() => {
      setStage('done');
      if (onComplete) onComplete();
    }, 2600);
    return () => clearTimeout(t);
  }, [stage, onComplete]);

  return (
    <div className="loader-screen">
      {(stage === 'analyzing' || stage === 'showStrengths') && (
        <div className={`loader-analyzing-block slide-up${stage === 'showStrengths' ? ' show-strengths' : ''}`}>
          <div className="loader-stage-text fade-in pulse">Analyzing your strengths</div>
          {stage === 'analyzing' && (
            <div className="bouncing-dots-loader" aria-label="Loading">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}
          {stage === 'showStrengths' && (
            <ul className="loader-icon-list">
              {labels.map((label, idx) => (
                <li
                  key={label}
                  className={`icon-list-item${idx === activeIndex ? ' active' : ''}${idx < activeIndex || (activeIndex === -1 && idx === labels.length - 1) ? ' done' : ''}`}
                >
                  <span className="icon-list-check">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="10" cy="10" r="10" fill="#232323" stroke="#ffcc01" strokeWidth="2" />
                      <path d="M6 10.5L9 13.5L14 8.5" stroke="#ffcc01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="icon-list-label">{toTitleCase(label)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {stage === 'finding' && (
        <div className="loader-finding-container">
          <div className="loader-stage-text fade-in">Finding your hero</div>
          <div className="bouncing-dots-loader" aria-label="Loading">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      )}
    </div>
  );
};

export default LoaderScreen;
