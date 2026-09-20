# Authoritative Sponsored Video Call Invites — Checkpoint 15

## 1. Baseline
Implemented on `amira-v2` from required clean HEAD `8ddfb12` (`feat: add authoritative automatic paid call billing`).

## 2. Exact files changed/new/deleted
Modified Firestore rules/indexes, Functions call entry/recovery/tests, Consumer Home/profile/messages, Host Activity and related tests. New domain/service/client/banner/emulator files are listed in the accompanying Git-status artifact. Deleted: none.

## 3. Pre-implementation audit
The audit covered invite wording, discovery, profiles, messages, Activity, stories, call creation, RTC, locks, connected-time accounting, recovery, billing v3, Credits, Gifts, VIP, Level, blocks and privacy.

## 4. Prior Invite behavior found
Host Activity contained a disabled “Invite coming later” placeholder. No authoritative sponsored invitation lifecycle existed.

## 5. Final invite authority model
Callable Functions own send, list and response operations; a scheduled reconciler owns stale expiry. Clients cannot write authoritative invite state.

## 6. Invite states
The implemented lifecycle uses `pending`, `declined`, `expired`, `connecting`, `connected`, `completed`, and `connection_failed`.

## 7. Invite ID/idempotency
A strict stable request ID is the invite document ID. Replays return the same invite, and accepted replays return the same call ID.

## 8. Eligible Host rules
Sender must be an approved, non-demo Host who is Online, not Busy, unlocked, not self-inviting and not blocked in either direction.

## 9. Eligible Consumer rules
Recipient must resolve to a real, non-demo Consumer. Approved Hosts cannot receive Consumer-sponsored entitlement.

## 10. Entry points implemented
Reusable Invite actions are live on Consumer full profile, existing Messages conversations, and Host Activity Visitors/Likes/Followers rows.

## 11. Entry points deferred
Story viewers are deferred. A separate Host Connect card action was not added because full Consumer profile already provides the safe action from discovery.

## 12. Story viewer status
No real Story publishing/viewer backend exists while Storage is disabled, so no Story invite UI was fabricated.

## 13. Notification infrastructure status
There is no production notification-delivery service in this repository. Consumer Home retrieves authoritative pending invites when focused.

## 14. Push status
No fake push notification was created or claimed.

## 15. Invite expiry
Pending invites expire after a documented implementation constant of 60 seconds; the server clock decides validity.

## 16. Call ring timeout distinction
Invite lifetime is separate from the existing approximately 25-second connecting timeout and 10-second reconnect grace.

## 17. Acceptance revalidation
Acceptance transactionally rechecks recipient, status, expiry, both roles, demo flags, blocks, Host availability, both call locks, current rate, VIP policy and disclosure fingerprint.

## 18. Duplicate Accept behavior
The invite can create at most one call. Repeated Accept returns its existing safe call result.

## 19. Decline behavior
“Not now” authoritatively marks the invite declined, creates no call or entitlement, and adds a stronger pair suppression signal.

## 20. Ignore/expiry behavior
Scheduled and read-time reconciliation mark unanswered invites expired, create no economics and add a gentler suppression signal.

## 21. Anti-spam algorithm
Suppression is server-owned per Host/Consumer pair, based on decaying decline/expiry signals and independent of UI source.

## 22. Anti-spam constants
Decline weight is 2, expiry weight is 1, threshold is 3, decay step is six hours, base cooldown is one hour, and cooldown is capped at 24 hours.

## 23. Suppression decay/recovery
Score decays by one per six elapsed hours. Suppression clears as time advances; there is no permanent punishment.

## 24. Pair scope
The pair key is Host UID plus Consumer UID, so switching profile/messages/activity cannot bypass suppression.

## 25. Duplicate invite protection
One unexpired pending invite per pair is returned on duplicate sends; no second invite or notification is created.

## 26. Active call locks
Acceptance creates the same authoritative participant locks used by existing calls and Quick Match.

## 27. Busy handling
Send and Accept reject Busy Hosts. Successful reservation alone transitions the Host to Busy; recovery restores availability.

## 28. Online/Offline handling
Host must be Online at send and again at Accept. Going Offline makes the pending invite unusable.

