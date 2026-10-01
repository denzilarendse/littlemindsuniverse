# Architecture 2.0 Capability Matrix

Status: Stage 1 planning baseline  
Date: 2026-10-01

This matrix identifies capabilities worth recreating as original LittleMindsUniverse behavior. It is not permission to copy proprietary code, content, characters, artwork, branding, or exact protected UI flows.

| Inspiration | Public capability pattern | LMU-native engine | Age/stage routing | LMU evidence outcome |
|---|---|---|---|---|
| Khan Academy Kids | playful early literacy/math, stories, creative activities, personalized paths, teacher progress | Milo Early Learning World | primarily EE24 and F57 | activity/attempt events; teacher-assigned work remains canonical mastery evidence |
| PixKid | personalized games, stories, multi-subject early learning, parent progress | Milo Play & Story Studio | EE24/F57 | bounded practice events and safe creative artifacts |
| LittleLit AI | age-level AI literacy, safety/responsible use, bias, ML/computer-vision concepts, projects | Milo AI Literacy & Creativity Lab | DB810 upward, simplified foundations as appropriate | project/reflection evidence |
| Whizbee | finite guided missions, try-first coaching, retry and transfer/proof | Milo Reasoning Missions | F57/DB810/CA1113 | first attempt, help, retry and transfer events |
| Buddy AI | voice-based language practice, pronunciation, listening, vocabulary and game loops | Milo Voice & Language Coach | age-adapted across stages | transcript/pronunciation evidence only when consent and policy allow |
| AdaptedMind | adaptive practice based on strengths/weaknesses and individualized routing | Milo Adaptive Learning Engine | F57 upward | recommendation/practice events; mastery stays teacher-governed |
| Codingal | age-progressive coding/AI projects from blocks to Python/AI | Milo Coding & AI Builder | DB810 upward, readiness-gated | code/project/debug evidence |
| Brilliant/Koji | context-aware interactive tutor that sees current work and guides without handing over the answer | Brilliant Milo Tutor | DB810 upward, with simplified variants for younger learners | tutor-session events and governed evidence candidate |

## Source record

Primary/public sources reviewed on 2026-10-01:

- Khan Academy Kids: https://www.khanacademy.org/kids
- PixKid: https://pixkidapp.com/pricing/
- LittleLit AI curriculum: https://www.littlelit.ai/ai-curriculum-for-kids
- Whizbee: https://whizbeeapp.com/
- Buddy AI: https://buddy.ai/en/english-for-kids
- AdaptedMind: https://www.adaptedmind.com/
- Codingal AI/ML: https://www.codingal.com/en-us/courses/ai-and-machine-learning/
- Brilliant Koji: https://brilliant.org/help/features/how-does-koji-work/

## Preserve / extend / replace

### Preserve
- current teacher authority
- current learning item / recipient / submission state machines
- private evidence storage
- teacher review
- mastery evidence and learner_skill_mastery
- LittleMinds Connect in-app communication
- current role separation and Supabase RLS/RPC model

### Extend
- Milo from role-aware chat into an orchestrated learning runtime
- learner context with server-trusted stage/curriculum/current work
- structured LearningEvent history
- early-years touch/narration experience
- reusable specialist engines
- tutor tool permissions

### Replace
- client-age trust for learner tutoring
- one-prompt-fits-all learner tutoring
- direct client teacher publishing sequence with a transaction-safe RPC
- user-facing historical references to external messaging integration

## Shared architectural rules

1. One visible AI identity: Milo.
2. One learner/mastery context.
3. One governed evidence path.
4. No engine directly writes teacher-approved mastery.
5. No child-facing unrestricted open-web browsing.
6. No engine broadens its own tool permissions.
7. Assessment mode is server-derived.
8. Data minimization is default.
9. Early-years sessions are short, touch-first and narration-friendly.
10. The verified assignment -> evidence -> review -> mastery flow remains a protected invariant.
