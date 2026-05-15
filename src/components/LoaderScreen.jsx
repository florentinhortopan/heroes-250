
import React, { useEffect, useState } from 'react';
import './LoaderScreen.css';

// Helper to convert to Title Case
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const FADE_OUT_MS = 900;

const LoaderScreen = ({ labels = [], onComplete, pulseDuration = 700 }) => {
  // stages: 'analyzing', 'showStrengths', 'finding', 'done'
  const [stage, setStage] = useState('analyzing');
  const [activeIndex, setActiveIndex] = useState(-1);
  // Driven by stage='finding' end-of-cycle; gates the slow fade-out before
  // we tell the parent we're done so the handoff to the results page is
  // a continuous fade-out -> fade-in rather than a hard cut.
  const [fadingOut, setFadingOut] = useState(false);

  // Stage 1: Show only the text and bouncing dots for 2s
  useEffect(() => {
    setStage('analyzing');
    setActiveIndex(-1);
    setFadingOut(false);
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

  // Stage 3: Show 'Finding your hero' with bouncing dots, then trigger the
  // fade-out. We split the work in two effects so the fade animation has a
  // clean lifecycle and we can cancel cleanly on unmount.
  useEffect(() => {
    if (stage !== 'finding') return;
    const t = setTimeout(() => setFadingOut(true), 2600);
    return () => clearTimeout(t);
  }, [stage]);

  // Once fade-out is in flight, wait for it to finish before telling the
  // parent we're done; the parent will then mount the results content,
  // which fades in on top of the now-empty space.
  useEffect(() => {
    if (!fadingOut) return;
    const t = setTimeout(() => {
      setStage('done');
      if (onComplete) onComplete();
    }, FADE_OUT_MS);
    return () => clearTimeout(t);
  }, [fadingOut, onComplete]);

  return (
    <div className={`loader-screen ${fadingOut ? 'loader-screen--leaving' : 'loader-screen--entering'}`}>
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
