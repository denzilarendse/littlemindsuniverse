# Milo Early Learning World + Play & Story Studio

Status: Architecture 2.0 Stage 4 implementation baseline  
Audience: ages 2–5 within LMU's Early Explorers / young Foundation routing

## Product objective

Create an original LMU early-childhood learning surface that a pre-reader can operate with large touch targets, optional narration and short activity choices. It uses the same learner identity, curriculum, evidence, teacher and mastery architecture as the rest of LMU.

This implementation adopts general early-learning patterns found in strong educational products but does not copy their characters, artwork, lesson libraries, code or protected layouts.

## Current activity catalogue

The Stage 4 baseline ships eight original activity starters in `assets/early-learning.js`:

- Number Garden
- Sound Hunt
- Shape Builder
- Pattern Train
- Story & Draw
- Move & Tell
- Sort It
- Feelings Story

Every activity is constrained to ages 2–5 and routes to either `early_learning` or `play_story` behind the single Milo identity.

## Interaction contract

- large, touch-first cards
- no reading required to discover the activity type
- optional text-to-speech narration using browser speech synthesis
- one-tap activity launch
- Milo receives a bounded, curriculum-oriented activity intent
- Milo sessions are server-trusted and logged through the common LearningEvent model
- young learner tutor sessions have hard turn budgets
- no microphone, camera, contacts or location permission was added by Stage 4
- teacher-assigned work remains visible inside Early Learning World

## Pedagogy

Early activities should use:
- one idea at a time
- concrete familiar objects
- point / count / move / say / draw responses
- short listening demands
- repetition with small variation
- transfer to a new example
- praise for effort and thinking rather than time-on-app

Avoid:
- multiple-choice-first instruction
- long chatbot paragraphs
- endless reward loops
- open-web exploration
- asking children for personal information
- content generation unconstrained by age/curriculum/safety policy

## AI architecture

The browser never chooses academic authority. The server resolves the active learner and trusted stage from Supabase. The Milo orchestrator then selects the appropriate specialist engine. For Early Explorers, generic requests default to `early_learning`; story/creative requests route to `play_story`.

A client-supplied age can be used only as fallback context. It does not override an established server learner stage.

## Session bounds

The server enforces a tutor-turn budget:
- EE24: 6 tutor turns per active session
- F57: 8 tutor turns
- older stages: 20 turns

When the budget is reached, the learner must start a new activity instead of entering an infinite chat loop.

## Progress and privacy

Stage 4 does not store tutoring conversation text in `milo_learning_events`. Common events contain categorical and length metadata only.

The secure `get_early_learning_summary` RPC exposes aggregated session/activity/completion counts to authorized learner/guardian/teacher relationships. It does not expose conversation content.

This activity summary is explicitly not a grade. Academic mastery remains evidence-based and teacher-governed.

## Accessibility and device behavior

- large touch targets
- responsive 4/2/1-column activity layout
- visible keyboard focus
- reduced-motion support
- narration button with accessible label
- existing responsive PWA and Android packaging remain intact
- no new dangerous Android permission is introduced

## Stage 4 completion boundary

This stage establishes the Early Learning World and Play & Story baseline. Richer manipulatives, curated media packs, localized narration assets and deeper adaptive sequencing can iterate later without changing the one-Milo/common-evidence architecture.
