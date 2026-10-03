# LMU physical-device pilot runbook

This runbook is the human evidence gate that cannot be replaced by emulator CI.

## Required device coverage

At minimum capture evidence from:
- one small Android phone;
- one current mainstream Android phone;
- one Android tablet where available;
- portrait and landscape;
- touch-only use;
- at least one device where microphone permission can be granted, denied, then revoked.

Record Android version, device model, app build SHA/hash and tester role. Do not record learner secrets or private message contents.

## Required role journeys

### Parent / guardian
1. Fresh signup from rendered UI.
2. Email confirmation/callback.
3. Parent profile and trial visible.
4. Add a managed learner.
5. Repeat for representative age bands across the pilot group.
6. Join a classroom.
7. Open settings and verify privacy/account links.
8. Open LittleMinds Connect where relationship-authorized.
9. Sign out, relaunch, sign in again.
10. Start and complete password recovery.

### Learner
1. Assigned work loads.
2. Milo starts and routes age-appropriately.
3. First-attempt restriction is enforced where applicable.
4. Voice feature: deny microphone; verify graceful explanation.
5. Grant microphone; verify feature works only after consent/device permission.
6. Revoke microphone; verify feature no longer records.
7. Submit work/evidence.
8. Kill app and relaunch.
9. Interrupt network during a save/send and verify safe recovery.
10. Verify no unrestricted learner messaging path appears.

### Teacher
1. Sign in with verified teacher account.
2. Classroom roster loads.
3. Create draft/lesson and map a skill.
4. Publish only to selected learners.
5. Review learner submission/evidence.
6. Approve/reject Milo recommendation.
7. Produce/approve weekly report.
8. Open Connect and verify relationship-limited contacts.

## Six age-stage coverage

Evidence must collectively cover:
- EE24 · ages 2–4
- F57 · ages 5–7
- DB810 · ages 8–10
- CA1113 · ages 11–13
- PA1415 · ages 14–15
- EDGE1618 · ages 16–18

## Usability observations

For every journey record:
- task completed without help: yes/no;
- where the tester hesitated;
- labels/buttons that were unclear;
- clipped/overlapping UI;
- keyboard/focus issues;
- back-navigation surprises;
- offline/reconnect confusion;
- permission prompt confusion;
- severity: P0 blocker, P1 major, P2 moderate, P3 cosmetic.

No P0/P1 issue may remain open for the pilot candidate.
