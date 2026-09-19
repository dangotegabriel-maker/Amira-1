# Authoritative Credits + Recharge Foundation Report

## 1. Baseline branch/commit
Work began from clean `amira-v2` at `7d49eb8`. All work remains local and unstaged.

## 2. Exact modified/new/deleted files
Modified: `firestore.rules`, `functions/src/index.js`, `src/components/GiftTray.js`, `src/config/devFeatures.js`, both Payment screens, Recharge Hub, Wallet, `firebaseService.js`, and `paystackService.js`. New: `functions/src/creditDomain.js`, `functions/src/creditService.js`, its domain test, `src/services/creditWalletService.js`, the credit emulator suite, this report, and the status capture. No file was deleted from the final tree.

## 3. Pre-implementation financial dependency audit
The audit covered wallet/coin/credit terms, recharge and payment UI/services, Paystack configuration, calls, rewards, Levels, earnings, rules, fixtures, environment files, and tracked history. `users/{uid}.wallet.creditBalance` was the call-compatible spendable authority; current recharge UI contained development top-ups and a fabricated checkout URL; local `ledgerService` records were unrelated, non-authoritative Gift/withdrawal scaffolding.

## 4. Every existing Consumer balance mutation path found
Trusted call settlement and recovery decrement `wallet.creditBalance`. Client `topUpWallet`, `updateWalletBalance`, old daily reward, Google-bind reward, Recharge Hub/Wallet test buttons, and GiftTray could attempt mutations. Profile bootstrap initializes zero. The client mutation methods now fail closed, Google linking grants no Credits, test buttons are removed, and Gifts are gated.

## 5. Canonical wallet model chosen
`users/{uid}.wallet.creditBalance` remains the temporary canonical spendable total required by locked call code. Protected `creditWallets/{uid}` is the authoritative provenance account and trusted mutations mirror its total to the compatibility field.

## 6. Purchased balance definition
`purchasedCredits` increases only after exact server verification of a known package. It is safe-integer validated, never inferred from legacy values, and is the future Gift-eligible source when composition is resolved.

## 7. Bonus balance definition
`bonusCredits` changes only through an internal trusted, idempotent grant method. No production reward was converted into Credits and bonus grants do not affect Level.

## 8. Legacy/unclassified balance treatment
An existing total without provenance becomes `legacyCredits`. It remains spendable by existing calls but is neither purchased, Level qualifying, nor Gift eligible. Unexplained compatibility increases also become legacy. Ambiguous ordinary call spending is recorded as `unallocatedSpentCredits`; bucket projections then fail closed.

## 9. Total balance invariant
`totalBalance = purchasedCredits + bonusCredits + legacyCredits - unallocatedSpentCredits`. Every component and money/package value is a nonnegative safe integer; currency amounts use integer minor units.

## 10. Compatibility with existing call debit
Calls continue reading and decrementing `users/{uid}.wallet.creditBalance`. A later trusted wallet operation reconciles any decrease as unallocated spending without inventing purchased-first, bonus-first, or proportional consumption.

## 11. Ledger schema and authorization
Entries live at `creditWallets/{uid}/ledger/{entryId}` with owner, type, direction, Credits, bucket, source, idempotency key, server timestamp, balance snapshot, and reversal link where applicable. Client reads/writes are denied; owner history is returned through an allowlisted callable projection capped at 100 entries.

## 12. Recharge package authority
The service accepts an injected, strictly validated server catalog and accepts only `packageId` from clients. Production wiring deliberately uses an empty catalog because no approved economics exist.

## 13. Payment-attempt lifecycle
`paymentAttempts/{reference}` stores authenticated owner, generated reference, package, exact minor-unit amount/currency, Credit grant, timestamps, and pending/failed/succeeded/reversed state. Clients have no direct access.

## 14. Idempotency/reference model
The server generates references. Attempt reference, provider transaction registry, recharge ledger ID, and Level qualifying-purchase ID are unique deterministic boundaries inside one Firestore transaction.

## 15. Provider-adapter boundary
Verification receives an injected server-only adapter called with the reference. Tests inject deterministic results. Production has no live adapter and fails unavailable.

## 16. Exact verification contract
It requires authenticated ownership, exact attempt/reference, provider success, exact integer amount and currency, unchanged package authority, unused provider transaction, unreversed attempt, and valid Consumer. Success atomically credits purchased balance, mirrors total, records Level, ledger, provider reference, and succeeded attempt.

## 17. Level qualification integration
Verified purchased Credits call the established `recordVerifiedPurchase` domain in the same transaction. Bonus, legacy, pending, failed, mismatched, and duplicate events add nothing.

## 18. Refund/reversal contract
The internal verified full-reversal path references the original attempt, is idempotent by reversal ID, moves purchase provenance out of purchased, reverses the established Level purchase, and appends a linked reversal ledger event without allowing negative purchased or qualifying totals.

## 19. Spendable reversal limitation/policy deferred
Spendable clawback/debt economics are undefined. Reversal therefore preserves total spendable Credits and reclassifies the reversed amount as legacy while removing purchase/Level/Gift eligibility. Partial reversals and negative wallets remain unsupported.

