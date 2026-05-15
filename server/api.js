import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let _client = null;
function client() {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not set');
    err.statusCode = 500;
    throw err;
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

const ALLOWED_KEYWORDS = [
  'courage',
  'resilience',
  'duty',
  'leadership',
  'problem_solving',
  'collaboration',
  'strategic_thinking',
  'adaptability',
];

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Distinct life contexts the quiz rotates through, so the conversation feels
// like a tour of who the user is - not five variations of "a tough challenge".
const SCENARIO_THEMES = [
  {
    id: 'challenge',
    hint: 'Frame the question around a tough, pressured moment - what is the user\'s first move?',
  },
  {
    id: 'group',
    hint: 'Frame the question around working alongside other people - the role they naturally take in a group.',
  },
  {
    id: 'change',
    hint: 'Frame the question around a change of plans or shifting conditions - how they respond when the ground shifts.',
  },
  {
    id: 'service',
    hint: 'Frame the question around long-haul commitment - what keeps them going day after day, even when the work is unseen.',
  },
  {
    id: 'legacy',
    hint: 'Frame the question around the mark they want to leave - what they want to be remembered for.',
  },
  {
    id: 'support',
    hint: 'Frame the question around someone close to them who is struggling - how they show up for that person.',
  },
  {
    id: 'risk',
    hint: 'Frame the question around choosing between a safe path and a bolder one.',
  },
  {
    id: 'growth',
    hint: 'Frame the question around personal growth - pushing past their current limits or learning something hard.',
  },
  {
    id: 'instinct',
    hint: 'Frame the question around a moment that calls for a snap decision - what their gut tells them to do.',
  },
  {
    id: 'recovery',
    hint: 'Frame the question around recovering from a setback or a public failure.',
  },
];

// Which scenarios are a natural fit for which keywords. Used to make scenario
// selection feel intentional rather than random: if the question is asking
// about adaptability + collaboration, "change" or "support" beat "legacy".
const SCENARIO_KEYWORD_AFFINITY = {
  challenge:  ['courage', 'resilience', 'problem_solving'],
  group:      ['leadership', 'collaboration', 'duty'],
  change:     ['adaptability', 'strategic_thinking', 'problem_solving'],
  service:    ['duty', 'resilience'],
  legacy:     ['duty', 'leadership', 'courage'],
  support:    ['courage', 'collaboration', 'duty'],
  risk:       ['courage', 'adaptability'],
  growth:     ['adaptability', 'strategic_thinking', 'resilience'],
  instinct:   ['courage', 'problem_solving', 'strategic_thinking'],
  recovery:   ['resilience', 'adaptability', 'duty'],
};

function pickScenarioTheme({ requiredKeywords = [], seenScenarios = [] }) {
  const seen = new Set(seenScenarios);
  const candidates = SCENARIO_THEMES.filter((t) => !seen.has(t.id));
  const pool = candidates.length ? candidates : [...SCENARIO_THEMES];
  const scored = pool.map((t) => {
    const affinity = SCENARIO_KEYWORD_AFFINITY[t.id] || [];
    const overlap = requiredKeywords.filter((k) => affinity.includes(k)).length;
    return { t, overlap };
  });
  scored.sort((a, b) => b.overlap - a.overlap);
  const topOverlap = scored[0].overlap;
  const top = scored.filter((s) => s.overlap === topOverlap);
  return top[Math.floor(Math.random() * top.length)].t;
}

// Pick the 4 keywords the next question MUST use, one per option.
// The model used to make this choice and consistently leaned on the same
// dominant keywords (e.g. courage is in 7/9 heroes), which made every quiz
// converge to the same handful of heroes. By controlling keyword coverage
// server-side we get:
//  - Q1 and Q2: a randomized 4-keyword sweep, so different users see
//    different opening questions and the early signal is broad.
//  - Q3+:      bias toward untallied keywords first (keep broadening),
//    then up to 2 probe keywords (discriminate between top heroes).
function pickRequiredKeywords({ history, snapshot, quizLength = 6 }) {
  const tallies = snapshot?.tallies || {};
  const probe = Array.isArray(snapshot?.probe) ? snapshot.probe : [];
  const all = [...ALLOWED_KEYWORDS];
  const untallied = all.filter((k) => !(k in tallies));

  // Broaden phase scales with quiz length so the early-vs-late ratio stays
  // roughly the same: the first ~third of the quiz casts a wide net, the
  // rest discriminates. For a 3-question quiz that's just Q1 broadening
  // and Q2/Q3 probing; for 6, Q1+Q2 broaden and Q3..Q6 probe.
  const broadenUntil = Math.max(1, Math.floor(quizLength / 3));
  if ((history?.length ?? 0) < broadenUntil) {
    return shuffleInPlace([...all]).slice(0, 4);
  }

  const out = [];
  // 2 untallied keywords first, in random order, to keep widening coverage.
  for (const u of shuffleInPlace([...untallied])) {
    if (out.length >= 2) break;
    out.push(u);
  }
  // up to 2 probe keywords to drive discrimination between current top 2.
  for (const p of probe) {
    if (out.length >= 4) break;
    if (!out.includes(p)) out.push(p);
  }
  // Fill any remaining slot with a random other keyword.
  for (const k of shuffleInPlace([...all])) {
    if (out.length >= 4) break;
    if (!out.includes(k)) out.push(k);
  }
  return out.slice(0, 4);
}

// ---------- /api/next-question ----------

const NEXT_QUESTION_SCHEMA = {
  name: 'next_question',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      done: { type: 'boolean' },
      reason: { type: 'string' },
      question: { type: 'string' },
      options: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            keyword: { type: 'string', enum: ALLOWED_KEYWORDS },
          },
          required: ['id', 'text', 'keyword'],
        },
      },
    },
    required: ['done', 'reason', 'question', 'options'],
  },
  strict: true,
};

