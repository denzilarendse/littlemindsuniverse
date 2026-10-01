# Architecture 2.0 capability matrix

This matrix uses public product capabilities as research inputs. LMU will implement original capabilities and pedagogy, not proprietary source code, characters, artwork, lesson libraries or protected UI.

| Research inspiration | Publicly observed strengths | LMU-native engine | LMU differentiator |
| --- | --- | --- | --- |
| Khan Academy Kids | Ages 2–8; literacy/math; social-emotional and creative play; interactive activities/books/videos; personalized paths; teacher assignment/progress | Milo Early Learning World | Country-curriculum mapping, authentic evidence and one mastery record across early years and later schooling |
| PixKid | Early-childhood personalized learning; games; interactive/generated stories; parent progress | Milo Play & Story Studio | Theme-authority controls, curriculum-linked stories, evidence capture, teacher/guardian governance |
| LittleLit AI | Grade/age-level AI literacy; AI safety; bias; machine learning; visual AI; responsible-use projects | Milo AI Literacy & Creativity Lab | LMU-specific AI ethics, no-cheating policy, authentic projects and curriculum integration |
| Whizbee | Closed child-safe environment; finite missions; think-first flow; parent proof; no open-web child browsing | Milo Reasoning Missions | Evidence objects feed teacher review and mastery; missions can connect directly to classroom skills |
| Buddy AI | Voice-first 1:1 language practice; listening, vocabulary, pronunciation and game mechanics | Milo Voice & Language Coach | Multilingual/curriculum-aware routing, consent-aware audio, transcript evidence and teacher visibility |
| AdaptedMind | Strength/weakness detection; personalized learning plans; targeted math/reading practice | Milo Adaptive Learning Engine | Uses LMU mastery evidence, misconceptions, independence and intervention history instead of a separate score silo |
| Codingal | Age-progressive coding; projects; blocks; web/app/game creation; Python and AI/ML | Milo Coding & AI Builder | Safe sandbox, governed AI help, debugging as evidence and teacher-reviewed project mastery |
| Brilliant/Koji | Interactive problem solving; visual models; tutor can see current work; stepwise guidance instead of revealing answer | Brilliant Milo Tutor | Cross-curriculum LMU context, whiteboard/voice/tools, teacher governance and evidence/mastery integration |

## Age routing

- **2–4 Early Explorers**: narrator-led, touch-first, very short loops, matching/sorting, counting, phonological awareness, drawing, stories and movement.
- **5–7 Foundation**: early reading/writing/math, manipulatives, short voice practice, structured stories, first reasoning missions and visual coding concepts.
- **8–10 Discovery Builders**: adaptive practice, multi-step reasoning, subject tutoring, whiteboard evidence, language coaching and block coding.
- **11–13 Creator Academy**: deeper subject tutoring, research skills, web/coding projects, AI literacy and project evidence.
- **14–15 Pathfinder Academy**: advanced subject tutoring, coding/data/AI projects, structured research and independent mastery checks.
- **16–18 LittleMinds Edge**: advanced curriculum tutoring, higher-order projects, programming/AI, study/research support and transition skills.

## Cross-engine requirements

Every engine must:
1. accept a common LearnerContext;
2. bind to one or more CurriculumNodes where academic work is involved;
3. emit structured LearningEvents;
4. respect TutorPolicy and ToolPermission decisions;
5. never mutate mastery directly;
6. route reviewable evidence through the governed evidence/review path;
7. record assistance and independence accurately;
8. expose meaningful parent/teacher progress without exposing private child content beyond authorization;
9. use finite session objectives rather than unbounded engagement loops for children;
10. pass age-safety, authorization, accessibility and regression tests before release.

## Primary research references

- https://www.khanacademy.org/kids
- https://pixkidapp.com/
- https://www.littlelit.ai/ai-curriculum-for-kids
- https://whizbeeapp.com/
- https://buddy.ai/en/english-for-kids
- https://www.adaptedmind.com/
- https://www.codingal.com/en-US/curriculum/
- https://brilliant.org/help/features/
