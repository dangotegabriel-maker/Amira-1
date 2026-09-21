# Authoritative Incoming Call Identity Report

## 1. Baseline
Checkpoint 19 was implemented on `amira-v2` at exact starting HEAD `a103341837930866e02878761b1072107653a6ce` (`feat: strengthen authoritative social relationships`). The working tree was clean before work began.

## 2. Files changed/new/deleted
Changed: `functions/src/index.js`, `functions/src/publicIdentity.js`, their call/identity tests, `src/components/IncomingCallCard.js`, the privacy UI test, and the localhost privacy emulator. Added this report and its Git-status companion. No product file was deleted.

## 3. Audit findings
Normal incoming calls already had participant-only identity and authoritative Accept/Decline, but lacked Level, showed VIP beyond the intended surface, and did not recheck caller role, bidirectional blocks, or both call locks at Accept time. These were the material gaps.

## 4. Existing call architecture
Live records reside in `calls/{callId}` and terminal records in `callHistory/{callId}`. Callable transactions own lifecycle changes; clients subscribe to participant-scoped call records and render state.

## 5. Incoming-call discovery
The Host subscribes through `callService.subscribeIncoming` to ringing calls where the Host is participant/receiver. Identity is then fetched through `getCallParticipantIdentities`, rather than by a cross-user `users` read.

## 6. Normal call entry points
Consumer Home cards, full Host Profile, normal Match, and Messages use `startVideoCall` and converge on the same normal ringing record and incoming card.

## 7. Quick Match distinction
Quick Match retains `QuickMatchOfferCard`, its offer/accept lifecycle, hidden matching behavior, and source marker. It does not receive the normal-call VIP/Level enrichment.

## 8. Sponsored invite distinction
Sponsored calling remains a Host-to-Consumer invite with Consumer Accept/Not now. It does not create a redundant Host incoming decision or show the Consumer their own VIP/Level.

## 9. Safe Consumer identity source
The trusted callable reads the authenticated Host, the opposite call participant, the live call, and the authoritative VIP/Level documents using Admin SDK access.

## 10. Identity fields exposed
For an eligible normal ringing call the projection contains only `uid`, `username`, `profilePic`, current `vipActive`, and derived integer `level`. `canInteract` remains outside the identity object.

## 11. Identity fields prohibited
The projection excludes DOB, email, phone, wallet buckets, spending, lifetime qualifying purchases, VIP payments, payout data, documents, tokens, and raw user records.

## 12. Level authoritative source
Level derives server-side from `consumerLevels/{consumerUid}` and `levelConfig/current` through the established `levelDomain.deriveLevel` function.

## 13. Level fallback
Missing configuration uses the established default configuration, whose undefined production thresholds safely resolve to Level 0. Invalid/non-integer UI values are not rendered.

## 14. Level display
`IncomingCallCard` uses the existing `AmiraLevelBadge` and renders only integer values from 0 through 10.

## 15. VIP authoritative source
VIP is evaluated from `vipMemberships/{consumerUid}` with `vipDomain.active`, the current Consumer account, and server execution time.

## 16. VIP expiry behavior
VIP is evaluated when identity is requested. Membership ending at or before that instant produces `vipActive: false`, so a call-created snapshot cannot preserve stale VIP.

## 17. VIP display
The compact VIP badge appears only when `vipActive === true`; inactive, expired, missing, and malformed values show no badge.

## 18. VIP/Level non-authorization
Neither field is read by call eligibility, ranking, pricing, settlement, or lock logic. They are presentation outputs only.

## 19. Normal incoming-call UI
The existing card continues to show avatar, name, Video Call context, Accept, and Decline, now with compact Level and conditional VIP badges. It remains deliberately small.

## 20. Accept behavior
Accept remains transactional and now rechecks caller Consumer role/non-demo state, receiver approved/online Host state, both block directions, expiry/status, and ownership of both active-call locks.

## 21. Decline behavior
Decline remains an authoritative terminal transition with lock cleanup and does not mutate identity, social, VIP, or Level state.

## 22. Timeout behavior
The established normal ring timeout is 30 seconds in backend/client domain code. This is approximately the locked 25-second target and was preserved to avoid an unrelated lifecycle change.

## 23. Block during ringing
Either block direction makes Accept fail without state mutation. The identity callable disables interaction and suppresses VIP/Level enrichment, retaining only the pre-existing tiny participant identity.

## 24. Role change during ringing
A caller who is no longer a Consumer, is missing, or becomes demo cannot be accepted. Recipient approval/Host/online validation remains enforced.

## 25. Busy/call-lock behavior
Both participant lock documents must exist and point at this call before Accept. Missing or replaced locks fail closed, preventing stale UI from accepting a competing call.

## 26. Direct-call disclosure
The established preflight still discloses available Free Video Time, effective Credits/min, automatic continuation, and 10-second paid increments. No second confirmation was added.

## 27. Consumer economic privacy
The Host receives no Credit balance, Free Video Time balance, purchased/bonus/legacy composition, Chat Passes, recharge history, or spending.

