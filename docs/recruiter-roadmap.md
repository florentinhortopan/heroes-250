# Recruiter & profile-capture roadmap

This document captures the longer-term direction for the Army Heroes quiz: turning anonymous quiz sessions into a recruiter-facing dataset, with a clean path from "no persistence" today to "first-class candidate profile" later.

Nothing here is wired up yet. The current build only personalizes the quiz itself (see `src/lib/scoring.js::computeSnapshot` and `server/api.js::nextQuestionSystemPrompt`). The phases below extend that work in order; each one is shippable on its own and additive.

## Why this exists

The eventual goal: a recruiter can open an admin panel, browse anonymous quiz profiles, see how each candidate scored against every MOS, and - the moment a user registers on the site - automatically link their existing quiz profile to their account so the recruiter can reach out with context.

To get there we need three things in roughly this order: durable session capture, structured storage, and an admin UI with auth.

## Phase A - Session capture (still anonymous)

Add a single fire-and-forget log of each completed quiz.

### Endpoint

`POST /api/log-session`, mirrors the pattern of `api/next-question.js`, `api/rank-jobs.js`, `api/hero-narrative.js`. Handler in `server/api.js` as `handleLogSession`.

### Record shape (one JSON object per completed quiz)

```json
{
  "sessionId": "uuid",
  "createdAt": "2026-05-14T19:23:00Z",
  "completedAt": "2026-05-14T19:24:30Z",
  "history": [
    { "question": "...", "answerText": "...", "keyword": "duty", "optionId": "..." }
  ],
  "snapshot": {
    "tallies": { "resilience": 2, "duty": 1 },
    "top2":    [ { "id": "...", "score": 0.62, "keywords": ["..."] } ],
    "topGap":  0.21,
    "probe":   ["leadership", "adaptability"]
  },
  "topHero":  { "id": "rbenavidez", "name": "...", "score": 0.7 },
  "rankedJobs": [{ "moscode": "68W", "score": 0.96, "reason": "..." }],
  "narrative":  { "tagline": "...", "paragraph": "...", "qualitiesCopy": [] },
  "client":     { "userAgent": "...", "locale": "en-US" }
}
```

This shape was deliberately picked to map 1:1 onto the Postgres schema in Phase B.

### Where the data lives

- **Local dev**: append to `data/sessions/<sessionId>.json`. Add `data/sessions/` to `.gitignore`.
- **Vercel (production)**: the serverless filesystem is ephemeral, so until Phase B lands, the handler should fall back to `console.log` only.
- **Feature flag**: gate every write behind `ENABLE_SESSION_LOG=1` so production stays a no-op until consent UX is in place.

### Client wiring

`sessionId` lives in `QuizContext` (initialized with `crypto.randomUUID()`, reset by `resetQuiz()`). `ResultsPage` fires `POST /api/log-session` once - and only once - after both `/api/rank-jobs` and `/api/hero-narrative` resolve. The call is fire-and-forget; failures are silently swallowed because they must never break the quiz UX.

## Phase B - Postgres migration

When we're ready to read sessions back in an admin UI, swap the dev disk write for a real database.

### Stack

`@vercel/postgres` (Neon under the hood, comes with the Vercel project). This was the chosen long-term backend during planning.

### Schema sketch

All tables keyed by `session_id` (uuid).

```
sessions       (session_id pk, created_at, completed_at, top_hero_id, narrative_tagline,
                user_id nullable, user_agent, locale, consent_at)
answers        (session_id fk, idx, question, answer_text, keyword, option_id)
ranked_jobs    (session_id fk, rank, moscode, score, reason)
hero_match     (session_id fk, hero_id, score, gap_to_runner_up, shared_keywords jsonb)
narratives     (session_id fk, tagline, paragraph, qualities_copy jsonb)
users          (user_id pk, email, hashed_password, created_at, ...)
```

The JSON record from Phase A maps cleanly: `history` -> `answers`, `rankedJobs` -> `ranked_jobs`, etc. A small one-time migration script can backfill existing JSON files.

