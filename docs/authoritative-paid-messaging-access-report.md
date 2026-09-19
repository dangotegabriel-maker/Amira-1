# Authoritative Paid Messaging + 24-Hour Access Report

## 1. Baseline branch/commit
Implementation began from a clean `amira-v2` at `4cec0dd`.

## 2. Exact modified/new/deleted files
Modified: `firestore.rules`; `functions/src/creditDomain.js`, `messageEntitlements.js`, `socialMessaging.js`; their Credit and social tests; `src/screens/main/ChatDetailScreen.js`; `src/services/chatPassService.js`; and the Host Activity/social emulator fixtures. New: `src/services/__tests__/paidMessagingAccess.emulator.cjs`, this report, and the status capture. No final-tree file was deleted.

## 3. Pre-implementation messaging dependency audit
The audit covered callable send/open access, conversation/message reads and summaries, direct rules, identity projections, follows/friendships, both block directions, Free Message rewards, Chat windows, notifications/banners, translation presentation, Credits/ledger/Level, and all messaging tests. One trusted `sendTextMessage` callable already owned text persistence and entitlement consumption.

## 4. Every existing message-send path found
`messagingService.sendText` invokes `sendTextMessage`; `socialMessaging.sendText` is the sole persisted text authority. Friendship system messages are backend-created separately. Direct conversation creation and message creation are denied. Read receipts alone remain narrowly client-writable. No alternate client text-send path was found.

## 5. Existing Free Message authority found
`consumerRewards/{uid}.freeMessages` is the existing protected counter. Trusted rewards/Level grants write it with `messageTransactions`; first send consumed one and created `chatWindows/{pair}`. This authority was reused.

## 6. Existing Friends/Block authority found
Friends are derived from two valid current follow records. Both block directions are read inside the send transaction. Friendship does not create a pass, and Block overrides every access source.

## 7. Final access priority implementation
Consumer-to-approved-Host send evaluates: Block, Friends, active pair window, Free Message, enabled paid config with sufficient Credits, then a typed unavailable/insufficient result. Host-to-Consumer remains free. Consumer-to-Consumer and Host-to-Host sends fail closed.

## 8. Access data model
The current projection remains `consumerRewards/{consumer}/chatWindows/{pair}`. It records Consumer, Host, pair, source, open/expiry times, and paid unlock linkage. Immutable paid audit records live at `messageAccess/{pair}/unlocks/{unlockId}`.

## 9. Pair-specific semantics
Conversation IDs are deterministic sorted UID pairs. Every current pass and immutable unlock stores the exact Consumer and approved Host. No global pass exists.

## 10. 24h timestamp/expiry authority
Trusted backend time is injected only for tests and otherwise uses server process time. Open and expiry values are backend-created; expiry is exactly `24 * 60 * 60 * 1000` milliseconds. At expiry, send priority is evaluated again and history remains.

## 11. Free Message atomic unlock
The trusted transaction rechecks roles, Block, Friends, current window, rewards, and configuration; decrements one Free Message; creates the pair window and entitlement receipt; and persists the first message atomically.

## 12. Free Message concurrency behavior
Concurrent first sends serialize on the same reward/window documents. At most one entitlement is consumed and one current window is opened; valid later/retried sends use that window.

## 13. Paid messaging configuration
Protected `economyConfig/current.paidMessaging` supports `enabled`, positive safe-integer `priceCredits`, and version. Duration and no-reply window remain locked server constants. The shape can later be extended by trusted policy for VIP discounting without consulting client VIP state.

## 14. Production price status
No production price or config document was created. Missing, disabled, malformed, zero, fractional, negative, or unsafe price disables paid messaging.

## 15. Paid Credit debit integration with Checkpoint 9
Paid send uses the existing protected wallet provenance state and mirrors its resulting total to `users/{uid}.wallet.creditBalance` inside the same transaction. It writes a protected Credit ledger debit and never changes Level.

## 16. Exact generic/unallocated spend accounting
`debitUnallocated` increases `unallocatedSpentCredits` by the charge and decreases `totalBalance` by the same amount, without selecting purchased, bonus, or legacy. `refundUnallocated` is the exact inverse and cannot exceed recorded generic spending.

