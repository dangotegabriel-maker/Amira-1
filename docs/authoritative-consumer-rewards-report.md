# Checkpoint 17 — Authoritative Consumer Rewards Report

## 1. Baseline
Work began on branch `amira-v2` at exact HEAD `896b29e9532e3c563e50e0c17d37f69f217fc0e3` with an empty `git status --short`. That commit is `feat: add authoritative Who Viewed Me VIP access`.

## 2. Files changed, new, and deleted
Modified: `firestore.rules`, `functions/src/hostDiscovery.js`, `functions/src/index.js`, `functions/src/profileViews.js`, `functions/src/socialMessaging.js`, `src/screens/main/RewardsScreen.js`, `src/screens/main/__tests__/rewardsUi.test.js`, and `src/services/rewardsService.js`. New: `functions/src/rewardTaskDomain.js`, `functions/src/consumerRewardTasks.js`, `functions/src/rewardEvidence.js`, `functions/src/__tests__/rewardTaskDomain.test.js`, `src/services/__tests__/consumerRewardTasks.emulator.cjs`, this report, and the Git-status record. No product file was deleted.

## 3. Audit findings
The repository already had transactional Daily Check-In, three shared entitlement balances, Consumer-only role checks, UTC date keys, Level isolation, and the Checkpoint 9 wallet. It had no authoritative Getting Started/Daily Task catalogue, evidence store, task claims, or task UI. Messages, Likes, full-profile views, and genuine call connection already crossed trusted Functions and were suitable evidence sources.

## 4. Previous reward architecture
`consumerRewards/{uid}` stored `freeMessages`, `freeVideoSeconds`, `quickMatchCount`, `quickMatchReserved`, and check-in state. Daily Check-In claims lived under `consumerRewards/{uid}/claims/{UTC-date}`; Level milestone claims used the same entitlement balances. Firestore denied client balance writes.

## 5. Daily Check-In prior behavior
`createConsumerRewards` used a Firestore transaction, server clock, UTC date key, one claim document per date, `nextCheckInDay`, and an economy-config schedule with the established fallback. Same-day retries replayed without another grant.

## 6. Daily Check-In final behavior
That implementation remains unchanged. Task callables and collections are separate from check-in claims, so streak, reward, idempotency, and schedule behavior retain the Checkpoint 3 implementation.

## 7. Exact seven-day fallback schedule
Day 1: 3 Chat Passes. Day 2: 10 Free Video seconds. Day 3: 5 Chat Passes. Day 4: no economic reward. Day 5: 15 Free Video seconds. Day 6: 1 Quick Match entitlement. Day 7: 3 Chat Passes plus 10 Free Video seconds.

## 8. Streak and reset semantics
One UTC claim per day is enforced by `consumerRewards/{uid}/claims/{YYYY-MM-DD}`. A consecutive day advances and Day 7 wraps to Day 1. A gap resets the next reward to Day 1. Device time is not an input.

## 9. Day 4 semantics
The fourth schedule object normalizes to zero for all entitlement fields. The check-in and streak are recorded, while Credits, Chat Passes, Free Video, Quick Match, Gifts, VIP, and Level remain unchanged.

## 10. Getting Started architecture
Protected `consumerRewardConfig/current.gettingStarted` definitions are parsed by a strict domain module. The backend returns safe task projections, persists trusted evidence, computes progress, and accepts explicit claims through `claimConsumerRewardTask`.

## 11. Production Getting Started configuration status
No production configuration was created or seeded. With no `consumerRewardConfig/current`, the backend returns an unavailable empty catalogue and cannot grant a task reward.

## 12. Supported Getting Started criteria
The parser supports complete profile, add bio, follow approved Host, like approved Host, eligible Consumer message, and genuine connected video call. Photo completion is intentionally unsupported while Storage is disabled.

## 13. Completion authority
Profile and bio are read from the authoritative user document. Follow is validated from the Consumer-owned relationship plus an approved, non-demo Host. Likes, Consumer messages, full-profile views, call connection, and Quick Match connection create backend evidence inside their existing authoritative transaction.

## 14. One-time semantics
Getting Started uses period `once`; its claim ID contains Consumer, scope, task ID, task version, and `once`. Evidence uses stable action/entity IDs, so an observed milestone persists and a claimed milestone cannot reset or be farmed.

## 15. Daily Tasks architecture
Protected `consumerRewardConfig/current.daily` definitions use the same strict parser and grant engine. Their evidence, progress, claims, and UI are period-scoped to the authoritative UTC date.

## 16. Production Daily Task configuration status
No Daily Task definitions or targets were created in production. The screen truthfully reports that Daily Task rewards are unavailable until protected configuration exists.

