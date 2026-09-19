# Authoritative Gifts + Host Earnings Foundation

## 1. Baseline branch and commit
Implementation began from a clean `amira-v2` working tree at required commit `fe112c8` (`feat: add authoritative paid messaging access`).

## 2. Exact modified, new, and deleted files
Modified: `firestore.rules`; `functions/src/__tests__/creditDomain.test.js`; `functions/src/creditDomain.js`; `functions/src/hostActivity.js`; `functions/src/index.js`; `src/components/GiftTray.js`; `src/components/GiftingLeaderboard.js`; `src/screens/host/HostActivityScreen.js`; `src/screens/main/ChatDetailScreen.js`; `src/screens/main/GiftLedgerScreen.js`; `src/screens/main/LeaderboardScreen.js`; `src/screens/main/MomentsScreen.js`; `src/screens/main/UserProfileScreen.js`; four profile/message UI tests; and `src/services/__tests__/hostActivity.emulator.cjs`. New: `functions/src/giftDomain.js`, `functions/src/giftService.js`, `functions/src/__tests__/giftDomain.test.js`, `src/services/giftService.js`, `src/components/__tests__/giftTray.test.js`, `src/services/__tests__/giftFoundation.emulator.cjs`, this report, and the Git-status artifact. Deleted: none.

## 3. Pre-implementation Gift audit
The existing Gift tray was a local hardcoded catalogue; Moments emitted a socket-only Gift; leaderboard and ledger screens used mock/local data. Host Profile and Messages had disabled/alert placeholders. Host Activity Gifts was empty. No authoritative Gift transaction, protected catalogue, purchased-only debit, or Gift earning record existed.

## 4. Legacy, fake, and Promotional Gift behavior found
No active Promotional Gift entitlement remained from Checkpoint 9/10. Fake runtime behavior did remain: arbitrary tray Gifts/prices, a fabricated Moment “Finger Heart,” fake spender rankings, and AsyncStorage Gift history. The tray was replaced; Moment socket gifting was removed; rankings and local history now state they are unavailable. Dormant `GiftingContext`, `GiftingOverlay`, `giftingService`, socket helpers, and legacy ledger methods remain unreferenced scaffolding and are not authoritative product paths.

## 5. Final Gift authority architecture
Authenticated callables expose a safe catalogue projection, atomic send operation, and safe public Host aggregate. `giftConfig/current` is protected policy. A Firestore transaction validates users, blocks, config/economics, wallet capacity, and atomically writes wallet debit, ledger, immutable Gift truth, Host earning record/totals, platform accounting, aggregate, and Gift message event.

## 6. Role eligibility
The backend reads current user documents. Only a non-demo Consumer may send and only a non-demo approved Host may receive. Pending applicants remain Consumers. Host sender, Consumer recipient, and Host-to-Host cases fail.

## 7. Block handling
Both `users/{consumer}/blocked/{host}` and the reverse document are transaction reads. Either document denies the operation before any write. Firestore retries a transaction if a read changes before commit.

## 8. Purchased-Credits-only eligibility formula
Safe capacity is `max(0, purchasedCredits - unallocatedSpentCredits)`. A successful Gift subtracts the price from `purchasedCredits` and `totalBalance` only.

## 9. Treatment of unallocatedSpentCredits
All unresolved generic spending is conservatively reserved against purchased provenance. This is the worst-case assumption and prevents bonus/legacy/unresolved value from being presented as verified purchase-backed capacity.

## 10. Mixed-wallet behavior
Bonus and legacy buckets never contribute. Purchased+bonus, purchased+legacy, and all-bucket wallets may spend only the conservative purchased capacity. Generic refund reduces unallocated spending and can restore capacity. High total balance cannot compensate for inadequate purchased provenance.

## 11. Gift catalogue config architecture
Protected `giftConfig/current` contains an enabled flag, catalogue version, strict Gift definitions (`giftId`, name, positive integer Credit price, asset reference metadata, enabled state, display order, economics version), and economics policy. Unknown fields, duplicates, mismatched versions, unsafe numbers, and invalid shapes fail validation.

## 12. Production catalogue status
No production catalogue exists or was seeded. Missing, disabled, or invalid config returns an empty unavailable catalogue and prevents sends.