## 20. Recharge UI behavior
Recharge stays discoverable, shows the safe total when available, and states that recharge is unavailable. It exposes no packages, checkout, test top-up, payment-success toast, or fabricated success.

## 21. Transaction history behavior
Wallet shows only callable-projected authoritative entries and an honest empty/error/loading state. No fake purchase rows are seeded. Legacy local Gift/withdrawal records are not presented as Credit history.

## 22. Firestore rules
Clients cannot read or write `creditWallets`, nested ledger entries, `paymentAttempts`, or `paymentReferences`. Existing user-wallet and Level mutation protection remains in force. Safe wallet/history access is callable-only.

## 23. Paystack secret audit WITHOUT secret values
The ignored local `.env` contains a Paystack secret-like value; it was never printed or copied. Tracked current files contain no Paystack secret assignment. Local history contains Paystack secret-key references in earlier service revisions, but the redacted scan did not prove a credential-shaped literal.

## 24. Whether secret rotation is required
Rotation is required before any production launch as a precaution because a real local credential exists and prior exposure cannot be conclusively excluded. No rotation was attempted.

## 25. `.env`/`.gitignore` handling
Root `.env` is ignored and remains untouched/untracked. `.env.example` contains no secret. No secret placeholder or actual value was added to client configuration.

## 26. Client secret exposure status
Client Paystack environment reads were removed. No client code reads `PAYSTACK_SECRET_KEY` or an Expo-public Paystack key, verifies payments, logs provider configuration, or treats WebView navigation as success.

## 27. Exact tests added/updated
Added 10 domain tests for provenance, grants, invariants, reconciliation, reversal, strict catalogs/provider proof, and projection privacy. Added a 20-check real-emulator suite for initialization, concurrent verification, replay, provider-reference uniqueness, Level/ledger single effects, reversal, and rules denials.

## 28. Root Jest totals
Final full root run: **59 suites, 538 tests passed**, zero snapshots.

## 29. Standalone Functions totals
Final full Functions run: **12 suites, 274 tests passed**, zero snapshots.

## 30. Emulator results
New credits: 20 checks. Privacy 72; Creator 40; Level 53; discovery 47; Host Activity 82; Host Connect 68; Amira ID 58; call rules 24; social messaging 69; rewards 32; follow suite passed its full named assertions. All used isolated `demo-*` projects and edited rules.

## 31. Concurrency/race results
Two simultaneous verifications of one reference caused exactly one non-idempotent settlement, one 50-Credit increase, one recharge ledger entry, and one qualifying purchase. Emulator lock retries resolved without duplicate effects.

## 32. Babel/static parse
`@babel/parser` parsed **235** JS/CJS files under `src`, `functions/src`, and `shared` with JSX and unambiguous source type.

## 33. git diff --check
Passed. Git only reported expected Windows LF-to-CRLF working-copy notices.

## 34. Existing call accounting regression
Call domain, preflight, payment lifecycle, backend, UI, recovery rules, and race assertions passed. Free preview, connected-time charging, 10-second increments, pause/reconnect, idempotent settlement, earnings, locks, and legacy balance behavior were not redesigned.

## 35. Rewards/Level regression
Rewards UI/rules and Level UI/domain/backend/emulator suites passed. Existing entitlements remain distinct from Credits and Level remains lifetime verified-purchase based.

## 36. Privacy regression
The 72-check privacy suite, social/follow suites, account navigation, public identity, and protected financial rule checks passed. Raw user privacy was not loosened.

## 37. Migration/backfill requirements
No production backfill occurred. A future trusted migration may create provenance accounts, but unknown totals must initialize as legacy. Ordinary-spend bucket policy must be approved before resolving unallocated spending.

## 38. Deployment requirements
Future launch requires approved packages/economics, a deployed server-only provider adapter with secret injection, webhook/reconciliation operations, monitoring, and authorized Functions/rules deployment. Current empty catalog intentionally disables initialization.

## 39. Physical validation still required
Device UX, accessibility, offline/retry behavior, and a deployed sandbox payment round trip require later authorized physical validation. None is claimed here.

## 40. Remaining financial/security limitations
No live provider adapter, approved packages, webhook, partial refund, spendable clawback/debt policy, or ordinary-spend bucket order exists. Compatibility call spends can make composition unresolved and Gift eligibility then remains zero.

## 41. Confirmation no live Paystack request
No live Paystack API or checkout was contacted or enabled.

## 42. Confirmation no deploy/stage/commit/push/production mutation
No deploy, staging, commit, push, production Firebase mutation, billing/Storage activation, migration, backfill, or credential rotation occurred.

## 43. Confirmation deferred product areas
Gifts, paid messaging Credit unlock, VIP purchase, and Quick Match charging remain deferred. Existing separate rewards and Host Earnings semantics remain intact.

## 44. Confirmation core call system unchanged
Core call recovery, accounting, RTC, timing, pricing, commission, locks, and economics files were not modified or redesigned.
