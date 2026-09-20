# Authoritative automatic paid call billing report

## 1. Baseline branch and commit
Audited and implemented on `amira-v2` at required baseline `7a044a1` (`feat: add authoritative Quick Match lifecycle`). The tree was clean before this batch.

## 2. Exact files modified, new, and deleted
Modified: `functions/src/{callDomain.js,callPaymentLifecycle.js,callPreflight.js,callRecovery.js,index.js,quickMatchService.js}`, `functions/src/__tests__/{callPaymentLifecycle.test.js,callPreflight.test.js,callRecovery.emulator.cjs}`, `src/screens/main/{MatchScreen.js,VideoCallScreen.js}`, `src/screens/main/__tests__/callPaymentUi.test.js`, `src/services/{billingService.js,callNavigationService.js,callService.js,callUiState.js,quickMatchService.js}`, and `src/services/__tests__/{billingService.test.js,callEntry.test.js,callRecoveryRules.emulator.cjs,quickMatchLifecycle.emulator.cjs`. New: this report and `docs/authoritative-automatic-paid-call-billing-git-status.txt`. Deleted: none.

## 3. Pre-implementation audit
The repository already had one authoritative accounting/recovery engine, dual-participant RTC evidence, connected segments, reconnect grace, free entitlement accounting, protected Host rates, wallet/ledger foundations, Host earnings, platform accounting, and a VIP call-pricing hook. It did not yet match automatic continuation or exact per-minute economics.

## 4. Old Continue Paid behavior
Accounting v2 exhausted free connected time, paused media, entered `awaiting_paid_confirmation`, and allowed the Consumer 60 seconds to invoke `confirmPaidContinuation`.

## 5. Unsafe or inaccurate behavior found
The old 10-second charge used `ceil(rate/6)` for every slice, so 25 Credits/min became six 5-Credit charges (30 Credits). Calls also updated only the compatibility balance rather than the P/B/L/U wallet. Both were corrected for v3.

## 6. Final authority architecture
Accounting v3 extends the existing recovery engine. Server transactions derive eligible connected usage, validate immutable economics/disclosure, reread the wallet, commit one or more deterministic increments, and atomically update the call, wallet, ledgers, Host earnings, and platform accounting.

## 7. Disclosure architecture
All direct-call entry points use the shared preflight/navigation path. The Consumer sees authoritative free time, effective Credits/min, automatic continuation, and 10-second billing before choosing Start Call. Quick Match shows the same truths before search.

## 8. Exact disclosure snapshot
Protected `economicsSnapshot` fields are `version`, `baseRatePerMinute`, `consumerRatePerMinute`, `hostEarningBasisPerMinute`, `platformAbsorptionPerMinute`, `vipPolicyVersion`, `billingIncrementSeconds`, `rateUnit`, `automaticPaidContinuation`, `disclosureAccepted`, `disclosureSource`, `disclosedAtMs`, `freeVideoSource`, and `freeVideoSeconds`.

## 9. Entry-point coverage
Home card, Host Profile, Match, and Messages converge on shared call navigation/preflight. Quick Match has its own pre-search disclosure and stores the same required terms version.

## 10. Accounting version
New disclosed calls use version 3. Version 2 remains readable and settleable under its original manual semantics.

## 11. Host rate source
The server validates the approved Host document and reads protected `hostProfile.videoRateCredits`. No client rate is trusted.

## 12. Host rate snapshot point
Direct calls snapshot at authoritative creation after accepted disclosure. Quick Match snapshots when the protected reservation is accepted and the call is created, before connection.

## 13. Rate units
Rates are integer Credits per minute; the billing interval is exactly 10 connected seconds.

## 14. Ten-second derivation
For increment index `n`, cumulative charge is `floor(rate*n/6)` and the increment is that value minus `floor(rate*(n-1)/6)`.

## 15. Awkward-rate remainder rule
Remainders are distributed deterministically across six blocks. At 25 Credits/min the sequence is `4,4,4,4,4,5`, totaling exactly 25 without floating point or systematic overcharge.

## 16. First-increment semantics
When valid free connected time reaches zero, v3 attempts the first increment immediately. Four later paid seconds still leave exactly that one committed increment.

## 17. Subsequent-increment semantics
Increment 2 becomes eligible at 10 paid connected seconds, increment 3 at 20, and so on. Cumulative connected paid time and the committed index define boundaries.

## 18. Connected-time authority
Only dual RTC acknowledgements and closed/open connection segments from Checkpoint 1 contribute free or paid time. Client display timers have no financial authority.