## 13. Gift economics config architecture
Protected economics supplies a version and Host share in basis points. Allocation uses integer arithmetic: Host receives floor(price × basis points / 10,000); platform receives the exact remainder. Client inputs cannot specify price or either share. Transactions snapshot versions and allocations.

## 14. Production Host/platform split status
No production split was selected or stored. The 25% value exists only inside the isolated emulator fixture and is never loaded by production runtime.

## 15. Gift transaction model
`giftTransactions/{transactionId}` records sender, Host, Gift ID and display snapshot, price, source, catalogue/economics versions, both allocations, linked ledger/earning IDs, request relationship, status, server timestamp, and schema version. Historical display truth does not depend on current config.

## 16. Credit ledger integration
`creditWallets/{uid}/ledger/gift_{transactionId}` is created in the same transaction with purchased bucket, debit direction, exact credits, balance-after provenance, source reference, and idempotency key. Client access remains denied.

## 17. Host Earnings integration
Each Gift creates `hostEarnings/{hostUid}/giftTransactions/{transactionId}` and updates the existing Host earnings document without changing call accounting. Duplicate retries cannot duplicate the earning.

## 18. Exact Host earning accounting semantics
Gift earnings are `pending_internal` Credit-equivalent accounting with `payoutEligible: false`. `giftPendingCreditsEquivalent` and `lifetimeGiftCreditsEquivalent` are added; the existing unified `pendingCreditsEquivalent` is incremented. No cash, availability, payout timing, or withdrawal claim is made.

## 19. Idempotency design
The transaction ID is SHA-256 over the fixed domain, authenticated Consumer UID, and stable client request ID. Retrying the same logical request returns the original transaction. A pending client request retains its request ID after network failure; success clears it.

## 20. Concurrency behavior
All economic reads/writes use one Firestore transaction. Same-request concurrent calls converge on one transaction/debit/earning/aggregate. Distinct request IDs represent distinct taps. Config, role, block, and wallet changes force retry against current authority or fail.

## 21. Insufficient purchased Credit behavior
The callable returns `resource-exhausted` with reason `insufficient_purchased_credits`, required amount, and safe eligible amount. There are zero economic side effects. UI states that purchased Credits are required and that Recharge is not available yet.

## 22. Self-Gift protection
UID equality is rejected before the transaction, and role rules independently prevent a valid account from serving as both Consumer sender and approved Host recipient.

## 23. Message Gift event behavior
A successful send atomically creates a backend-authored `type: gift` event linked to the Gift transaction and updates the conversation summary. The event is persistent and idempotent.

## 24. Gift does not grant messaging access
The Gift transaction never creates or extends `messageAccess`, chat windows, unlocks, or free-message balances. Gift sending does not require an active chat pass.

## 25. Gift event is not a genuine Host reply
The event sender is the Consumer and its type is `gift`. Checkpoint 10 reply qualification requires trusted Host text, so this event cannot suppress a no-reply refund.

## 26. Host Activity Gifts behavior
The Gifts tab reads only the Host-owned earning subcollection, validates succeeded/pending internal records, resolves safe public sender identity, respects both block directions, and displays `Gift · pending credit equivalent`. It omits wallet totals and charged-price fields from the event projection.

## 27. Public Host Gifts aggregate behavior
Server-maintained per-type aggregates are client-write-denied. The authenticated callable returns at most ten real types ordered by highest configured Gift value, with name/asset/count only. Raw transactions and sender spend are not exposed. The profile hides the section when empty.

## 28. Gift Tray and client integration
One reusable tray loads only the trusted callable projection, supports one-tap sending with disabled pending taps, shows no confirmation/Undo, and acknowledges only backend success. Host Profile and Messages integrate it. Missing config truthfully says “Gifts are currently unavailable.”

## 29. Video Call regression
The call UI and backend were not modified. Emulator call recovery/security and transaction-race suites passed. Gift records do not touch calls, timers, free time, increments, locks, reconnect state, settlement, or availability.

## 30. Level regression
Gift debit never changes lifetime qualifying purchased Credits or qualifying-purchase records. Unit and emulator checks passed, as did the complete Level/rewards regression suite.

