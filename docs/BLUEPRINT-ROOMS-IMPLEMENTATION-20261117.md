# Blueprint Rooms — Production Checkpoint

## Scope implemented on this branch

The existing canonical LMU repository was preserved. The repository already contains the shared shell, Supabase authentication and role model, Academy learning/evidence workflows, Milo tutoring, mastery/progress, classroom workflows, parent reporting, accessibility and Capacitor Android wrapper. Rebuilding those working systems would create unnecessary regression risk.

This increment adds blueprint-aligned room navigation and interactive demo surfaces for:
- PlayWorld: Maths Race, Spelling Quest and Science Lab Puzzles.
- StoryVerse Library: two leveled reading samples and three-question comprehension checks.
- Career Galaxy: interest exploration and a three-year pathway draft.
- Adult Academy: three course samples, skills checks and demo certificate records.
- Creator Studio: story/project drafts and class-only teacher approval queue.
- Community Garden: clubs, project submissions held for human moderation, emoji reactions and report controls.
- Parent Hub: demo family summary, screen-time setting and Community Garden opt-in.
- Teacher Studio: routes to existing classroom, lesson-authoring, marking and analytics workflows.
- Admin Console: restricted demo moderation queue and audit view.

The new room module updates the shared demo mastery collection after PlayWorld, StoryVerse and Adult Academy completion. The static room module is included in the PWA's explicit offline shell allowlist.

## Security boundary

- New room writes are demo-only. In live mode, mutation controls are disabled and the UI explains that no learner data is written.
- Demo records use browser local storage and contain only demonstration activity. They are never loaded into live mode.
- Career, Adult Academy, Creator, Parent, Teacher and Admin routes have role/age checks.
- Community Garden requires guardian opt-in for demo learners under 13, blocks email/phone/link patterns, holds every post for human review and exposes no direct-message composer.
- No database migration or production data change was applied.
- No production deployment was performed.

## Verification

- npm ci --ignore-scripts: completed.
- Baseline before this change: npm run check passed 305 tests.
- After this change: npm run check passed 311 tests, syntax check passed 101 JavaScript files, smoke tests passed and the static build emitted 27 production files.
- PWA tests now require the new room module in the precache allowlist and cache generation lmu-production-v15.

## Known limitations / release hold

This is a front-end/demo increment, not completion of the full LMU blueprint. Live persistence and RLS-backed APIs for PlayWorld, StoryVerse, Career Galaxy, Adult Academy, Creator Studio, Community Garden and the full Parent/Admin controls remain unimplemented. The room demo content is English-only and does not replace the required CAPS/content specialist review. Milo narration, verified SA salary data, live human moderation workflow, guardian child PIN authentication and production consent lifecycle still require implementation or verification. The existing Android wrapper was not rebuilt in this checkpoint.

## Recovery / next slice

Branch: production/lmu-blueprint-room-shell-20261117

Next engineering slice: design and test the server-side data model and RLS/RPC contracts for reading, games, career plans, adult courses, creator publishing, community moderation and guardian controls. Do not apply migrations to the live Supabase project without a separately approved recovery point and migration review.