## 19. Disconnected-time behavior
Disconnected and ringing wall time add zero eligible seconds and cannot cross a billing boundary.

## 20. Reconnect behavior
The approximate 10-second grace, connection epoch, segments, call ID, economics snapshot, and increment index persist. Reconnect resumes the same accounting and cannot re-commit increment 1.

## 21. Billing-boundary race semantics
Transactions reread the call and deterministic ledger ID. Concurrent checkpoint/end/reconcile operations either commit the one eligible state or retry/observe it; no second debit or earning is created.

## 22. Ordinary-call free ordering
The existing ordinary authoritative allowance is used first. Current preflight selects the established ordinary free source (daily preview when eligible, otherwise earned Free Video Time); this batch invents no additional seconds.

## 23. Quick Match free ordering
The order remains 20 connected intro seconds, then Consumer Free Video Time, then automatic paid continuation.

## 24. Free Video Time behavior
It remains persistent seconds, consumed only from genuine connected time, never converted to Credits, and unchanged by ringing/disconnection.

## 25. Automatic paid transition
The recovery transaction transitions when authoritative free usage is exhausted and valid v3 disclosure/economics exist. It commits the first affordable increment in that same recovery flow.

## 26. Manual Continue Paid retirement
The product button and second-confirmation UI were removed. The callable remains only for legacy v2 compatibility; for v3 it reports the automatic authoritative state and cannot authorize new spending.

## 27. Insufficient first increment
The call ends with `insufficient_credits`, zero paid charge, no partial ledger entry, and no debt.

## 28. Insufficient later increment
Already committed increments remain valid; the unaffordable next increment is not written and the call ends cleanly.

## 29. Economic end reason
`insufficient_credits` is protected on the ended call and the client renders a truthful recharge-for-next-time message.

## 30. Wallet model interaction
Every v3 increment reads both the compatibility balance and authoritative wallet inside the same transaction, then writes matching totals.

## 31. P/B/L/U interaction
The invariant remains `totalBalance = purchasedCredits + bonusCredits + legacyCredits - unallocatedSpentCredits`.

## 32. Generic/unallocated spend behavior
Calls use `debitUnallocated`: P/B/L are unchanged, U increases by the charge, and total falls equally. No unsupported bucket order or purchased provenance is fabricated.

## 33. Concurrent spending protection
Calls, Gifts, and paid messaging transact on the same `users/{uid}` compatibility balance and `creditWallets/{uid}` document. Firestore conflict retries force each winner to validate the latest balance/provenance.

## 34. Credit ledger design
Each increment creates protected `creditTransactions/{callId}_{index}` and `creditWallets/{uid}/ledger/call_{callId}_{index}` records including call/parties/index, boundary, charge, base/effective rates, VIP policy, Host basis, timestamp, and balance-after evidence.

## 35. Increment idempotency
The stable identity is call ID plus increment index. Existing ledger/counter state makes retries observationally idempotent.

## 36. Host earning design
Internal pending Credits-equivalent accounting uses the protected base Host economics and existing commission policy. It does not create withdrawable cash.

## 37. Host earning idempotency
Host and call aggregates update in the same increment transaction, guarded by the deterministic increment ledger.

## 38. Platform accounting status
Existing internal Credits-equivalent platform accounting is updated atomically. A configured VIP discount may produce an absorption amount; no new cash or payout meaning was invented.

## 39. VIP policy hook
The server reads authoritative membership and `vipConfig/current`, then uses the existing VIP pricing domain. Missing/disabled/invalid policy yields the normal Host rate.

## 40. VIP snapshot point
VIP status and valid policy are evaluated when disclosed terms are accepted/call economics are created, then stored in the protected snapshot.

## 41. VIP expiry mid-call
Expiry does not rewrite accepted active-call economics.

## 42. VIP acquisition mid-call
Becoming VIP does not rewrite the active call; a later call can receive later authoritative terms.

## 43. Host earning basis under VIP
Host basis remains the base Host rate. Only the Consumer paid rate is reduced, and Amira absorbs the configured difference.

## 44. Level regression
Call spending changes neither lifetime qualifying purchased Credits nor Level. Only verified qualifying purchase/reversal authority remains relevant.

## 45. Gift regression
Gifts remain purchased-only. Call U increases make `max(0, P-U)` conservative, so call spending cannot manufacture Gift eligibility. Gift and call transactions share wallet conflict authority.

## 46. Messaging regression
Paid messaging semantics are unchanged; it and calls both use generic unallocated debits and the same authoritative wallet transaction boundary.

## 47. Quick Match regression
Reservation, no-match release, genuine-connection consumption, 20-second intro, and Free Video Time behavior remain intact. No Credit entry price was invented.