function nextQuestionSystemPrompt() {
  return [
    'You are running a short adaptive personality quiz that matches the user to one of nine historical U.S. Army heroes.',
    'The quiz lives on a U.S. Army recruiting site. The brand context is set by the page itself, NOT by piling on military jargon. Question stems should feel like a thoughtful values quiz; options should subtly echo Army values (lead, serve, commit, step up, stand by) - but in everyday language, never in combat or operational terms.',
    '',
    'VOICE & TONE:',
    '- Universal personal scenarios: facing a tough challenge, the team is stuck, plans change, someone is struggling, you have to commit for the long haul, the situation is uncertain, you have to choose between two paths, what kind of legacy you want.',
    '- Vocabulary you SHOULD use: "team", "lead", "serve", "commit", "step up", "stand by", "push through", "stay steady", "support", "the work", "the challenge", "the path", "the people around you", "training", "growth", "responsibility".',
    '- HARD AVOID (these read as combat / war-zone and break the tone):',
    '  enemy, fire, under fire, battlefield, battle buddy, hold the line, secure (as a verb), patrol, ambush, casualty, rounds, intel, tactical, pinned down, take cover, deployment, deploy, in the field, on the ground, terrain, the objective (as a noun), drill (the verb), barracks, formation, cover.',
    '- ALSO AVOID labelling the player as a soldier in the scenario. Do NOT use: "soldier", "fellow soldiers", "your squad", "your unit", "your platoon", "your battalion", "the troops". The user has not joined the Army; they are taking a quiz.',
    '- AVOID corporate / HR phrasing: no "stakeholders", "share ideas openly", "creative solutions", "analyze thoroughly", "drive results", "innovate", "manage tasks", "synergy". If a phrase could appear in a LinkedIn job ad, do NOT use it.',
    '- Second person ("you", "your team", "the people around you"). Active voice. Plainspoken and human, like a thoughtful values quiz.',
    '',
    'EXAMPLES of the on-brand option voice (style only - DO NOT copy verbatim):',
    '- "Step up and lead the way." -> leadership',
    '- "Stay committed when the work gets hard." -> duty',
    '- "Stand by someone who is struggling." -> courage',
    '- "Push through every setback." -> resilience',
    '- "Adjust the plan when things change." -> adaptability',
    '- "Think two steps ahead of the group." -> strategic_thinking',
    '- "Find a smarter way around the problem." -> problem_solving',
    '- "Bring everyone together when morale dips." -> collaboration',
    '',
    'EXAMPLES of full question stems WITH conversational opener (target style):',
    '- "You\'re always looking out for the people around you - so when a teammate is having their worst week, what do you do?"',
    '- "You keep coming back to the long view - what kind of mark do you want to leave on the people you serve with?"',
    '- "Sounds like you\'d rather act than wait - when plans suddenly change, what is your first move?"',
    '- "You\'ve shown you\'ll keep going when others stop - what carries you through the unglamorous stretch?"',
    '',
    'EXAMPLES for the FIRST question (no history yet, no opener):',
    '- "When the path forward is unclear, what is your instinct?"',
    '- "What pulls you through the hardest stretches?"',
    '',
    'Each option must be tagged with EXACTLY ONE keyword from this fixed vocabulary:',
    ALLOWED_KEYWORDS.map((k) => `- ${k}`).join('\n'),
    '',
    'You will receive:',
    '- requiredKeywords: the exact four keywords you MUST use for this question, one per option, in any order. This is non-negotiable.',
    '- scenarioHint: the specific life-context the question must be framed around. Do NOT default to a generic "tough challenge" stem; if scenarioHint says "legacy", write a legacy question, etc.',
    '- quizLength: total number of questions in this quiz (typically 3-6).',
    '- openerAt: the history.length threshold at or above which the question MUST start with a conversational opener. Below it, ask the question plainly.',
    '- snapshot.tallies: how many times each keyword has been chosen so far (context only).',
    '- snapshot.topTraits: the user\'s recurring trait(s) so far (e.g., ["collaboration","duty"]) - use these to write the conversational opener.',
    '- snapshot.top2: the two best-matching heroes given current tallies, each with their keyword fingerprint and a 0..1 score (context only).',
    '- snapshot.topGap: gap between top1 and top2 scores (0..1).',
    '- lastQuestion: the question the user just answered (may be null on the first call).',
    '- history: trimmed list of prior answers as { answerText, keyword }.',
    '- seenQuestions: every question stem already shown this session.',
    '- seenOptions: every option text already shown this session (across ALL prior questions, picked or not).',
    '',
    'CONVERSATIONAL OPENER (most important rule):',
    '- If history.length >= openerAt, the question stem MUST begin with a SHORT observation (one clause, ~6-12 words) that names something you\'ve noticed about the user, then pivot into the actual question with " - so " or " - " or ", so ".',
    '- Anchor the observation in snapshot.topTraits[0] (the user\'s recurring trait). Translate that trait into EVERYDAY LANGUAGE - never use the raw keyword id. Translation guide:',
    '  • collaboration -> "you\'re always looking out for the people around you"',
    '  • leadership -> "people listen when you speak", "you tend to step up first"',
    '  • duty -> "you\'ve shown up to be counted on", "you take commitments seriously"',
    '  • courage -> "you\'d rather act than wait", "you don\'t flinch easily"',
    '  • resilience -> "you keep going when others stop", "you don\'t fold under weight"',
    '  • adaptability -> "you bend with the situation", "you read the room and adjust"',
    '  • strategic_thinking -> "you keep coming back to the long view", "you think two steps ahead"',
    '  • problem_solving -> "you find a way around the obstacle", "you work the puzzle"',
    '- Vary the opener verb across questions (You\'re / You\'ve shown / Sounds like / I notice / You keep / You tend to). Do NOT start two questions in a row with the same verb.',
    '- Optional: occasionally weave a SHORT phrase (3-5 words) from history.answerText into the opener if it flows naturally - never more than 5 words verbatim. Skip this when forced.',
    '- The opener must feel earned, warm, and specific to THIS user. Never generic flattery.',
    '- If history.length < openerAt, skip the opener and ask the question directly (see "FIRST question" examples).',
    '- The whole quiz is exactly `quizLength` questions long. With short quizzes (3-4 total), every question MUST feel evidently different from the others - different scenario, different opener verb, different sentence shape. The user should never be able to mistake one question for another.',
    '',
    'RULES:',
    '- Return ONE next question with FOUR distinct options.',
    '- Each option\'s keyword MUST be one of requiredKeywords. Use ALL FOUR requiredKeywords, exactly one per option. Do not substitute or skip.',
    '- After the opener, the question itself MUST clearly sit inside the scenarioHint context. The pivot from opener to question should feel natural, not bolted on.',
    '- HARD GUARDRAIL #1: the question stem must NOT match or paraphrase any entry in seenQuestions.',
    '- HARD GUARDRAIL #2: NONE of the four option texts may match, paraphrase, or near-duplicate any entry in seenOptions. Same meaning expressed with the same key verb or noun is a duplicate. Vary verbs and framing.',
    '- The quiz is a conversation across multiple scenarios. Each question is a different lens on the same person; treat scenarioHint as the lens and the opener as the bridge from what you\'ve heard to what you\'re about to ask.',
    '- Question length: 18-32 words when there is an opener; 8-18 words for the first (opener-less) question. Options: 4-10 words each.',
    '- Options should read like natural responses, not labels. Never name the keyword in the option text. Mix sentence shapes (verb-led, noun-led, "I would..." style) so the four options don\'t feel parallel-stamped.',
    '- ALWAYS set done=false and ALWAYS return a real question with four options. The server is solely responsible for deciding when the quiz ends; you do not get a vote. If you set done=true, the server will discard your response and ask you again.',
    '- Always return strict JSON matching the schema.',
  ].join('\n');
}