## 17. UTC period model
The backend derives `YYYY-MM-DD` from its injected server clock. Daily evidence writes both an all-time record and a UTC-date record. Daily claim IDs contain the UTC date, and the transaction rejects a claim if UTC changes between precheck and commit.

## 18. Progress model
Progress is a bounded count of immutable, deduplicated evidence records for the criterion and period. Complete-profile, bio, and Follow observations are independently verified by the backend before it writes evidence. Client progress fields are ignored.

## 19. Target model
Each active definition carries a protected integer target from 1 through 100. Missing, zero, fractional, negative, or excessive targets invalidate the catalogue and cause fail-closed behavior.

## 20. Anti-farming and deduplication
Like and Follow evidence keys use the Host UID, message uses its stable message ID, calls use call ID, Quick Match uses request ID, and profile views use the existing 30-minute dedup window. Toggle loops overwrite the same stable record instead of adding progress.

## 21. Claim lifecycle
Safe projections expose `incomplete` as `claimable:false, claimed:false`, completed as `claimable:true`, and claimed as `claimed:true`. Claim rechecks eligibility, live config/version, completion, period, and prior claim before granting atomically.

## 22. Idempotency model
A deterministic claim document is created in the same transaction as the grant. Transaction contention retries converge on that document; later retries return `idempotent:true` without another balance or ledger mutation.

## 23. Claim IDs
The format is `consumer__scope__task__taskVersion__period`. Getting Started uses `once`; Daily uses the UTC date. IDs are based only on server-controlled parsed definitions and authenticated UID.

## 24. Supported reward types
Supported types are `FREE_MESSAGES`, `FREE_VIDEO_SECONDS`, `QUICK_MATCH_ENTITLEMENT`, `BONUS_CREDITS`, and `NONE`. Economic amounts must be positive safe integers no greater than 100,000; `NONE` has amount zero.

## 25. Unsupported reward types
Purchased Credits, Gifts, Promotional Gifts, Host Earnings, VIP, Level, cash, and every unknown type are rejected by strict config parsing. Unknown fields also invalidate a definition.

## 26. Free Message integration
`FREE_MESSAGES` increments the existing `consumerRewards.freeMessages` Chat Pass balance. It also creates the existing message-transaction shape with the established `task_reward` audit source. It does not open a chat window.

## 27. Free Video integration
`FREE_VIDEO_SECONDS` increments only `consumerRewards.freeVideoSeconds`. Existing call allowance ordering and the economy flag that controls earned-video activation are unchanged.

## 28. Quick Match entitlement integration
`QUICK_MATCH_ENTITLEMENT` increments existing `quickMatchCount` and leaves `quickMatchReserved` intact. Reservation, release, and connection consumption remain owned by Checkpoint 13.

## 29. Bonus Credit integration
`BONUS_CREDITS` uses `creditDomain.grant(wallet, 'bonus', amount)`, updates the canonical wallet and mirrored `users.wallet.creditBalance`, and creates one wallet ledger entry in the claim transaction.

## 30. Wallet invariant proof
For wallet state `P+B+L-U=T`, a Bonus grant produces `P+(B+a)+L-U=T+a`. The emulator fixture changed `(60,10,30,0,100)` to `(60,17,30,0,107)`; purchased, legacy, and unresolved spending were unchanged.

## 31. Level independence
No task path writes `consumerLevels`, `lifetimeQualifyingPurchasedCredits`, or user Level fields. The emulator confirmed no Consumer Level document was created after all five reward types.

## 32. Gift independence
Task rewards never call Gift service or write Gift transactions. Bonus is granted to `bonusCredits`, so purchased-only Gift eligibility is unchanged. The emulator found zero Gift transactions.

## 33. VIP independence
The task parser rejects VIP as a reward and the claim transaction never reads or writes VIP membership. No multiplier was added.

## 34. Host Earnings independence
No task claim writes `hostEarnings`, platform revenue, or interaction allocations. The emulator found zero Host Earnings records after claims.

## 35. Consumer-only eligibility
Every dashboard and claim reads `users/{uid}` and applies `isConsumer`; demo accounts are explicitly denied. Eligibility is rechecked inside the economic transaction.

## 36. Pending Creator behavior
The existing role model treats an unapproved submitted/pending Creator as Consumer. Emulator and UI regression coverage confirmed that state can view task infrastructure and remains eligible.

## 37. Approved Host behavior
Approved Hosts receive permission-denied from task dashboard and claim, and existing Profile/Rewards UI hides the Consumer entry. A Host transition racing a claim is caught by the in-transaction role check.

## 38. Demo account behavior
A profile with `isDemo:true` is denied before task projection or economic mutation. Trusted evidence sources also exclude demo Hosts where applicable.