### Indexes

- `sessions.top_hero_id` for "all candidates who matched hero X"
- `sessions.created_at` desc for the default panel sort
- `ranked_jobs.moscode` for "who's a top candidate for MOS 68W"

## Phase C - Recruiter admin panel

A `/admin` route, recruiter-only.

### Auth

Two reasonable options, both compatible with Vercel:

- **Auth.js (NextAuth)** - email magic links or password, single `users` table, lightest setup.
- **Clerk** - hosted, has admin dashboards for recruiter accounts out of the box, easy invite flow.

We default to Auth.js for simplicity, but Clerk is worth a look if recruiter onboarding becomes a real flow.

Recruiters get a separate `role` column; only `role = 'recruiter'` or `'admin'` can see `/admin/*`.

### Views (read-only at first)

1. **Session list** - paginated table of all sessions: created_at, top hero, top MOS, status (anonymous vs claimed). Filterable by hero, MOS category, and date range.
2. **Session detail** - the full record: all answers, hero match with shared keywords, top 12 ranked jobs with reasons, narrative.
3. **Job-fit search** - given a MOS code, list candidates ordered by `ranked_jobs.score` desc. This is the recruiter's main day-to-day view.
4. **Aggregates** - distribution of dominant keywords, popular heroes, conversion to registration. Lower priority.

### Export

CSV export per filter view. Internal-only, no email/PII included until Phase D lands consent.

## Phase D - Anonymous-to-registered linking

The whole point of carrying `sessionId` around is so that when an anonymous quiz-taker eventually signs up, we can attach their quiz profile to their new account without re-running anything.

### Mechanism

1. On quiz start, set a long-lived first-party cookie `aya_session_id` with the `sessionId` (also kept in `localStorage` for resilience). Lifetime: 1 year, `SameSite=Lax`, `Secure`.
2. On registration, the signup endpoint reads `aya_session_id` from the request and runs:

   ```sql
   UPDATE sessions
      SET user_id = $newUserId
    WHERE session_id = $sessionId
      AND user_id IS NULL;
   ```

3. If a user takes the quiz multiple times before registering, all matching `session_id`s under that cookie get associated. If a user re-takes after registering, the new session is logged with `user_id` set immediately.

### Privacy

- Sessions stay anonymous until claim. The cookie is the only link, and it lives on the user's device.
- A "delete my data" endpoint must scrub all sessions matching a given `user_id` (and any orphan `session_id` matched via cookie if the user is logged in).

## PII & consent

Even fully anonymous sessions can become re-identifiable when joined with a registration record. Before any production write of Phase A or B happens:

- Show a clear consent UX on the landing page (or before the quiz starts) explaining what we log and why.
- Make consent revocable; revoke must delete past sessions and disable future ones.
- Keep the consent timestamp on each session row.
- Treat the `client.userAgent` field as PII-adjacent - log a coarse browser family, not the raw UA string, once we go beyond dev.

## What we're explicitly NOT doing in any of these phases

- No tracking pixels, no third-party analytics on quiz pages.
- No emailing candidates from the panel until there's an explicit opt-in field on registration.
- No "free text" capture in the quiz - all keywords come from the fixed 8-keyword vocabulary in `server/api.js::ALLOWED_KEYWORDS`. This keeps the dataset clean and easy to anonymize.

## File touchpoints when each phase ships

- **Phase A**: `server/api.js` (handler), `api/log-session.js` (wrapper), `src/state/QuizContext.jsx` (sessionId), `src/pages/ResultsPage.jsx` (fire-and-forget call), `.gitignore`.
- **Phase B**: a `db/` folder with schema + migrations, swap `handleLogSession` to insert rows, drop the disk-write branch.
- **Phase C**: `src/admin/` (new), `api/admin/*` endpoints, auth wiring at the route guard level.
- **Phase D**: cookie setting on quiz start, claim logic in the signup endpoint, settings page for deletion.