## 28. VIP call discount preservation
The existing configurable paid-portion discount hook is untouched. No production discount was assigned, and Host earning basis remains protected by existing settlement code.

## 29. Quick Match identity behavior
Quick Match continues its existing offer identity. Tests prove a `source: quick_match` call receives only tiny identity and no normal-call VIP/Level fields.

## 30. Quick Match ranking preservation
Candidate filters and ranking were not edited. VIP, Level, Credits, Gifts, and friendship remain absent from ranking inputs.

## 31. Sponsored invite behavior
Host selection and Consumer Accept/Not now remain unchanged; after acceptance the existing call engine handles connection.

## 32. Sponsored economics preservation
The sponsored 30 connected seconds, subsequent FVT, paid continuation, and 10-second increments were not modified.

## 33. Messages call behavior
Messages launches the same normal `startVideoCall` path, so its Host recipient receives the same trusted incoming projection.

## 34. Home/Profile/Match call behavior
Home, full Host profile, and normal Match entry points converge on normal call creation; no entry-point-specific identity security was duplicated.

## 35. Full Consumer Profile consistency
Full profile remains its separate safe projection and already presents server-derived Level/VIP semantics. Incoming calls now use those same authoritative domains with a smaller field set.

## 36. Host Connect compact-card behavior
Compact Host Connect cards remain unchanged and expose neither VIP nor Level.

## 37. Conversation header behavior
Conversation identity/header code is unchanged; no VIP, Level, or Friends badge was introduced.

## 38. Friends badge absence
The incoming card contains no Friends lookup or badge. Friendship remains a messaging/social authorization concern.

## 39. Spending privacy
No total, rank, label, or proxy such as “high spender” is emitted. Only the configured Level result is presented.

## 40. Raw-user privacy
Firestore rules still deny ordinary cross-user raw `users/{uid}` reads. Trusted callable projection is the only new data path.

## 41. Call-record privacy
Call reads remain participant-bound under existing rules. The callable independently validates exactly two distinct participant IDs and authenticated membership.

## 42. Snapshot minimization
VIP and Level are not copied into call documents. Live derivation avoids stale sensitive metadata and additional stored disclosure.

## 43. Caller payload spoof resistance
Caller-provided call payload fields cannot supply VIP, Level, trusted name, or photo. The callable derives all displayed identity from backend records.

## 44. Host tampering resistance
Client rules deny protected role, approval, availability, rate, Level, and membership writes. Accept revalidates server documents inside its transaction.

## 45. Level privacy
Only the derived 0–10 integer leaves the callable. The qualifying lifetime purchase total is never included.

## 46. VIP privacy
Only the current active boolean leaves the callable. Price, provider, dates, payment history, and renewal data remain private.

## 47. Stale identity behavior
Each callable request rereads current profile, membership, account, config, block, and call state. The UI handles unavailable identity with its existing generic fallback.

## 48. Missing-photo behavior
The established tiny identity emits an empty photo string when no public photo exists; the card uses its existing avatar fallback and does not fabricate an image.

## 49. Amira ID behavior
Amira ID is intentionally excluded from this minimal incoming-call projection. It remains available on authorized full-profile surfaces.

## 50. Verification behavior
No verification badge or private verification material is added. Host approval is an acceptance prerequisite, not Consumer presentation.

## 51. Country/flag behavior
The card preserves conditional country rendering, but the tiny call projection does not currently emit country. No new country disclosure was introduced.

## 52. Call-source behavior
Normal enrichment requires a live ringing call, authenticated receiver Host, eligible Consumer caller, no source marker, and no block. Other sources retain their established UI.

## 53. Call-history behavior
History participants retain only tiny identity and `canInteract`; VIP/Level are never added to historical projections.

## 54. End-of-call independence
End, settle, recovery, availability restoration, and history movement do not read the new presentation fields and remain unchanged.

## 55. Gift independence
Gift debit, purchased provenance, Host earnings, and gift transactions are untouched and have no dependency on incoming identity.

## 56. Translation status
The badges reuse existing terse labels (`VIP`, existing Level component). No new sentence-level localization surface was introduced.

## 57. Push-notification status
No push provider exists in this path, so no delivery claim, token mutation, or fabricated push was added.

## 58. Normal-call tests
Unit and UI tests cover live ringing enrichment, current VIP expiry, valid Level display, malformed suppression, and absence of private/economic labels.

## 59. Entry-point tests
Existing `callEntry`, `callPaymentUi`, and call service tests remain passing, proving normal entry points still converge without changing call creation semantics.

## 60. Quick Match regression
Quick Match domain/UI/lifecycle tests pass, and identity tests explicitly prove its source marker prevents normal-call enrichment.

## 61. Sponsored regression
Sponsored domain and emulator suites pass with the 30-second foundation and distinct Consumer acceptance flow intact.