## 39. Task config security
`consumerRewardConfig/{documentId}` denies all client reads and writes. Only safe projections from callable code expose title, description, bounded progress/target, status, and reward description.

## 40. Reward audit records
Every task creates `consumerRewardClaims/{claimId}` containing Consumer, task/scope/version, config version, period, reward snapshot, and server timestamp. Chat Pass and Bonus grants additionally use their established ledgers.

## 41. Server time authority
Both dashboard and claim compute time in Functions. Evidence timestamps come from server timestamp plus trusted execution time. No callable accepts a date, period, completion timestamp, or client clock.

## 42. UTC midnight behavior
Daily progress queries only the current UTC period. Yesterday's evidence remains audit history but contributes zero today. A midnight change during claim yields failed-precondition and requires refresh.

## 43. Config version behavior
Claim locates the same task ID and task version again from the configuration inside the transaction. Disable, removal, or version replacement before commit makes the claim fail without a grant.

## 44. Config absence behavior
Missing or malformed config returns empty/unavailable on dashboard. Claim fails with `failed-precondition`; normal messaging, calls, Likes, profile views, Follow, and Quick Match continue.

## 45. Failure behavior
Incomplete, unavailable, unsupported, changed, ineligible, and inconsistent claims fail before partial grant. Firestore transaction atomicity couples balance, ledgers, and claim record.

## 46. Offline behavior
The client cannot synthesize success. Callable failure shows “Unable to claim reward”; dashboard load failure shows retry and no fabricated balance or claim availability.

## 47. UI Daily Check-In
The seven-day strip, current-day highlight, claim button, established reward descriptions, Day 4 “Check-in only,” UTC reset explanation, and balance cards remain.

## 48. UI Getting Started
The Rewards screen now renders a Getting Started card. Configured safe tasks show title, description, progress, target, reward description, status, and Claim only when the backend marks the task claimable.

## 49. UI Daily Tasks
A separate Daily Tasks card uses the same truthful states. With no protected production catalogue it says Daily Task rewards are unavailable rather than displaying invented tasks.

## 50. Profile entry point
The existing `Rewards & Tasks` Profile entry remains Consumer-only. Pending Creators retain it; approved Hosts do not.

## 51. Popup arbitration
Checkpoint 17 adds no popup or automatic engagement modal. The existing one-major-engagement-popup-per-session behavior is therefore not competed with or weakened.

## 52. Claim feedback
Successful claims show “Reward claimed”; replay shows “Already claimed.” Failures show an error alert, and the task list is reloaded from the backend after success.

## 53. Security rules
New rules deny all client access to config and evidence, deny all claim writes, and allow a Consumer to read only their own claim. Existing protected entitlement and wallet rules remain.

## 54. Direct-write denial tests
The emulator denied config writes, evidence/progress fabrication, claim creation/timestamp changes, all entitlement increases, reservation changes, Bonus wallet mutation, and Host access to another Consumer's claim.

## 55. Race results
Four simultaneous claims produced one claim and one grant. Existing emulator suites also passed check-in concurrency, call transaction races, Quick Match reservation races, Credits mutations, VIP, sponsored invite, and social races. UTC rollover and live config/role rechecks fail closed.

## 56. Daily Check-In test results
Existing unit and emulator coverage passed first claim, same-day replay, consecutive advancement, gap reset, Day 7 wrap, exact schedule, Day 4 zero grant, server clock, Consumer/pending eligibility, Host denial, Level isolation, and no Promotional Gift.

## 57. Getting Started test results
Domain tests covered strict criteria/config and one-time IDs. The new emulator covered authoritative evidence, incomplete/missing-config failure, five reward types, four-way concurrent claim, replay, pending eligibility, Host/demo denial, and persistent claim state.

## 58. Daily Task test results
The new emulator proved UTC-date evidence, claimability, single grant, and next-day zero progress/claim denial. Existing profile-view, Like, messaging, call, and Quick Match suites validated the underlying genuine-action authority and dedup semantics.

## 59. Reward type test results
All five supported types granted as expected in isolated config. Unsupported types, negative, zero economic, fractional, unsafe, and over-limit amounts failed domain validation. `NONE` created a claim without economic mutation.

## 60. Economic regression results
Purchased Credits, Level, Gift transactions, Host Earnings, paid messaging, call billing, VIP, and recharge history were unchanged. The full Jest and emulator regression sets passed after the Chat Pass audit source was aligned to `task_reward`.

## 61. Root test totals
Full root Jest: **65 suites passed, 661 tests passed, 0 failed**.

## 62. Functions test totals
Standalone Functions Jest: **17 suites passed, 393 tests passed, 0 failed**. Focused task domain: **22 passed**. Focused Rewards UI: **17 passed**.