function nextQuestionUserPayload({
  history,
  snapshot,
  lastQuestion,
  seenQuestions,
  seenOptions,
  requiredKeywords,
  scenarioHint,
  quizLength,
  openerAt,
  minQuestions,
  maxQuestions,
}) {
  return JSON.stringify(
    {
      quizLength,
      openerAt,
      minQuestions,
      maxQuestions,
      requiredKeywords,
      scenarioHint,
      snapshot,
      lastQuestion,
      seenQuestions,
      seenOptions,
      history: (history || []).map((h) => ({ answerText: h.answerText, keyword: h.keyword })),
    },
    null,
    2,
  );
}

// Loose paraphrase-aware match: lowercase + strip punctuation + collapse
// whitespace, then look for an entry whose word set is mostly contained in
// the candidate (or vice versa). Cheap and good enough as a safety net.
function normalizeForDedup(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function isNearDuplicate(candidate, list) {
  const c = normalizeForDedup(candidate);
  if (!c) return false;
  const cWords = new Set(c.split(' ').filter((w) => w.length > 2));
  if (cWords.size === 0) return false;
  for (const prev of list || []) {
    const p = normalizeForDedup(prev);
    if (!p) continue;
    if (p === c) return true;
    const pWords = new Set(p.split(' ').filter((w) => w.length > 2));
    if (pWords.size === 0) continue;
    let overlap = 0;
    for (const w of cWords) if (pWords.has(w)) overlap += 1;
    const smaller = Math.min(cWords.size, pWords.size);
    // 70% or more of the smaller set overlaps -> near-duplicate.
    if (smaller > 0 && overlap / smaller >= 0.7) return true;
  }
  return false;
}

const DONE_GAP_THRESHOLD = 0.25;

export async function handleNextQuestion(body) {
  const minQuestions = Math.max(1, Math.min(10, Number(body?.minQuestions ?? 3)));
  const maxQuestions = Math.max(minQuestions, Math.min(10, Number(body?.maxQuestions ?? 6)));
  const history = Array.isArray(body?.history) ? body.history : [];
  const snapshot = body?.snapshot || { tallies: {}, top2: [], topGap: 0, probe: [] };
  const lastQuestion = typeof body?.lastQuestion === 'string' ? body.lastQuestion : null;
  const seenQuestions = Array.isArray(body?.seenQuestions) ? body.seenQuestions : [];
  const seenOptions = Array.isArray(body?.seenOptions) ? body.seenOptions : [];
  const seenScenarios = Array.isArray(body?.seenScenarios) ? body.seenScenarios : [];

  if (history.length >= maxQuestions) {
    return { done: true, reason: `Reached maxQuestions=${maxQuestions}.`, question: '', options: [] };
  }
  // Server-side safety net for the done condition: the prompt asks the model
  // to end when there's a clear leader, but it sometimes ignores soft rules.
  if (
    history.length >= minQuestions &&
    typeof snapshot.topGap === 'number' &&
    snapshot.topGap >= DONE_GAP_THRESHOLD
  ) {
    return {
      done: true,
      reason: `Clear leader: topGap=${snapshot.topGap.toFixed(2)} >= ${DONE_GAP_THRESHOLD} after ${history.length} answers.`,
      question: '',
      options: [],
    };
  }

  // Quiz length is whatever the client asked for (min == max in our setup).
  // The broaden/probe phases and conversational-opener threshold all scale
  // with this so a 3-question quiz feels just as paced as a 6-question one.
  const quizLength = maxQuestions;
  const openerAt = Math.max(1, Math.floor(quizLength / 3));

  // Server picks the keyword set for this question (broaden first, probe
  // later). This is the main lever that keeps the result hero from
  // converging on the same courage/duty cluster every run.
  const requiredKeywords = pickRequiredKeywords({ history, snapshot, quizLength });

  // Server also picks the SCENARIO frame for this question. Without this
  // the model defaults to "tough challenge" stems every time. Themes are
  // chosen to (1) not repeat what was already shown, and (2) feel natural
  // for the keywords being asked about.
  const scenario = pickScenarioTheme({ requiredKeywords, seenScenarios });

  // Try up to 3 attempts: retry on (a) the model setting done=true on its own
  // (it sometimes "decides" the user is done once topGap looks high - that
  // call belongs to the server, not the model), or (b) the model returning a
  // question/option that duplicates something already shown this session.
  const baseMessages = [
    { role: 'system', content: nextQuestionSystemPrompt() },
    {
      role: 'user',
      content: nextQuestionUserPayload({
        history,
        snapshot,
        lastQuestion,
        seenQuestions,
        seenOptions,
        requiredKeywords,
        scenarioHint: scenario.hint,
        quizLength,
        openerAt,
        minQuestions,
        maxQuestions,
      }),
    },
  ];

  let parsed = null;
  let retryReason = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const messages = [...baseMessages];
    if (retryReason === 'premature_done') {
      messages.push({
        role: 'system',
        content:
          'Your previous draft set done=true. The server has already told you the quiz is NOT over (otherwise it would not have called you). Set done=false and return a real question with four valid options NOW.',
      });
    } else if (retryReason === 'duplicate') {
      messages.push({
        role: 'system',
        content:
          'Your previous draft repeated a question or option already shown this session. Generate a fresh stem AND four fresh option texts that do NOT paraphrase anything in seenQuestions or seenOptions.',
      });
    }

    const completion = await client().chat.completions.create({
      model: MODEL,
      temperature: attempt === 0 ? 0.6 : 0.8,
      response_format: { type: 'json_schema', json_schema: NEXT_QUESTION_SCHEMA },
      messages,
    });
    const text = completion.choices?.[0]?.message?.content || '{}';
    parsed = JSON.parse(text);

    // Hard-coerce done=false. The server already short-circuited the
    // legitimate end-of-quiz case before reaching the LLM call, so any
    // done=true returned here is the model jumping the gun.
    if (parsed.done) {
      parsed.done = false;
      retryReason = 'premature_done';
      parsed = null;
      continue;
    }

    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 4) {
      retryReason = 'premature_done';
      parsed = null;
      continue;
    }

    const optionTexts = parsed.options.map((o) => o.text);
    const repeated =
      isNearDuplicate(parsed.question, seenQuestions) ||
      optionTexts.some((t) => isNearDuplicate(t, seenOptions));
    if (repeated) {
      retryReason = 'duplicate';
      continue;
    }
    break;
  }

  if (parsed && !parsed.done) {
    parsed.options = (parsed.options || []).map((o, i) => ({
      id: o.id || `opt_${i + 1}`,
      text: o.text,
      keyword: o.keyword,
    }));

    // Enforce the required keyword set: if the model drifted (substituted
    // courage where adaptability was required), coerce each option to the
    // requiredKeywords slot it best matches. Options keep their text; only
    // the keyword tag is corrected.
    const required = [...requiredKeywords];
    const fixed = parsed.options.map((o) => {
      const idx = required.indexOf(o.keyword);
      if (idx >= 0) {
        required.splice(idx, 1);
        return o;
      }
      return o;
    });
    for (const o of fixed) {
      if (!requiredKeywords.includes(o.keyword) && required.length) {
        o.keyword = required.shift();
      }
    }
    parsed.options = fixed;
    parsed.scenario = scenario.id;
  }
  return parsed || { done: false, reason: '', question: '', options: [] };
}