## 48. Creator regression
Applicant/approved-role boundaries and Consumer calling behavior remain covered by the full Functions and Creator emulator suites.

## 49. Privacy and security
Clients cannot write call accounting, snapshots, rates, indices, connected evidence, wallets, ledgers, or earnings. New emulator denials cover every added v3 protected surface.

## 50. Call settlement
Settlement recovers eligible increments and ends once; it does not apply a second aggregate debit after per-increment commits.

## 51. Recovery and crash behavior
Opportunistic sync, participant reports, end paths, and scheduled recovery use the same idempotent transaction. Closed connected segments let recovery reconstruct eligible time.

## 52. Legacy-call compatibility
Version 2 continues under prior manual confirmation/fixed-increment rules. Missing v3 disclosure fails closed and cannot trigger automatic historical charges.

## 53. Scheduler/background limitation
Continuous closed-app checkpointing requires the existing scheduled Function to be deployed. This batch was not deployed; local code also recovers idempotently on later authoritative activity.

## 54. Exact domain test totals
Focused client disclosure/billing validation passed 3 suites and 17 tests. The call/payment domain is also included in the full Functions total.

## 55. Exact Functions test totals
15 suites and 355 tests passed.

## 56. Exact root Jest totals
63 suites and 622 tests passed.

## 57. Exact emulator results
All 17 scripts passed: Credits 20, messaging 32, Gifts 45, VIP 46, Level/rewards 53, Creator 40, privacy 73, discovery 47, Host Connect 68, Host Activity 86, Quick Match 56, call rules 36, call transaction race 11, social messaging 69, rewards rules 32, Amira ID 58, plus follow-rules lifecycle. Numbered assertions/checks total 772, plus the follow-rules scenario suite.

## 58. Race test results
The real Firestore v3 recovery race passed 11 assertions across duplicate settle, end, reconcile, reconnect, and P/B/L/U convergence despite expected emulator lock retries. Cross-product safety is established by all spenders transacting on the same wallet docs plus Gift, messaging, Credits/reversal, and call transaction suites.

## 59. Babel/static parse
All relevant repository JS/JSX/CJS files passed the Babel parse sweep (253 files).

## 60. Git diff check
`git diff --check` passed.

## 61. Physical validation still required
No physical-device RTC, backgrounding, reconnect, weak-network, or UI-layout validation was performed.

## 62. Deployment requirements
Functions and client changes require the normal reviewed release/deployment process before production behavior changes. No deployment was attempted.

## 63. Production rate status
The existing protected approved Host rate remains the sole production rate source.

## 64. Production VIP discount status
No enabled production call-discount policy was found or added; VIP therefore pays the normal rate unless an authoritative policy is later configured.

## 65. No rate invented
Confirmed: no production call rate was invented.

## 66. No discount invented
Confirmed: no VIP percentage was invented. Discount behavior is exercised only with isolated test config.

## 67. No deploy
Confirmed: nothing was deployed.

## 68. No stage
Confirmed: nothing was staged.

## 69. No commit
Confirmed: nothing was committed.

## 70. No push
Confirmed: nothing was pushed.

## 71. No production mutation
Confirmed: no production Firebase or other production data was mutated; emulators used demo project IDs and localhost only.

## 72. Storage disabled
Confirmed: Firebase Storage was not enabled or used.

## 73. Live Paystack disabled
Confirmed: no live Paystack call was made.

## 74. Checkpoint 1 recovery preserved
Dual RTC evidence, segments, connection epochs, reconnect grace, locks, and recovery remain the time authority.

## 75. Checkpoint 9 Credits preserved
P/B/L/U invariants, generic unresolved provenance, recharge verification, reversals, and Level provenance remain intact.

## 76. Checkpoint 10 messaging preserved
Access pricing, idempotency, refunds, and generic wallet semantics were not redesigned and passed regression.

## 77. Checkpoint 11 Gifts preserved
Purchased-only eligibility, Gift economics, ledgers, Host earnings, and security remain unchanged and passed regression.

## 78. Checkpoint 12 VIP preserved
Membership authority and future call-pricing hook are reused; no client compatibility flag is trusted.

## 79. Checkpoint 13 Quick Match preserved
Reservation lifecycle, matching authority, genuine-connection consumption, failure release, and free ordering passed domain/emulator regression.

## 80. Remaining limitations and deferred work
Physical RTC/UI validation and actual deployment remain. Continuous background recovery depends on deployed scheduler infrastructure. Sponsored Host invitations and live mid-call recharge continuation remain outside this checkpoint.