## 62. Checkpoint 18 regression
Social messaging emulator reports 71 checks; follow, block, friendship, profile, and relationship tests pass. No social badge was added.

## 63. Checkpoint 17 regression
Consumer rewards task, rewards rules, Level/rewards, and UI suites pass. No reward balance participates in call identity.

## 64. Checkpoint 16 regression
Who Viewed Me/VIP behavior remains covered by VIP and activity suites. Receiving a call creates no profile-view event.

## 65. Checkpoint 15 regression
Sponsored invite callable/domain/emulator tests pass; its source and economics are unchanged.

## 66. Checkpoint 14 regression
Automatic call continuation, FVT, pricing disclosure, settlement, and 10-second billing tests pass.

## 67. Checkpoint 13 regression
Quick Match reservation, sequential offer, lock, acceptance, and recovery suites pass without ranking changes.

## 68. Checkpoint 12 regression
VIP domain/service/UI/emulator tests pass, including active interval and expiry semantics.

## 69. Checkpoint 11 regression
Gift and credit foundation tests pass; call presentation does not touch wallet or Host earnings.

## 70. Checkpoint 10 regression
Paid messaging entitlement, debit/refund, and conversation tests pass with no call identity dependency.

## 71. Checkpoint 9 regression
Credit wallet invariant and reversal tests pass, including purchased/bonus/legacy/unallocated accounting.

## 72. Checkpoint 8 regression
User privacy emulator now reports 79 checks and confirms raw-user denial, safe projection sentinels, and call participant authorization.

## 73. Checkpoint 7 regression
Amira identity allocation and privacy suites pass; incoming calls do not broaden Amira ID exposure.

## 74. Checkpoint 3 regression
Level domain, service, visibility, rewards, and emulator suites pass; only qualifying purchases influence derived Level.

## 75. Security tests
Tests cover arbitrary nonparticipant denial, malformed participants, both block directions, current roles, demo callers, missing/replaced locks, private sentinels, and protected client writes.

## 76. Concurrency tests
Call lifecycle tests cover repeated responses and lock races; localhost transaction suites pass despite expected emulator retry diagnostics. Accept requires both current locks atomically.

## 77. UI tests
Incoming UI tests verify Level 4 and VIP presentation, accessibility label, Friends/Credits/spender absence, and safe behavior for malformed Level/inactive VIP.

## 78. Failure states
Missing profiles return unavailable identity; unauthorized participants fail; blocks disable interaction and enrichment; stale roles/locks reject Accept; malformed presentation data is omitted without crashing.

## 79. Performance/query behavior
One batched callable supports up to 30 distinct calls. Extra membership/account/config reads occur only for eligible live normal incoming calls; unrelated histories and sources avoid them.

## 80. Indexes
No query shape changed, so `firestore.indexes.json` required no modification.

## 81. Firestore rules
Rules required no change. Existing participant call reads and raw-user denials remain sufficient because enrichment occurs in a trusted callable.

## 82. Root test totals
Full root Jest passed: 65 suites, 670 tests, 0 failures.

## 83. Functions test totals
Standalone Functions Jest passed: 17 suites, 400 tests, 0 failures. Focused Functions validation passed 2 suites/107 tests.

## 84. Emulator totals
All 19 scripts passed: 16 on localhost 8289 and 3 on localhost 8189. The updated privacy suite passed 79 checks; both emulator processes shut down normally.

## 85. Babel/static parse
All repository JS/JSX/CJS source files outside dependencies and generated logs were parsed successfully using the installed Babel parser; count is recorded in the companion status file.

## 86. JSON parse
All tracked project JSON files outside dependencies were parsed successfully; count is recorded in the companion status file.

## 87. Git diff check
`git diff --check` completed without whitespace errors after cleanup.

## 88. Physical validation status
No physical-device or manual visual validation was performed. Results are automated unit, rendering-tree, domain, and localhost emulator evidence only.

## 89. Deployment requirements
The changed callable and Functions code would require a later authorized Functions deployment; the app component requires the normal client release process. No deployment was performed.

## 90. Remaining limitations/deferred work
Country is not present in the tiny call projection, there is no push provider, and physical-device validation remains pending. The established 30-second ring duration was intentionally retained.

## 91. Confirmation no production economic values invented
No call price, VIP price/discount, Level threshold, Gift value, earning value, or reward value was invented or changed.

## 92. Confirmation no production mutation
Only repository files and isolated emulator namespaces were written. Production Firebase and production data were not accessed or mutated.

## 93. Confirmation no deployment
No Firebase or application deployment was run.

## 94. Confirmation no staging
No file was added to the Git index; the staged diff remains empty.

## 95. Confirmation no commit
No commit was created; HEAD remains the required baseline.

## 96. Confirmation no push
No Git push or other remote repository write was performed.

## 97. Confirmation Storage unchanged
Firebase Storage configuration and data remain unchanged and disabled as before; no Storage operation ran.

## 98. Confirmation Paystack untouched
No Paystack API, webhook, verification, charge, refund, or configuration operation ran.