## 29. Call creation reuse
Accepted invites create the existing `calls` document shape with accounting v3, source attribution and existing recovery paths.

## 30. RTC authority
RTC credentials remain server-created. Genuine dual participant acknowledgement starts connected-time accounting.

## 31. Exact sponsored duration
Each accepted sponsored call carries exactly 30 sponsored connected seconds.

## 32. Sponsored connected-time authority
The counter derives from authoritative connection segments, not send, display, Accept, ring or setup wall time.

## 33. Disconnect behavior
Disconnected wall time consumes no sponsored seconds.

## 34. Reconnect behavior
Reconnect resumes the same call and remaining phase; it cannot reset or duplicate the 30 seconds.

## 35. Sponsored economics
Sponsored time is promotional zero-charge, zero-Host-earning, zero-call-revenue time; it is not funded by Host Credits.

## 36. Host zero earning proof
Settlement removes sponsored seconds before paid increments. At 29 or exactly 30 sponsored seconds, paid increments and Host call earning remain zero.

## 37. Consumer zero charge proof
Wallet debit begins only when connected time exceeds sponsored plus reward allowance and an authoritative 10-second paid increment commits.

## 38. Gift independence
Gifts retain their purchased-only debit and Gift earning path and do not change call phase, sponsored remaining time or messaging access.

## 39. Exact sponsored?FVT?paid ordering
Order is 30 sponsored connected seconds, then persistent Consumer Free Video Time, then Checkpoint 14 automatic paid continuation.

## 40. Ordinary preview exclusion/inclusion decision
Ordinary direct-call preview is excluded for `sponsored_invite`, as it already is for Quick Match; the sponsored allowance is this source’s introduction.

## 41. Free Video Time behavior
Reward seconds begin after sponsored seconds, consume connected time only, persist independently and create no call earning.

## 42. Paid continuation behavior
When free allowances finish, valid accepted v3 terms and sufficient Credits automatically continue into existing paid billing without a second confirmation.

## 43. First paid increment
The first paid segment uses existing 10-second reservation/commit and insufficient-credit termination semantics.

## 44. VIP behavior
VIP does not extend sponsored time or bypass suppression. Only an authoritative configured VIP policy may affect the later paid Consumer rate.

## 45. Host earning basis
The accepted snapshot preserves the base Host earning basis; sponsored and reward seconds add no Host call earning.

## 46. Disclosure model
Before Accept, the banner states 30 sponsored seconds, current reward time, current effective rate, automatic continuation and 10-second billing.

## 47. Disclosure terms fingerprint/version
SHA-256 covers sponsored version/duration, base/effective rates, VIP policy, increment length and automatic continuation. Dynamic reward balance is intentionally excluded.

## 48. Stale rate handling
A changed Host rate yields `terms_changed`, updates authoritative terms and creates no call until the Consumer accepts again.

## 49. Stale VIP handling
VIP policy/price changes alter the fingerprint and require refreshed acceptance. Reward balance may change dynamically without fabricating paid terms.

## 50. Economics snapshot
The immutable v3 snapshot records source, invite ID, sponsored seconds, rates, Host basis, VIP policy, 10-second billing and disclosure evidence.

## 51. Accounting source representation
Sponsored seconds are a dedicated call source/allowance and are not represented as Consumer rewards.

## 52. Unused sponsored seconds
Unused seconds disappear at call end and cannot be banked, transferred or reused.

## 53. Connection failure
A never-connected accepted call consumes zero sponsored/reward/paid time, earns zero, and existing recovery releases locks and restores Host state.

## 54. Settlement
Recovery reconstructs sponsored seconds, reward seconds, paid duration, committed increments, billed Credits, Host earning and terminal reason.

## 55. Call history
The existing call record/history path remains authoritative and carries sponsored source attribution.

## 56. Analytics foundation
Protected invite/call fields support sent, response, expiry, connection, sponsored usage and paid conversion analysis without a new dashboard.

## 57. Conversion attribution
Paid increments remain on the same `sponsored_invite` call with invite ID attribution; no conversion bonus was invented.

## 58. Level regression
Sponsored sends, accepts and free seconds do not alter Level or lifetime qualifying purchased Credits.

