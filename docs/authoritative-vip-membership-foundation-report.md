# Authoritative VIP Membership Foundation Report

## 1. Baseline branch/commit

Work started and remains on `amira-v2` at required baseline `c869512` (`feat: add authoritative gifts and host earnings`). The initial working tree was clean.

## 2. Exact modified/new/deleted files

Modified: `firestore.rules`, `functions/src/__tests__/socialMessaging.test.js`, `functions/src/hostActivity.js`, `functions/src/index.js`, `functions/src/messageEntitlements.js`, `functions/src/profileViews.js`, `functions/src/publicIdentity.js`, `src/components/IncomingCallCard.js`, `src/models/userModel.js`, `src/screens/host/__tests__/hostActivityUi.test.js`, `src/screens/main/UserProfileScreen.js`, `src/screens/main/VIPStoreScreen.js`, `src/screens/main/VipInfoScreen.js`, `src/screens/main/WhoViewedMeScreen.js`, `src/services/__tests__/userPrivacy.emulator.cjs`, `src/services/__tests__/vipService.test.js`, `src/services/firebaseService.js`, `src/services/profileViewService.js`, and `src/services/vipService.js`.

New: `functions/src/vipDomain.js`, `functions/src/vipService.js`, `functions/src/__tests__/vipDomain.test.js`, `src/services/__tests__/vipFoundation.emulator.cjs`, this report, and `docs/authoritative-vip-membership-foundation-git-status.txt`. No files were deleted.

## 3. Pre-implementation VIP audit

The audit covered VIP/premium/subscription terminology, profile viewers, photo gates, messaging and call pricing, client flags, test shortcuts, checkout behavior, and earning placeholders. Existing authoritative Credits, Level, messaging, call, Creator, privacy, Gift, and Host Earnings paths were traced before changes.

## 4. Fake/unsafe/obsolete VIP behavior found

The client modeled `VIP_1`, `VIP_2`, and `VIP_3`; the store displayed a fake `$9.99/mo` subscription and invented benefits; the information screen described tiered VIP; and messaging policy could be configured to grant VIP unlimited messaging. Client user VIP fields were also treated as entitlement-like UI data. These paths were removed or replaced with authoritative FREE/VIP projections. Legacy `tier: FREE` remains accepted only for old signup fixtures; it grants no entitlement.

## 5. Final VIP authority architecture

`functions/src/vipDomain.js` contains pure plan, entitlement, provider-proof, duration, and pricing-policy rules. `functions/src/vipService.js` owns transactional plans, attempts, verification, current entitlement/history, content access, and photo authorization. Callable functions expose safe server results. Firestore rules deny client mutation of all authority records.

## 6. FREE/VIP state model

There are exactly two projected states: `FREE` and `VIP`. VIP requires a valid active entitlement, authoritative time before expiry, Consumer capability, and a non-demo account. Plan duration is never interpreted as a tier.

## 7. Plan duration architecture

Stable plan IDs are `vip_3_day`, `vip_7_day`, and `vip_30_day`, mapped strictly to 3, 7, and 30 exact days. Server validation rejects unknown IDs, mismatched duration, invalid money fields, or incomplete policy references.

## 8. Production plan price status

No production plan document or price was created. Missing or invalid protected config returns purchasing unavailable, and the UI displays that state without a price.

## 9. No-auto-renew enforcement

Each successful verification creates one fixed `[startsAt, expiresAt)` interval. No stored-card, subscription, recurring charge, renewal scheduler, or auto-renew language was added.

## 10. Active-VIP repurchase prevention

Initialization and transactional verification both reject an active entitlement. The transaction prevents concurrent attempts from stacking or extending membership. A new attempt is allowed at exact expiry according to server time.

## 11. Server-time expiry semantics

Authorization uses injected backend time and the half-open rule `now < expiresAt`. At `now >= expiresAt`, state is FREE without deleting history or changing unrelated product data.

## 12. Current entitlement model

`vipMemberships/{consumerUid}` is the protected current projection with Consumer UID, status, plan, start/end, purchase reference, and policy references. The `users.vip` field is only a compatibility display projection and is not an authorization source.

## 13. Immutable purchase/history model

`vipMemberships/{uid}/purchases/{reference}` preserves the exact plan snapshot, duration, amount/currency, provider linkage, interval, policy versions, attribution, purchase classification, and reversal-ready status. Clients cannot write it.

## 14. Payment-attempt architecture

Initialization creates a server-generated protected `vipPaymentAttempts` record from server-known config and authenticated ownership. The client cannot choose price, currency, success state, or entitlement. Checkout remains unavailable until a real provider adapter is configured.

## 15. Provider-reference/idempotency architecture

Verification validates exact amount, currency, reference, ownership, and provider success, then uses a Firestore transaction. A provider reference can produce at most one successful purchase and entitlement; repeat or concurrent verification cannot duplicate effects.

## 16. Cross-product Recharge/VIP provider-reference protection