## 31. Purchase reversal compatibility
The wallet invariant remains exact. A reversal after a Gift can proceed only when enough purchased provenance remains; otherwise existing reversal logic fails safely rather than producing a negative bucket. Full allocation-aware chargeback/reversal linking is future trusted work.

## 32. Notification behavior
No safe authoritative push delivery infrastructure was found, so notification delivery is deferred. Gift success never depends on notification delivery. The authoritative record contains sufficient identities and snapshot data for a future idempotent notification worker.

## 33. Firestore security changes
Clients cannot read/write Gift config, raw Gift transactions, or Host aggregate documents. Clients cannot write Gift ledger or Host earnings. Approved Hosts may read only their own nested Gift earning records under existing protected Host earnings ownership. Prior wallet, messaging, privacy, identity, role, rewards, and call rules remain intact.

## 34. Exact unit tests added or updated
Added Gift domain tests for strict config, unavailable config, exact allocation, and source allowlist; expanded Credit tests across purchased-only, bonus-only, legacy-only, every mixed case, unresolved spending, generic refund, Gift debit, reversal failure, and high-total/low-provenance failure; added three Gift Tray UX tests; updated four UI suites for the tray and updated Host Activity UI/emulator coverage.

## 35. Exact emulator checks and results
New Gift suite: 45 checks passed. It covers same-request concurrency/idempotency, two distinct sends, debit/ledger/earning/aggregate cardinality, exact split/version snapshots, bonus/legacy/mixed/unresolved denial with unchanged wallets, self/role/recipient/block/config denial, safe aggregate, message isolation, Level/call isolation, and direct-rule denials. Host Activity: 86 checks passed including a real Gift row. All test data used isolated `demo-*` namespaces and explicitly test-only catalogue/economics.

## 36. Full root Jest total
`npm test -- --runInBand`: **61 suites, 584 tests passed**, zero snapshots.

## 37. Standalone Functions Jest total
`functions/npm test -- --runInBand`: **13 suites, 317 tests passed**, zero snapshots. These backend suites overlap root totals.

## 38. All emulator regression results
All 15 scripts passed: Gifts 45, Credits 20, paid messaging 32, Host Activity 86, Creator roles 40, call rules 24, call transaction race 9, identity 58, Level/rewards 53, discovery 47, Host Connect 68, privacy 72, social messaging 69, rewards rules 32, and follow rules (all named assertions passed). Counted suites total **655 checks plus the follow-rules named assertion set**. Expected permission-denied logs are negative assertions. Ports 8289 and 8189 were stopped.

## 39. Babel/static parse result
`@babel/parser` parsed **243 JS/JSX/CJS files** across `src`, `functions/src`, `shared`, plus `App.js` with no syntax errors.

## 40. git diff --check result
Passed. Line-ending warnings are Git's existing Windows LF/CRLF notice, not whitespace errors.

## 41. Physical validation still required
No physical device validation occurred. Host Profile/Message tray layout, accessibility, latency, offline retry behavior, and eventual production visual assets should be checked on supported devices before release.

## 42. Production configuration and economic decisions still required
Product approval is required for Gift names, artwork/reference scheme, prices, ordering, catalogue version, Host basis points, economics version, and operational configuration ownership/change process.

## 43. Deployment requirements
A future reviewed release must deploy Functions and Firestore rules together, then create the approved protected config through trusted administration. It should verify indexes/runtime permissions and perform non-production acceptance testing before any production enablement.

## 44. No production Gift catalogue invented
Confirmed. Only isolated emulator fixtures use a test Gift.

## 45. No production Gift prices invented
Confirmed. The test price is confined to an emulator test and is not application configuration.

## 46. No permanent Host/platform split invented
Confirmed. Runtime requires protected config; the test basis points exist only in the emulator fixture.

## 47. No deploy, stage, commit, push, or production mutation
Confirmed. No Firebase deployment, Git staging, commit, push, production read/write, billing enablement, Storage enablement, or Paystack call occurred.

## 48. Live Recharge remains disabled
Confirmed. The UI can navigate to the existing Recharge destination but explicitly says Recharge is not available yet. This checkpoint did not activate packages or Paystack.