## 63. Emulator totals
All **19 emulator scripts** completed their assertions: 16 on port 8289 and 3 legacy scripts on 8189. New Consumer task suite: **34 checks**. Named results include call transaction race 11, call rules 40, discovery 47, sponsored invites 28, VIP 46, rewards rules 32, social messaging 69, plus the Follow assertion set. The 8189 Firebase CLI timed out during shutdown after printing script exit code 0; the three test processes themselves passed.

## 64. Babel and static parse
Repository-wide Babel/static parse passed for **262 JS/JSX/CJS files**, and JSON parsing passed for `package.json`, `functions/package.json`, `firebase.json`, and `firestore.indexes.json`.

## 65. Git diff check
`git diff --check` passed. Git emitted only the repository's Windows LF-to-CRLF notices; there were no whitespace errors.

## 66. Checkpoint 3 preservation
Daily Check-In code and schedule were not changed. Level remains Consumer-only and based strictly on lifetime qualifying purchased Credits.

## 67. Checkpoint 9 preservation
Bonus grants use the canonical P/B/L/U wallet and ledger. Generic spend/refund, reversal, purchased provenance, mirrored total, and Gift lower-bound logic were not changed.

## 68. Checkpoint 10 preservation
Chat Pass rewards reuse `freeMessages` and its transaction audit shape. Messaging priority, paid unlock price, refund, and 24-hour windows were not changed.

## 69. Checkpoint 11 preservation
No Promotional Gift concept or catalogue grant was added. Paid Gifts remain purchased-Credits-only and Host Gift earnings remain separate.

## 70. Checkpoint 12 preservation
VIP membership, payment, entitlement, and identity gating were untouched. VIP neither grants nor multiplies Consumer task rewards.

## 71. Checkpoint 13 preservation
Task Quick Match rewards only add available count. Existing reservation, no-match release, acceptance, connection commit, and intro behavior remain.

## 72. Checkpoint 14 preservation
Free Video reward seconds flow to the existing balance. Ten-second paid increments, automatic continuation, settlement, recovery, and Host earning math remain unchanged.

## 73. Checkpoint 15 preservation
Sponsored invite suppression, expiry, 30 connected seconds, paid continuation, and economics remain. A genuine sponsored connection can produce generic connected-call evidence without altering its billing.

## 74. Checkpoint 16 preservation
Consumer-to-Host full-profile tracking adds task evidence inside the already accepted genuine view transaction. Host-to-Consumer Who Viewed Me count, identity privacy, VIP reveal, and 30-minute dedup remain unchanged.

## 75. Physical validation status
No physical-device validation was performed or claimed.

## 76. Deployment requirements
Functions, Firestore rules, and app code would need normal reviewed deployment/release before this capability is live. Protected task configuration would then need a separately approved economic decision.

## 77. Production economics still requiring decision
Every Getting Started/Daily task selection, target, reward type, amount, copy, activation, and version remains undecided. There is no production catalogue.

## 78. Confirmation: no Promotional Gifts
No Promotional Gift field, reward type, transaction, catalogue item, or Host earning was created.

## 79. Confirmation: no fake rewards
The UI renders only backend projections. With missing config it renders an unavailable state, and no fake completion or success is synthesized.

## 80. Confirmation: no invented reward values
Only the pre-existing seven-day fallback remains. Task economic values exist solely in isolated test fixtures and were never written to production or app defaults.

## 81. Confirmation: no raw client economic authority
Clients submit only task scope and ID. The backend chooses definition, version, target, period, completion, reward type, amount, claim identity, and all balance mutations.

## 82. Confirmation: no production mutation
All writes used local demo-project Firestore emulators. No production Firebase data or configuration was read or changed.

## 83. Confirmation: no deployment
No Firebase or app deployment occurred.

## 84. Confirmation: no staging
No file was added to the Git index.

## 85. Confirmation: no commit
No Git commit was created.

## 86. Confirmation: no push
No branch or tag was pushed.

## 87. Confirmation: Storage disabled
Firebase Storage was not enabled, used, or changed. `ADD_PROFILE_PHOTO` is excluded from supported criteria.

## 88. Confirmation: Paystack untouched
No Paystack request, verification, secret, configuration, or production payment operation was performed.

## 89. Remaining limitations and deferred work
Production task economics and catalogue activation remain deferred. Evidence queries are intentionally bounded to 500 records per period; configured targets are capped at 100. Follow completion is observed when the task dashboard/claim verifies a live valid relationship, so an unobserved Follow that is removed before any server observation cannot count. Physical devices, offline/reconnect UX, and post-deployment end-to-end behavior still require future validation.
