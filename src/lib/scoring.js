// Deterministic scoring for HEROES only.
// Job ranking is delegated to the LLM via /api/rank-jobs.

export function buildKeywordVector(userAnswers) {
  const tallies = {};
  for (const ans of Object.values(userAnswers || {})) {
    const id = ans?.keyword?.id;
    if (!id) continue;
    tallies[id] = (tallies[id] || 0) + 1;
  }
  const total = Object.values(tallies).reduce((a, b) => a + b, 0) || 1;
  const normalized = {};
  for (const [k, v] of Object.entries(tallies)) normalized[k] = v / total;
  return { tallies, normalized, total };
}

export function scoreHeroes(userVec, heroes) {
  const { normalized } = userVec;
  const scored = heroes.map((hero) => {
    const heroIds = (hero.keywords || []).map((k) => k.id);
    let raw = 0;
    const shared = [];
    for (const id of heroIds) {
      if (normalized[id] != null) {
        raw += normalized[id];
        shared.push(id);
      }
    }
    return { hero, score: raw, shared };
  });

  scored.sort((a, b) => b.score - a.score);

  const maxScore = scored[0]?.score || 0;
  return scored.map((row) => ({
    ...row,
    score01: maxScore > 0 ? row.score / maxScore : 0,
    percent: Math.round((maxScore > 0 ? row.score / maxScore : 0) * 100),
  }));
}

export function pickTopHeroWithJitter(rankedHeroes) {
  if (!rankedHeroes.length) return null;
  const top = rankedHeroes[0];
  const ties = rankedHeroes.filter((r) => r.score === top.score);
  if (ties.length === 1) return top;
  return ties[Math.floor(Math.random() * ties.length)];
}

// Lean runtime snapshot for the /api/next-question prompt.
// Input:
//   history: [{ keyword: 'duty', answerText, question?, optionId? }, ...]
//   heroes:  [{ id, keywords: [{id}, ...] }, ...]
// Output is intentionally compact (~5 short fields) so we feed the model
// dense signal without bloating the context window.
export function computeSnapshot(history, heroes) {
  const tallies = {};
  for (const h of history || []) {
    const id = h?.keyword;
    if (!id) continue;
    tallies[id] = (tallies[id] || 0) + 1;
  }
  const total = Object.values(tallies).reduce((a, b) => a + b, 0) || 1;
  const normalized = {};
  for (const [k, v] of Object.entries(tallies)) normalized[k] = v / total;

  const scored = (heroes || []).map((hero) => {
    const heroIds = (hero.keywords || []).map((k) => k.id);
    let raw = 0;
    for (const id of heroIds) {
      if (normalized[id] != null) raw += normalized[id];
    }
    return { id: hero.id, score: raw, keywords: heroIds };
  });
  scored.sort((a, b) => b.score - a.score);

  const top2 = scored.slice(0, 2).map((row) => ({
    id: row.id,
    score: Number(row.score.toFixed(3)),
    keywords: row.keywords,
  }));

  const topGap = Number(((top2[0]?.score || 0) - (top2[1]?.score || 0)).toFixed(3));

  // The 1-2 most-tallied keyword ids - the user's recurring trait. The
  // /api/next-question prompt uses these to anchor the conversational
  // opener ("You're someone who keeps an eye on the people around you...")
  // without exposing the raw keyword id.
  const topTraits = Object.entries(tallies)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2)
    .map(([id]) => id);

  const a = new Set(top2[0]?.keywords || []);
  const b = new Set(top2[1]?.keywords || []);
  const diff = Array.from(
    new Set([
      ...Array.from(a).filter((k) => !b.has(k)),
      ...Array.from(b).filter((k) => !a.has(k)),
    ]),
  );
  // Prefer keywords the user hasn't been asked about yet (lowest tally first).
  diff.sort((x, y) => (tallies[x] || 0) - (tallies[y] || 0));
  const probe = diff.slice(0, 3);

  return { tallies, top2, topGap, probe, topTraits };
}
