import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import LoaderScreen from '../components/LoaderScreen';
import { QuizContext } from '../state/QuizContext';
import heroData from '../data/hero_data.json';
import keywordsData from '../data/keywords.json';
import mosSummary from '../data/mos_summary.json';
import HeroMatch from '../components/HeroMatch';
import CareerPath from '../components/CareerPath';
import RankedHeroList from '../components/RankedHeroList';
import RankedJobList from '../components/RankedJobList';
import { buildKeywordVector, scoreHeroes, pickTopHeroWithJitter } from '../lib/scoring';

const keywordLabelMap = Object.fromEntries(
  (keywordsData.keyword_options || []).map((k) => [k.id, k.label]),
);

const mosByCode = Object.fromEntries(
  (Array.isArray(mosSummary) ? mosSummary : []).map((m) => [m.moscode, m]),
);

function findMos(moscode) {
  return mosByCode[moscode] || null;
}

const ResultsPage = () => {
  const { history, userAnswers } = useContext(QuizContext);

  const userVec = useMemo(() => buildKeywordVector(userAnswers), [userAnswers]);
  const rankedHeroes = useMemo(() => scoreHeroes(userVec, heroData.heroes), [userVec]);
  const topHeroRow = useMemo(() => pickTopHeroWithJitter(rankedHeroes), [rankedHeroes]);
  const topHero = topHeroRow?.hero;
  const topShared = topHeroRow?.shared || [];

  const userKeywordLabels = useMemo(
    () =>
      Array.from(
        new Set(
          Object.keys(userVec.tallies)
            .map((id) => keywordLabelMap[id])
            .filter(Boolean),
        ),
      ),
    [userVec],
  );

  const [showLoader, setShowLoader] = useState(true);
  const [rankedJobs, setRankedJobs] = useState(null);
  const [rankingError, setRankingError] = useState(null);
  const [narrative, setNarrative] = useState(null);

  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    if (!topHero) return;
    calledRef.current = true;

    const userProfile = {
      keywordTallies: userVec.tallies,
      dominantKeywords: Object.entries(userVec.tallies)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k),
      answers: history.map((h) => ({
        question: h.question,
        answerText: h.answerText,
        keyword: h.keyword,
      })),
      topHero: {
        id: topHero.id,
        name: topHero.name,
        keywords: topHero.keywords?.map((k) => k.id) || [],
      },
    };

    // Fire both calls in parallel.
    fetch('/api/rank-jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userProfile, catalog: mosSummary }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setRankedJobs(data.ranked || []))
      .catch((err) => {
        console.warn('rank-jobs failed', err);
        setRankingError(err?.message || 'Job ranker unavailable');
        setRankedJobs([]);
      });

    const sharedKeywords = topShared.map((id) => ({ id, label: keywordLabelMap[id] || id }));

    fetch('/api/hero-narrative', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hero: {
          name: topHero.name,
          rank: topHero.rank,
          keywords: topHero.keywords?.map((k) => k.id) || [],
          achievement: topHero.achievement,
          medium_bio: topHero.medium_bio,
          conflict: topHero.conflict,
          time_period: topHero.time_period,
        },
        userAnswers: history.map((h) => ({
          question: h.question,
          answerText: h.answerText,
          keyword: h.keyword,
        })),
        sharedKeywords,
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setNarrative(data))
      .catch((err) => {
        console.warn('hero-narrative failed', err);
        setNarrative(null);
      });
  }, [topHero, topShared, userVec, history]);

  // Enrich the LLM-returned ranked jobs with full MOS info (title, category, url).
  const enrichedJobs = useMemo(() => {
    if (!Array.isArray(rankedJobs)) return [];
    const maxScore = rankedJobs.reduce((m, r) => Math.max(m, r.score || 0), 0) || 1;
    return rankedJobs
      .map((row) => {
        const full = findMos(row.moscode);
        if (!full) return null;
        return {
          moscode: full.moscode,
          mos_title: full.mos_title,
          category: full.category,
          group: full.group,
          score01: (row.score || 0) / maxScore,
          percent: Math.round(((row.score || 0) / maxScore) * 100),
          reason: row.reason,
          url: full.url || '',
          full,
        };
      })
      .filter(Boolean);
  }, [rankedJobs]);

  const topJob = enrichedJobs[0]?.full || null;
  const otherJobs = enrichedJobs.slice(1, 10);
  const otherHeroes = rankedHeroes.filter((r) => r.hero.id !== topHero?.id).slice(0, 8);

  if (showLoader) {
    return (
      <LoaderScreen labels={userKeywordLabels} onComplete={() => setShowLoader(false)} />
    );
  }

  if (!topHero) {
    return <p>You're unique! None of the heroes from history match your profile. Try the quiz again!</p>;
  }

  return (
    <div className="results-page results-page-fade-in">
      <HeroMatch
        hero={topHero}
        sharedQualities={[...new Set(topShared)]}
        keywordLabelMap={keywordLabelMap}
        userKeywordIds={Object.keys(userVec.tallies)}
        narrative={narrative}
        topJob={topJob}
      />
      {rankingError && (
        <div style={{ background: '#1a1a1a', color: '#ffcc01', textAlign: 'center', padding: '1rem' }}>
          AI job ranker unavailable: {rankingError}. Showing the historical match only.
        </div>
      )}
      <RankedJobList ranked={otherJobs} loading={rankedJobs === null} />
      <RankedHeroList ranked={otherHeroes} keywordLabelMap={keywordLabelMap} />
    </div>
  );
};

export default ResultsPage;