// ---------- /api/rank-jobs ----------

const RANK_JOBS_SCHEMA = {
  name: 'ranked_jobs',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      ranked: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            moscode: { type: 'string' },
            score: { type: 'number' },
            reason: { type: 'string' },
          },
          required: ['moscode', 'score', 'reason'],
        },
      },
    },
    required: ['ranked'],
  },
  strict: true,
};

function rankJobsSystemPrompt(catalogSize) {
  return [
    'You are a career-fit ranker for U.S. Army MOS (Military Occupational Specialty) roles.',
    'You will be given a user profile (their answers, dominant traits, and top historical hero match) and a full catalog of MOS roles.',
    'Your task:',
    `- READ every MOS in the catalog (${catalogSize} entries).`,
    "- Rank the TOP 12 best fits for this specific user, considering BOTH their keyword tallies AND the actual text of each role's description, Skills, and Legacy Soft Skills.",
    '- Each ranked entry must include:',
    '  - moscode: exact code from the catalog (e.g., "68W").',
    '  - score: 0..1 fit confidence (top entry should be closest to 1.0).',
    '  - reason: ONE concise sentence (max 25 words) that cites specific phrasing from the MOS (Skills, Legacy Soft Skills, or description) AND explicitly connects it to the user\'s answers or dominant traits.',
    '- Do NOT just rank by keyword overlap with category; read the actual job text. A user who valued resilience and adaptability may fit aviation OR signal-intelligence depending on which jobs\' phrasing aligns.',
    "- Don't include heros's matched_mos as the top job unless the catalog text genuinely supports it.",
    '- Return strict JSON only.',
  ].join('\n');
}