## 59. Messaging regression
Invites do not grant reply access, a messaging pass, Friendship or Free Message consumption.

## 60. Social regression
Invites do not create Follow, Like or Friendship state.

## 61. Block regression
Either block direction prevents send and is revalidated at Accept.

## 62. Privacy boundary
UI entry points use existing safe projections. No new client cross-user raw-user read was added.

## 63. Firestore security
`sponsoredCallInvites` and `sponsoredInvitePairs` are server-only; existing calls, locks, earnings and ledgers remain protected.

## 64. Domain test totals
Sponsored domain tests are included in the passing Functions and root totals; focused sponsored/domain UI run passed 2 suites and 16 tests.

## 65. Functions test totals
Standalone Functions Jest passed 16 suites, 371 tests, zero snapshots.

## 66. Root test totals
Full root Jest passed 64 suites, 638 tests, zero snapshots.

## 67. Emulator totals
All 18 emulator scripts passed in isolated localhost demo projects. The new sponsored lifecycle/race/security suite passed 28 checks.

## 68. Race results
Duplicate send, Accept/Accept, Accept/decline, server expiry, rate staleness, call-lock contention and paid-boundary recovery produced deterministic safe outcomes.

## 69. Babel/static parse
Babel parsed 259 JS/JSX/CJS files under application, Functions and shared sources.

## 70. Git diff check
`git diff --check` passed; only line-ending notices were emitted.

## 71. Physical validation required
No physical-device validation was performed or claimed. Two-device tests remain required after eventual build/deployment.

## 72. Deployment requirements
Deploy Functions/rules/indexes through the normal reviewed release process before production use; this checkpoint performed no deployment.

## 73. Scheduler/push limitations
Expiry uses a five-minute scheduled reconciler plus read-time expiry. Production push delivery is deferred because no real push infrastructure exists.

## 74. Confirmation no fake push
Confirmed: no fake notification or push-delivery claim was added.

## 75. Confirmation no rate invented
Confirmed: Host pricing must be an authoritative positive rate or the operation fails closed.

## 76. Confirmation no VIP discount invented
Confirmed: the existing VIP pricing domain is reused; no new discount was introduced.

## 77. Confirmation no Host earning invented
Confirmed: sponsored and reward seconds earn zero; existing paid Host basis begins only with committed paid increments.

## 78. Confirmation no rigid daily quota
Confirmed: suppression is pair-signal based and decays; no daily invite quota exists.

## 79. Confirmation no deployment
No Firebase or application deployment occurred.

## 80. Confirmation no staging
No file was staged.

## 81. Confirmation no commit
No commit was created.

## 82. Confirmation no push
No Git push occurred.

## 83. Confirmation no production mutation
All backend integration tests used localhost demo projects; production Firebase was not accessed or mutated.

## 84. Confirmation Storage disabled
Storage remains disabled and no Storage-backed Story feature was added.

## 85. Confirmation live Paystack disabled
No Paystack request was made.

## 86. Checkpoint 1 preserved
Dual RTC acknowledgement, connection segments and connected-time authority remain the basis for usage.

## 87. Checkpoint 8 privacy preserved
Safe projections and server-only authoritative documents preserve the cross-user privacy boundary.

## 88. Checkpoint 9 Credits preserved
Existing P/B/L/U wallet accounting and paid-call debit/refund paths are reused unchanged.

## 89. Checkpoint 10 messaging preserved
Paid/free messaging eligibility and refund behavior are unchanged.

## 90. Checkpoint 11 Gifts preserved
Purchased-only Gift debit and independent Gift earnings remain unchanged.

## 91. Checkpoint 12 VIP preserved
Existing VIP entitlement and pricing policy authority are reused.

## 92. Checkpoint 13 Quick Match preserved
Quick Match reservation, intro, locks and source accounting remain separate and passing.

## 93. Checkpoint 14 automatic paid billing preserved
Accounting v3, disclosure, 10-second increments, recovery and insufficient-credit ending remain the paid continuation engine.

## 94. Remaining limitations/deferred work
Real push delivery and Story-viewer entry await real infrastructure. Consumer Home refresh is focus-based. Physical two-device behavior and weak-network/background behavior require post-deployment validation.
