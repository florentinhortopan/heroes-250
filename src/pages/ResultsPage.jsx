

import React, { useContext, useState, useEffect } from 'react';
import LoaderScreen from '../components/LoaderScreen';
import { QuizContext } from '../state/QuizContext';
import heroData from '../data/hero_data.json';
import keywordsData from '../data/keywords.json';
import { useNavigate } from 'react-router-dom';
import HeroMatch from '../components/HeroMatch';
import SoldierDetail from '../components/SoldierDetail';
import CareerPath from '../components/CareerPath';

const ResultsPage = () => {
  const { userAnswers, setUserAnswers } = useContext(QuizContext);
  const navigate = useNavigate();

  // Collect all selected keyword ids from user answers
  const userKeywordIds = Object.values(userAnswers)
    .map((ans) => ans.keyword?.id)
    .filter(Boolean);

  // Find all heroes with the most keyword overlap, then pick one at random if tied
  let bestHeroes = [];
  let bestMatchCount = 0;
  let bestShared = [];

  heroData.heroes.forEach((hero) => {
    const heroKeywordIds = hero.keywords.map((k) => k.id);
    const shared = userKeywordIds.filter((id) => heroKeywordIds.includes(id));
    if (shared.length > bestMatchCount) {
      bestHeroes = [{ hero, shared }];
      bestMatchCount = shared.length;
    } else if (shared.length === bestMatchCount && bestMatchCount > 0) {
      bestHeroes.push({ hero, shared });
    }
  });

  useEffect(() => {
    // Log all heroes with their match counts
    console.log('User keyword IDs:', userKeywordIds);
    heroData.heroes.forEach((hero) => {
      const heroKeywordIds = hero.keywords.map((k) => k.id);
      const shared = userKeywordIds.filter((id) => heroKeywordIds.includes(id));
      console.log(`Hero: ${hero.name} (${hero.id}) - Match count: ${shared.length}, Shared:`, shared);
    });

    // Log the best-matching heroes (including ties)
    if (bestHeroes.length > 0) {
      console.log('Best-matching heroes (highest match count):');
      bestHeroes.forEach(({ hero, shared }) => {
        console.log(`  ${hero.name} (${hero.id}) - Shared:`, shared);
      });
    } else {
      console.log('No hero matches found.');
    }
    // Only run on mount
    // eslint-disable-next-line
  }, []);

  let bestHero = null;
  if (bestHeroes.length === 1) {
    bestHero = bestHeroes[0].hero;
    bestShared = bestHeroes[0].shared;
  } else if (bestHeroes.length > 1) {
    const picked = bestHeroes[Math.floor(Math.random() * bestHeroes.length)];
    bestHero = picked.hero;
    bestShared = picked.shared;
  }

  // Map keyword ids to labels for display
  const keywordLabelMap = Object.fromEntries(
    (keywordsData.keyword_options || []).map((k) => [k.id, k.label])
  );
  // Only show each keyword label once
  const userKeywordLabels = Array.from(new Set(userKeywordIds.map((id) => keywordLabelMap[id]).filter(Boolean)));

  const [showLoader, setShowLoader] = useState(true);

  if (showLoader) {
    return (
      <LoaderScreen
        labels={userKeywordLabels}
        onComplete={() => setShowLoader(false)}
      />
    );
  }

  return (
    <div className="results-page">
      {bestHero ? (
        <>
          <HeroMatch hero={bestHero} sharedQualities={[...new Set(bestShared)]} keywordLabelMap={keywordLabelMap} userKeywordIds={userKeywordIds} />
          {/* Career Path Section */}
          <CareerPath bestHero={bestHero} />
        </>
      ) : (
        <p>You're unique! None of the heroes from history match your profile. Try the quiz again!</p>
      )}
    </div>
  );
};

export default ResultsPage;