export async function handleRankJobs(body) {
  const userProfile = body?.userProfile || {};
  const catalog = Array.isArray(body?.catalog) ? body.catalog : [];

  if (!catalog.length) {
    return { ranked: [] };
  }

  const completion = await client().chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: 'json_schema', json_schema: RANK_JOBS_SCHEMA },
    messages: [
      { role: 'system', content: rankJobsSystemPrompt(catalog.length) },
      {
        role: 'user',
        content: JSON.stringify({ userProfile, catalog }),
      },
    ],
  });
  const text = completion.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(text);
  const ranked = Array.isArray(parsed.ranked) ? parsed.ranked.slice(0, 12) : [];
  return { ranked };
}

// ---------- /api/hero-narrative ----------

const HERO_NARRATIVE_SCHEMA = {
  name: 'hero_narrative',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      tagline: { type: 'string' },
      paragraph: { type: 'string' },
      qualitiesCopy: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            keyword: { type: 'string' },
            line: { type: 'string' },
          },
          required: ['keyword', 'line'],
        },
      },
    },
    required: ['tagline', 'paragraph', 'qualitiesCopy'],
  },
  strict: true,
};

function heroNarrativeSystemPrompt() {
  return [
    'You write personalized "why this hero matches you" copy for a U.S. Army quiz result page.',
    '',
    'VOICE & TONE:',
    '- Brand: U.S. Army recruiting site. Continuous with the voice of the quiz the reader just took.',
    '- The hero portion CAN reference specific historical facts from the bio (a place, a unit name, a battle, a conflict, an injury) - that is what makes it personal to that hero.',
    '- The portion describing the USER should use everyday, values-driven language (lead, serve, commit, step up, stand by, push through, stay steady, support the people around you). DO NOT cast the user as a soldier in combat (no "your squad", "your unit", "under fire", "hold the line", "battle buddy", "secure the objective").',
    "- AVOID corporate / HR phrasing (no \"stakeholders\", \"creative solutions\", \"share ideas openly\", \"analyze thoroughly\"). AVOID worn clichés (\"true hero in your own right\", \"a force to be reckoned with\").",
    '- Second-person, warm but not sappy. Confident, plainspoken, like a recruiter who has read the hero\'s file and is telling you what they saw in your answers.',
    '',
    'You will be given:',
    '- hero: name, rank, keywords, achievement, medium_bio',
    "- userAnswers: the user's actual quiz questions and the specific options they chose",
    '- sharedKeywords: array of { id, label } pairs that overlap between the user and hero',
    '',
    'RULES:',
    "- The PARAGRAPH (2-3 sentences) MUST reference at least ONE specific moment from the hero's bio (a place, an injury, a feat, a unit, a conflict) AND echo at least ONE of the user's actual answers (paraphrasing is fine, verbatim quoting up to ~6 words is even better).",
    '- The TAGLINE is 8-12 words, punchy, present tense, on-brand but everyday in vocabulary.',
    '- The qualitiesCopy array has one entry per sharedKeywords entry: { keyword, line }.',
    '  - keyword MUST be the keyword id (e.g., "resilience", "courage", "duty") from sharedKeywords[].id - NEVER the human label.',
    '  - line is one short sentence (max 22 words) connecting the user\'s answer to how the hero showed that quality. The hero\'s deeds can be specific; the user-side description should stay in everyday values language.',
    '- Output strict JSON only.',
  ].join('\n');
}

export async function handleHeroNarrative(body) {
  const hero = body?.hero || {};
  const userAnswers = Array.isArray(body?.userAnswers) ? body.userAnswers : [];
  const sharedKeywords = Array.isArray(body?.sharedKeywords) ? body.sharedKeywords : [];

  const completion = await client().chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    response_format: { type: 'json_schema', json_schema: HERO_NARRATIVE_SCHEMA },
    messages: [
      { role: 'system', content: heroNarrativeSystemPrompt() },
      { role: 'user', content: JSON.stringify({ hero, userAnswers, sharedKeywords }) },
    ],
  });

  const text = completion.choices?.[0]?.message?.content || '{}';
  return JSON.parse(text);
}

// ---------- Helpers shared by both Vite middleware and Vercel handlers ----------

export const HANDLERS = {
  'next-question': handleNextQuestion,
  'rank-jobs': handleRankJobs,
  'hero-narrative': handleHeroNarrative,
};

export async function runHandler(name, body) {
  const fn = HANDLERS[name];
  if (!fn) {
    const err = new Error(`Unknown endpoint: ${name}`);
    err.statusCode = 404;
    throw err;
  }
  return await fn(body || {});
}