VIP claims the shared `paymentReferences/{providerTransaction}` authority. Any existing reference, including one written by Recharge, prevents VIP funding; a VIP reference likewise cannot be reused as a Recharge reference.

## 17. Reversal/chargeback status

Historical records include status and source linkage needed for reversal. Trusted execution is deferred until authenticated provider webhook/reversal infrastructure exists. No Consumer refund endpoint exists, and Credits or Level are never involved.

## 18. Consumer/Host role handling

Normal Consumers and pending Creator applicants may initialize purchases. Approved Hosts and demo/test accounts cannot buy or consume Consumer VIP capabilities.

## 19. Approved-Host transition while VIP active

If a Consumer becomes an approved Host, role-aware authorization immediately makes the entitlement unusable. The purchase/current record remains historically truthful, and no refund or money is fabricated.

## 20. Who Viewed Me FREE behavior

FREE Consumers receive only the aggregate count/locked representation. The callable returns `views: []` and no Host UID, name, photo, Amira ID, or reconstructable identity metadata.

## 21. Who Viewed Me VIP behavior

An active Consumer VIP receives safe public identity projections for eligible approved Hosts who opened the full profile. Expiry immediately removes identity access while retaining the underlying view history.

## 22. Identity/privacy boundary

Block relationships are filtered server-side. The audit also corrected direction-specific eligibility: Consumer profile views require Host viewers, while Host activity requires Consumer viewers. Only approved safe public identity fields leave the server.

## 23. VIP Host Content authorization foundation

Protected `vipContent` metadata can be checked by the callable. Public content follows normal visibility; VIP-only content requires active Consumer VIP and no block. FREE responses can expose safe locked/teaser metadata but never a protected media URL. No content was fabricated.

## 24. Consumer photo-sharing authorization foundation

The authorization callable requires active VIP for a Consumer sending a new photo to an approved Host. A Host sending to a Consumer does not require recipient VIP. Blocks and role validity remain authoritative.

## 25. Historical photo behavior after expiry

Only new-send capability is gated. Existing message/photo reads were not changed, so legitimate historical photos remain readable after expiry.

## 26. Paid messaging discount hook

A pure protected policy hook can compute a future VIP price from server-owned policy and snapshot the actual charge/policy version. Missing or invalid policy preserves the base amount. No production percentage or price was introduced.

## 27. Confirmation messaging priority unchanged

Priority remains Friends, active Host-specific 24-hour access, Free Message, paid access, then insufficient/Recharge. VIP cannot provide unlimited messaging or skip any earlier step; obsolete `unlimitedVipTiers` handling was removed.

## 28. Existing paid pass behavior after VIP expiry

An already-purchased pass retains its recorded expiry and access independently of later VIP state. Future purchases evaluate current authoritative entitlement and policy.

## 29. No-reply refund interaction

The existing refund path remains unchanged and returns the amount actually charged for that access. It does not recompute price from current VIP status or create purchased provenance.

## 30. Video-call discount hook

A pure protected hook can calculate a future Consumer effective paid rate only for paid usage, with a policy/version snapshot. Missing policy leaves current rates unchanged. Free portions, sponsored time, Free Video Time, and Quick Match intro were not altered.

## 31. Host earning-basis protection

The call hook keeps the Host earning basis at the approved base rate and records any future Consumer discount as platform absorption. A Consumer discount cannot reduce Host earnings.

## 32. Active-call expiry behavior

Current call behavior is unchanged because no discount is active. The future hook is designed for connection-time snapshotting: terms for a connected call remain fixed, while later calls re-evaluate current server entitlement. No reconnect/recovery path changed.

## 33. VIP conversion attribution architecture

Optional Story/Moment attribution is accepted only after server validation against protected `vipContent`, including the approved Host owner. History records the source, content, Host, and `first_purchase` or `later_purchase` classification.

## 34. Host conversion earning status

No conversion or renewal earning is created. The attribution record is compatible with future unified Host Earnings work but does not claim cash or an amount.

## 35. VIP rewards status

No VIP reward values or entitlements were added. Existing Consumer Rewards and Level qualification are unchanged; protected plan records can carry a future reward policy reference only.

## 36. Consumer Profile UI

FREE Consumers see an accurate benefits/upgrade surface and truthful unavailable message while config/provider is absent. Active VIP shows one VIP state, plan duration, and expiry, with no Renew/Extend control or recurring language. Approved Hosts do not receive Consumer purchase controls; pending applicants remain Consumers.

## 37. Host visibility of Consumer VIP

The full Consumer profile and incoming-call identity may include only an authoritative `vipActive` boolean for an approved Host. Payment, price, reference, expiry history, and internal policy data are not exposed.

## 38. Confirmation no small-card/header VIP badge

No VIP field or badge was added to Host Connect small cards or conversation headers. Badge rendering is limited to the full Consumer profile and incoming-call card.

## 39. Level regression

VIP verification and expiry do not read or mutate lifetime qualifying purchased Credits or Level. Emulator assertions confirmed the Level fields remain byte-for-byte unchanged.