## 17. Paid unlock atomicity/idempotency
The message ID derives the immutable unlock and ledger IDs. One transaction rechecks priority, validates server price and funds, debits once, writes wallet/ledger/window/unlock, and creates the message. Same-ID replay returns the existing message; concurrent distinct first sends share the newly created pass and charge once.

## 18. Insufficient-Credits behavior
The callable returns `resource-exhausted` with `reason: insufficient_credits`, required Credits, and available total. It creates no message, access, unlock, or debit. UI explains that the message was not sent and Recharge is currently unavailable.

## 19. Paid-disabled behavior
The callable returns `failed-precondition` with `reason: paid_messaging_unavailable`. No price is fabricated and no financial or messaging artifact is created.

## 20. Host->Consumer behavior
An approved Host can send a text to a Consumer at zero Consumer cost where unblocked. It consumes no Free Message, creates no Consumer pass, and creates no refund obligation. A later Consumer reply starts normal priority evaluation.

## 21. Genuine Host reply definition
Only a persisted `text` authored by the exact approved Host in the pair, at or after the paid unlock and strictly before its refund deadline, can mark the unlock replied. Consumer text, system/friendship events, receipts, call events, unlocks, and old messages do not qualify.

## 22. 10-minute deadline implementation
Each paid unlock stores backend-created `refundDeadline = openedAt + 10 minutes`. No client timer participates in financial correctness.

## 23. Reply/refund race semantics
Both paths transact on the immutable unlock. A Host text before the deadline changes `awaiting_reply` to `replied`; refund then cannot run. At or after the deadline, reconciliation changes it to `refunded`; late Host text cannot reverse that state.

## 24. Refund accounting
Due reconciliation restores exactly `chargeCredits`, reduces unallocated spending by that amount, mirrors total balance, writes a linked `message_access_refund` ledger entry, and marks the unlock refunded. It grants no purchased provenance and changes no Level or Free Message balance.

## 25. Refund idempotency
The deterministic refund ledger ID and unlock status provide idempotency. Concurrent and repeated reconciliation create one refund and one economic effect.

## 26. Why access remains active after refund
Refund changes immutable unlock financial state only. The current window retains its original 24-hour expiry, matching the locked promise that no-reply reimbursement does not revoke access.

## 27. Multiple access-period audit history
After expiry, a later first send creates a new deterministic unlock from its new message ID. The current window may advance, while all older paid unlock and ledger records remain immutable and separately refundable/auditable.

## 28. Message direct-write security
All message creates remain `allow create: if false`; callable Admin transactions are the only send path. Sender, receiver, type, server timestamp, access decision, charge, and unlock cannot be forged by a client. Read receipt updates remain field-limited.

## 29. Firestore rules
New `messageAccess` documents and nested unlocks deny all direct client reads and writes. Existing wallet, ledger, rewards, Level, raw-user, identity, approval, call, conversation, and message protections remain unchanged.

## 30. UI changes
ChatDetail displays an accurate Free Message disclosure, active expiry, configured authoritative paid price, or unavailable state. Insufficient Credits offers the existing Recharge route while stating Recharge is unavailable. No header badge, Level, VIP, fake balance, fake price, or client refund countdown was added.

## 31. System-event behavior
No unlock/refund conversation system events were added. This avoids schema expansion, duplicate summaries, and accidental reply qualification. Financial truth remains in protected unlock and ledger records.

## 32. Notification behavior
Existing message summary/banner behavior remains. Callable retry does not duplicate the message, so it does not create an extra notification basis. No refund or marketing notification infrastructure was invented.

## 33. Privacy regression
Messaging continues to use safe identity projections and participant conversation data. Unlock history is not directly readable. No wallet buckets, Level totals, email, phone, account ID, payout data, verification data, settings, or VIP internals were exposed.

## 34. Wallet/Level regression
Checkpoint 9 recharge, provenance, ledger, reversal, and financial-rule emulator checks passed. Generic debit/refund tests prove exact inversion and no negative balances. Paid messaging does not write `consumerLevels`.