## 49. VIP, Quick Match, Stories, and Moments remain appropriately deferred
Confirmed. No VIP purchase/discount, Quick Match charge, Story publishing/storage, or Moment upload was added. Moment fake socket gifting was removed; authoritative Gift financial support accepts controlled future source labels without fabricating those surfaces.

## 50. Core call economics and recovery were not redesigned
Confirmed. No call source file was changed. Call earnings, free/paid increments, recovery, reconnect, Busy/Online, locks, and settlement behavior remain as implemented at the baseline, with all call regressions passing.

## 51. Focused financial operation-order proof

A post-implementation financial audit found no accounting flaw and required no wallet-model code change.

Let a wallet be `(P,B,L,U,T)`, where purchased, bonus, legacy, unresolved generic spending, and total satisfy `T=P+B+L-U`. If unresolved spend `U` can be assigned among the three source buckets in any valid way, at most `min(P,U)` can have consumed purchased Credits. The guaranteed purchased remainder is therefore `P-min(P,U)=max(0,P-U)`. This is the exact worst-case lower bound expressible by the current aggregate model.

A Gift of `G` is allowed only when `G <= P-U`. It changes `(P,T)` to `(P-G,T-G)` and leaves `U` unchanged. The new bound is `(P-G)-U=(P-U)-G`: the bound falls by exactly the Gift price, so unresolved spending is not reserved twice after purchased Credits have already been reduced.

An exact generic refund `R` changes `(U,T)` to `(U-R,T+R)` without changing `P`. Its new lower bound is `max(0,P-(U-R))`. This only releases part of the earlier unresolved reservation; it does not create a purchase or fabricate purchased provenance. A reversal moves current `P` to `L`, leaving `T` and `U` unchanged, so it can only decrease Gift eligibility. If Gifts already reduced `P` below the requested reversal, reversal fails safely.

| Sequence | Final `(P,B,L,U,T; eligible)` | Proof result |
|---|---|---|
| purchase 100; Gift 30 | `(70,0,0,0,70;70)` | Gift removes 30 once |
| purchase 100; generic 40; Gift 50 | `(50,0,0,40,10;10)` | unresolved 40 remains reserved once |
| purchase 100; Gift 30; generic 20; Gift 40 | `(30,0,0,20,10;10)` | interleaving preserves exact lower-bound arithmetic |
| purchased 100 + bonus 50; Gift 30; generic 40; Gift 20 | `(50,50,0,40,60;10)` | bonus raises total, never Gift capacity |
| purchased 100 + legacy 50; generic 60; Gift 30 | `(70,0,50,60,60;10)` | legacy raises total, never Gift capacity |
| purchase 100; generic 40; refund 15; Gift 70 | `(30,0,0,25,5;5)` | refund releases only 15 of uncertainty |
| purchase 100; Gift 20; generic 50; refund 20; Gift 40 | `(40,0,0,30,10;10)` | refund never adds to `P` |
| start `(120,30,20,0,170)`; Gifts 20/50/20; generic spends 40/20; refunds 30/10 | `(30,30,20,20,60;10)` | multiple operations preserve invariant and lower bound |
| purchase 100; Gift 60; reverse 50 | denied at `P=40`; reversing 40 gives `(0,0,40,0,40;0)` | no negative provenance |
| purchase 100; generic 20; reverse 30; Gift 50; reverse 20 | `(0,0,50,20,30;0)` | reversal never restores eligibility |

Twelve new tests cover the ten requested sequences plus two exhaustive proofs. For all enumerated `P=0..12`, `B=0..8`, `L=0..8`, and every valid `U`, the test enumerates every allocation of `U` among buckets and proves the minimum possible unspent purchased amount equals `max(0,P-U)`. A second enumeration covers `P=1..25`, every `U<P`, and every allowed Gift amount, proving each successful Gift changes eligibility from `E` to exactly `E-G`.

Latest validation after this audit: root Jest **61 suites / 584 tests**, standalone Functions Jest **13 suites / 317 tests**, focused Credit domain **34 tests**. Affected emulator reruns passed: Gifts **45 checks**, Credits/reversal **20**, paid messaging/refund **32**, and Level/rewards **53**. The earlier complete 15-script emulator regression remains passing. Emulator port 8289 was stopped. No production access occurred.