## 40. Credits regression

VIP purchase and expiry do not modify `purchasedCredits`, `bonusCredits`, `legacyCredits`, `unallocatedSpentCredits`, or `totalBalance`. Recharge remains a separate product.

## 41. Gifts regression

Gift catalog, purchased-only eligibility, debit, Host earning, and history paths were untouched. Regression tests confirm VIP state creates no Gift discount, exclusive Gift, or accounting change.

## 42. Discovery/Quick Match regression

No VIP input was added to discovery, ranking, filters, Host pools, Match, Quick Match selection, intro duration, or entitlement consumption.

## 43. Social graph regression

Follow, mutual-Friend creation, likes, blocks, and relationship persistence are unchanged. Expiry performs no social graph writes.

## 44. Translation regression

Translation defaults and provider behavior are unchanged and have no VIP gate.

## 45. Firestore security changes

Rules deny all client writes to `vipConfig`, `vipPaymentAttempts`, `vipContent`, current memberships, and nested purchase history. Owners may read safe membership records; authority writes remain backend-only. Existing user VIP fields remain protected by `vipUnchanged()`. Signup accepts only FREE state (plus legacy FREE fixture shape).

## 46. Exact unit tests

The new VIP domain suite has 12 tests covering exact durations, invalid-config fail-closed behavior, server-time/role activation, fixed windows, provider proof, messaging pricing, call pricing/Host basis, and missing-policy behavior. Existing VIP helper, social messaging, Host Activity UI, and privacy assertions were updated for the authoritative model.

## 47. Exact emulator tests/results

The new VIP emulator/security suite passed 46 checks covering configuration, concurrent/idempotent verification, exact expiry, active repurchase, role changes, cross-product reuse, view privacy, blocks, content/photo capability, unchanged wallets/Level/Gifts/social data, attribution validation, and direct-write denial.

## 48. Full root Jest total

Passed: 62 suites, 596 tests, 0 snapshot failures.

## 49. Standalone Functions Jest total

Passed: 14 suites, 329 tests, 0 snapshot failures.

## 50. All emulator regression results

All 16 scripts passed. Numeric suites reported 702 checks total: VIP 46, Gifts 45, Credits 20, paid messaging 32, Host Activity 86, Creator role 40, call rules 24, call transaction race 9, Amira ID 58, Level/rewards 53, discovery 47, Host Connect 68, privacy 73, social messaging 69, and rewards rules 32. The follow-rules named assertion suite also passed but does not print a numeric total.

## 51. Babel/static parse result

Passed across 247 JavaScript, JSX, and CJS files.

## 52. Git diff --check

Passed. Git emitted only expected LF-to-CRLF working-copy notices on Windows; there are no whitespace errors.

## 53. Physical validation still required

No physical-device or manual UI validation was performed or claimed. Later testing should cover FREE/active screens, expiry, locked/unlocked viewers, allowed badge placements, and absence from small cards/headers.

## 54. Production pricing/policy decisions still required

Approved prices, currency deployment, messaging/call discount policies, and any reward or conversion earning policy remain required before enabling economic behavior.

## 55. Deployment/provider requirements

Enabling purchase requires protected production plan configuration, a trusted Paystack/provider adapter and webhook verification, secret management, deployment review, and trusted reversal handling.

## 56. Confirmation no production VIP prices invented

No production amount, currency price, promotion, or displayed fake price was added. Monetary values exist only in isolated automated fixtures.

## 57. Confirmation no production discount percentages invented

No production messaging or video-call discount percentage was added. Hooks fail closed to current pricing without trusted policy.

## 58. Confirmation no production conversion earning invented

No Host conversion/renewal earning amount, formula, ledger entry, or cash claim was added.

## 59. Confirmation no auto-renew/subscription billing added

No recurring billing, automatic renewal, card storage, Paystack subscription, or active extension was added.

## 60. Confirmation no deploy/stage/commit/push/production mutation

Nothing was deployed, staged, committed, pushed, or written to production Firebase. All work remains unstaged in the local working tree.

## 61. Confirmation live Paystack remains disabled

The live verification callable has no live adapter and returns a not-configured failure. Tests use injected providers only; no live network payment was attempted.

## 62. Confirmation Storage/media upload remains disabled

No Firebase Storage enablement, upload, fabricated media, or protected URL delivery was added. Only authorization capabilities were established.

## 63. Confirmation core call economics/recovery were not redesigned

Checkpoint 1 accounting, session settlement, recovery, reconnect, and existing rate behavior remain intact. The new call calculation is an isolated future-policy hook.

## 64. Confirmation Checkpoint 10 messaging refund semantics preserved

The 10-minute no-reply rule and exact-amount refund behavior remain unchanged. VIP cannot become unlimited messaging, and already-purchased access survives VIP expiry.

## 65. Confirmation Checkpoint 11 Gift economics preserved

Purchased-only Gift eligibility, authoritative debit, Host earning basis, catalog, history, and reversal behavior remain unchanged and passed their emulator regression suite.