## 35. Call regression
Call rules passed 24 checks and the real transaction race passed 9 assertions. Call backend/payment/recovery Jest suites passed. No core call, RTC, rate, timing, commission, earnings, lock, or recovery file was changed.

## 36. Exact unit tests added/updated
Credit domain adds generic debit/inverse refund, overdraft, amount-validation, and over-refund assertions. Social messaging adds paid-disabled, Host initiation, authoritative price, ignored client price, one debit, exact 24 hours, pair state, concurrent/retry idempotency, insufficient funds, timely reply, late reply, exact refund, duplicate reconciliation, ledger linkage, unchanged Level, and retained access coverage. Obsolete Consumer-to-Consumer fixtures now use an approved second Host.

## 37. Exact emulator tests/checks
New `paidMessagingAccess.emulator.cjs` passed **32 checks**, including real concurrent paid sends, replay, one unlock/ledger debit, exact concurrent refund, retained access, protected unlock fields/history, direct-send bypass, both impersonation directions, wallet/ledger/Level protection, privacy, Amira ID, Host approval, and Block.

## 38. Concurrency/race results
Real Firestore transactions charged once for two first sends, preserved both valid distinct messages, ignored same-message replay, and refunded once under concurrent reconciliation. Unit transactions cover Free Message first-send races and timely/late reply ordering. Block, follows, rewards, windows, unlocks, and wallet documents are transaction reads, causing conflicting authoritative changes to retry.

## 39. Root Jest total
Final full root result: **59 suites, 546 tests passed**, zero snapshots.

## 40. Standalone Functions total
Final Functions result: **12 suites, 282 tests passed**, zero snapshots.

## 41. All emulator regression results
Paid messaging 32; privacy 72; Creator 40; Level/rewards 53; discovery 47; Host Activity 82; Host Connect 68; Amira ID 58; call rules 24; Checkpoint 9 Credits 20; call transaction race 9; social messaging 69; rewards/economy 32; follow suite passed all named direction, ownership, schema, Block, query, count, and unfollow assertions.

## 42. Babel/static parse result
`@babel/parser` parsed **236 JavaScript/CJS files** under `src`, `functions/src`, and `shared` with JSX and unambiguous source type.

## 43. git diff --check
Passed. Only expected Windows LF-to-CRLF working-copy notices were emitted.

## 44. Deployment requirements for automatic no-reply refunds
Trusted opportunistic reconciliation runs when access is queried or either participant sends. Truly automatic refund while the app is closed and no later interaction occurs requires an authorized deployed scheduled Function or equivalent trusted queue/trigger that calls the same idempotent reconciler. No production scheduler is claimed.

## 45. Migration/backfill requirements
No production migration or backfill occurred. Existing active Free Message windows remain readable and valid. Paid unlock history begins only after approved config and deployment; historical conversations never grant access by themselves.

## 46. Physical validation still required
Device testing remains required for disclosure readability, keyboard/composer behavior, expiry refresh, offline retries, navigation to disabled Recharge, accessibility, and deployed server-clock/refund behavior. No physical validation is claimed.

## 47. Remaining product/economic decisions
An approved production messaging price, future VIP discount policy, deployment/reconciliation cadence, operational monitoring, and any refund notification copy remain undecided. Ordinary Credit bucket order remains intentionally unresolved.

## 48. Confirmation no production messaging price invented
No production price or config seed was added. Prices used in tests exist only in isolated fixtures.

## 49. Confirmation no deploy/stage/commit/push/production mutation
No deploy, Git staging, commit, push, production Firebase mutation, billing/Storage activation, configuration creation, migration, or backfill occurred.

## 50. Confirmation Gifts/VIP/Quick Match charging remain deferred
Gift settlement/earnings, VIP purchase/discount, and Quick Match lifecycle/charging remain deferred.

## 51. Confirmation live Recharge/Paystack remains disabled
Recharge remains truthfully disabled. No Paystack checkout, verification, secret use, or network request was enabled or performed.

## 52. Confirmation core call economics/recovery were not redesigned
Core call economics, recovery, 10-second increments, connected-time accounting, reconnect grace, Host earnings, platform revenue, and Busy locks were not redesigned or modified.
