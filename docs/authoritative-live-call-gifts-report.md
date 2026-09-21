# Authoritative Live Video Call Gifts Report

## 1. Baseline
Work began on clean `amira-v2` at exact HEAD `aba3b33d649d83626a3b283644a68e8336c2b019` (`feat: secure incoming call identity presentation`).

## 2. Files changed/new/deleted
Changed the existing Gift backend/client service, reusable tray, Video Call screen, Gift/UI/call tests, and Gift emulator. Added this report and Git-status artifact; no product file was deleted.

## 3. Audit findings
The Gift economy was already authoritative and reusable. `video_call` was allowlisted but lacked call-ID/state validation, and the connected call UI exposed no Gift control or acknowledgement.

## 4. Existing Gift architecture
One callable transaction validates roles, blocks, config, wallet, and idempotency, then atomically creates all Gift accounting, aggregate, earning, and message artifacts.

## 5. Existing Gift config/catalogue
`giftConfig/current` owns enabled items, names, prices, assets, order, catalogue version, and economics version. The callable returns only normalized enabled items and fails closed when invalid.

## 6. Existing Gift economics
The same protected config owns `hostShareBasisPoints`; `giftDomain.allocation` performs integral Host/platform allocation whose parts equal price.

## 7. Purchased-only eligibility
The implementation retains `max(0, purchasedCredits - unallocatedSpentCredits)` and `debitPurchasedGift`; bonus, legacy, and rewards cannot fund Gifts.

## 8. Gift idempotency
The transaction ID remains a hash of Consumer UID and request ID. Retry now also requires the same Host, Gift, source, and call context before returning the prior result.

## 9. Gift transaction artifacts
One successful transaction writes one protected Gift transaction and one purchased-bucket wallet ledger entry with captured config/economics versions.

## 10. Host earnings
The existing Host Gift earning record and pending internal Credits-equivalent totals are reused; payout eligibility remains false.

## 11. Platform accounting
The existing platform Credits-equivalent aggregate receives only the server-calculated remainder. No cash payout value was introduced.

## 12. Public Gift aggregate
Live Gifts update the same bounded `hostGiftAggregates/{host}/types/{gift}` count used by Profile and Messages Gifts.

## 13. Persistent Gift message event
Every live Gift creates the same single persistent conversation Gift message and last-message summary; no animation-only duplicate exists.

## 14. Host Activity
Host Activity continues reading authoritative Gift transaction/earning data; live-call Gifts naturally appear through that existing projection.

## 15. Existing GiftTray reuse
The same `GiftTray` is used by Profile, Messages, and now Video Calls. Only optional `callId` forwarding and nonblocking in-call success handling were added.

## 16. Existing Video Call architecture
`VideoCallScreen` retains its call subscription, mounted RTC views, authoritative connection heartbeats, billing projection, safety actions, and End behavior.

## 17. Previous in-call Gift state
Before this checkpoint the connected call controls had Mute, Camera, safety, and End; there was no live Gift control or transaction context.

## 18. Consumer live Gift eligibility
Only the authenticated Consumer caller sees Gift while local authoritative phase is `connected`; backend authority independently rechecks all conditions.

## 19. Host live Gift behavior
The Host never sees a send-Gift-to-Consumer control. Host receipt remains economic/activity/message authority, not a mirrored send surface.

## 20. Active-call requirement
Backend requires an existing live call with exact status `connected`. Ringing, connecting, reconnecting, terminal, missing, and unrelated calls fail closed.

## 21. Normal-call Gift flow
Consumer opens the shared tray, selects one configured Gift, sends with `source=video_call` plus call ID, and sees acknowledgement only after callable success.

## 22. Quick Match Gift flow
Once connected, Quick Match uses the same participant direction and call engine, so the same validated live Gift works without changing reservations, intro, or ranking.

## 23. Sponsored-call Gift flow
Once connected, sponsored calls use the same Gift path. Sponsored call earnings remain zero for sponsored time while the independent Gift can earn normally.

## 24. Gift source/context
The existing `video_call` source is retained and now requires a `callId`; non-call sources reject an extraneous call ID.

## 25. Call-context validation
Inside the Gift transaction, the server reads `calls/{callId}` and validates connected status, exact caller/receiver direction, and exact two-person participant membership.

## 26. Recipient validation
The requested Host must equal the call receiver and still be a real approved Host; redirection to another Host is rejected.

## 27. Catalogue authority
The client renders the callable catalogue. Empty, missing, disabled, malformed, or version-inconsistent config presents truthful unavailability.

## 28. Price authority
Only the server config price is debited and recorded. Client input contains a Gift ID, never a price or split.

## 29. One-tap behavior
Selecting an enabled item immediately invokes the callable. No confirmation, PIN, hold, or price-dependent second step was added.

## 30. Request-ID behavior
The tray creates one request ID for an intent, retains it across a failed transport attempt, clears it after success, and creates a new ID for a later intentional send.

## 31. Retry behavior
Same-context retries return the one prior transaction without another debit, earning, message, or aggregate increment; mismatched reuse returns conflict.

## 32. Rapid-tap behavior
The tray disables selections while a send is in flight, preventing a render/double-tap duplicate while allowing later intentional Gifts.

## 33. Success acknowledgement
After confirmed server success, the sender sees Gift asset/name in a lightweight overlay for 2.5 seconds. Call controls and RTC remain active.

## 34. Host-side acknowledgement
A separate Host realtime animation was deferred: there is no existing call-safe realtime Gift listener. The Host still receives authoritative message, Activity, aggregate, and earning artifacts.

## 35. Call continuity
Opening, closing, succeeding, or failing the modal does not invoke call end, change phase, or recreate the call.

## 36. RTC mount/unmount behavior
The tray is rendered as a modal child of the mounted call screen; RTC views and call subscription remain mounted. UI tests confirm no additional join or leave.

## 37. Call billing while tray open
No billing timer, heartbeat, connection report, or synchronization effect depends on `giftOpen`; billing therefore continues independently.

## 38. Paid increment independence
Gift writes do not mutate `settledIncrements`, `paidStartedAtMs`, rate snapshots, or connection segments. Race tests preserve both ledgers.

## 39. FVT independence
Gift code does not read or write Free Video Time, preview allowance, reward seconds, or consumption counters.

## 40. Quick Match intro independence
Gift code does not read or write Quick Match reservation, entitlement, intro seconds, active request, or ranking state.

## 41. Sponsored-time independence
Gift code does not read or write sponsored seconds, invite status, suppression, or sponsored connected counters.

## 42. Gift failure behavior
Failure produces only a Gift-specific alert; it never calls End, leaves RTC, or changes call/billing state.

## 43. Purchased Credits interaction
Gift directly reduces purchased Credits while generic call spending increases unallocated spent Credits, preserving the established provenance model.

## 44. Call-spending/Gift-spending interaction
Both transactions serialize on the same wallet document. Whichever commits first is reread by the retrying transaction, preventing double spend and negative capacity.

## 45. Credits invariant
The tested race ends at `P=50, B=40, L=0, U=8, total=82`; `50+40+0-8=82` after a 10-Credit Gift and two 4-Credit call increments.

## 46. Level independence
Gift spending and call spending do not write Consumer Level or lifetime qualifying purchased Credits.

## 47. VIP independence
VIP is absent from Gift catalogue, price, allocation, authorization, and call-context validation. No exclusive Gift or discount exists.

## 48. Block race
Both block documents are read in the same Gift transaction. Either direction present before commit rejects all financial/artifact writes.

## 49. Host status race
Current Host approval/demo status is transactionally reread; approval loss rejects the Gift before debit.

## 50. Consumer role race
Current caller profile must remain a non-demo Consumer; approved Hosts cannot use the send path.

## 51. Call-end race
Call state is read transactionally with the wallet. Terminalization competing with Gift causes Firestore retry and then rejection unless Gift committed while call was genuinely connected.

## 52. Reconnect behavior
`reconnecting` is deliberately ineligible and the UI closes the tray when phase leaves connected; no success is fabricated.

## 53. Offline/network behavior
Transport/server failure keeps the call alive, preserves the request ID for retry, and presents Gifts unavailable without claiming success.

## 54. Empty catalogue behavior
The tray displays “Gifts are currently unavailable.” and exposes no send action.

## 55. Insufficient purchased eligibility
The server returns structured `insufficient_purchased_credits`; no partial artifact is written and bonus/legacy balances remain unusable.

## 56. Recharge behavior during call
The established Recharge CTA remains. Choosing it closes the tray and opens Recharge Hub; it does not itself end the call.

## 57. Gift Tray UI
The existing grid, configured asset/name, visible Credit price, close action, loading indicator, unavailable state, and in-flight indicator remain shared.

## 58. No VIP-exclusive Gifts
No VIP field or filter was added to catalogue configuration or tray rendering.

## 59. Gift identity validation
The transaction snapshots the configured Gift ID/name/asset/order; arbitrary client names/assets cannot enter authoritative records.

## 60. Self-Gift protection
Sender and recipient equality is rejected before the transaction.

## 61. Consumer recipient protection
Recipient must satisfy current approved-Host authority; Consumer targets fail.

## 62. Demo/invalid Host protection
Missing, demo, or unapproved Host recipients are rejected and receive no earning or aggregate.

## 63. Messaging independence
Gift creates its established persistent event but does not create `messageAccess`, consume a Chat Pass, or qualify as a Host text reply.

## 64. Friendship independence
No Follow, Like, friendship, priority, or block-cleanup document is written by Gift.

## 65. Profile-view independence
Opening/sending an in-call Gift never invokes profile-view tracking.

## 66. Consumer Rewards independence
No promotional Gift balance/task was created and no rewards document is read or written by Gift.

## 67. Incoming-call identity regression
Checkpoint 19 identity/privacy and acceptance tests pass; Level/VIP enrichment remains normal incoming-call-only and independent from connected Gifts.

## 68. Call-control result
Connected Consumer controls now include Mute, Camera, Chat, Gift, safety report menu, and End; Host omits Gift. Safety remains under its existing separate control.

## 69. Chat interaction
Chat uses the established `ChatDetail` route for the remote participant. It does not grant access or treat a Gift as a reply.

## 70. Animation authority
The 2.5-second overlay is created exclusively by `onGiftSent` after a resolved authoritative callable; failures cannot trigger it.

## 71. Accessibility
Gift, Chat, close, safety, and End actions have explicit labels; the acknowledgement uses a polite live region.

## 72. Performance/query behavior
Each send adds one point call-document read inside the existing bounded transaction. No collection scan or new listener/query was introduced.

## 73. Privacy
No wallet, private profile, spending, VIP payment, payout, or Level-total data is exposed to the other participant.

## 74. Call-record privacy
Client receives its existing participant call; server validates context through Admin transaction access. Firestore call-read rules remain participant-bound.

## 75. Firestore rules
Rules were unchanged: clients still cannot create authoritative Gift, earning, platform, aggregate, or wallet-ledger records.

## 76. Indexes
No new query shape exists, so `firestore.indexes.json` was unchanged.

## 77. Normal-call tests
Tests cover Consumer Gift visibility, Host absence, shared tray context, mounted RTC continuity, timed success, Chat, and call-state gating.

## 78. Purchased-Credit tests
Gift domain/emulator and Credit tests cover purchased sufficiency, bonus-only, legacy-only, unresolved spend, mixed buckets, invariant, and no partial artifacts.

## 79. Concurrent call/Gift tests
A real shared transactional double test races a live Gift with a due paid increment and proves both unique artifacts, correct wallet state, and independent earnings.

## 80. Quick Match tests
Gift emulator validates connected Quick Match context; complete Quick Match lifecycle suites pass with reservation/ranking behavior unchanged.

## 81. Sponsored tests
Gift emulator validates connected sponsored context; sponsored lifecycle suites pass and call versus Gift earnings remain distinct.

## 82. Block/role/call-state tests
Tests reject both blocks, Host approval loss, Host sender, Consumer target, self target, ringing/reconnecting/ended/missing/unrelated calls, and mismatched context.

## 83. Idempotency tests
Concurrent same-ID sends create one transaction; retry returns idempotent; context mismatch conflicts; distinct request IDs create distinct Gifts.

## 84. Checkpoint 19 regression
Incoming identity projection, UI, block/role/lock Accept races, privacy emulator, and source distinctions all pass.

## 85. Checkpoint 18 regression
Follow/friendship/social suites pass; Gift creates no relationship and respects blocks.

## 86. Checkpoint 17 regression
Consumer reward task/rules/UI suites pass with no promotional Gift or reward cross-contamination.

## 87. Checkpoint 16 regression
Who Viewed Me and profile-view tests pass; Gift creates no view.

## 88. Checkpoint 15 regression
Sponsored invite lifecycle/emulator pass, including 30 seconds and suppression behavior.

## 89. Checkpoint 14 regression
Connection evidence, FVT, automatic continuation, reconnect, 10-second settlement, pricing snapshot, and Host call earning tests pass.

## 90. Checkpoint 13 regression
Quick Match offer, reservation, acceptance, intro, recovery, and lifecycle tests pass.

## 91. Checkpoint 12 regression
VIP state, expiry, content, call discount hook, and privacy tests pass; Gift remains VIP-neutral.

## 92. Checkpoint 11 regression
Authoritative Gift emulator passes with Profile/Messages behavior, config, provenance, artifacts, idempotency, block/role, Activity, and aggregate intact.

## 93. Checkpoint 10 regression
Paid messaging access/refund and social messaging suites pass; Gift grants no messaging entitlement.

## 94. Checkpoint 9 regression
Credit domain, reversal, operation ordering, wallet emulator, and call/Gift race all preserve provenance and total balance.

## 95. Checkpoint 8 regression
Privacy emulator passes with raw cross-user user reads denied and protected records inaccessible.

## 96. Checkpoint 7/3 regression
Amira ID and Consumer Level suites pass; neither identity allocation nor Level economics changed.

## 97. Security tests
Client price/name/split/earning forgery is structurally absent; direct protected writes, non-purchased funding, fake context, invalid recipient, block bypass, and inactive call are rejected.

## 98. Concurrency/race tests
Covered Gift versus paid increment, two intentional Gifts, same-request retry, block/approval checks, terminal/reconnect rejection, and wallet serialization.

## 99. UI tests
The UI verifies authoritative catalogue, prices, one tap, in-flight protection, insufficient/unavailable states, server-confirmed success, 2.5-second acknowledgement, role/state controls, and retained RTC.

## 100. Failure states
Empty/malformed config, insufficient purchased capacity, server failure, terminal/reconnect call, blocks, invalid Host, and mismatched retry all fail closed without ending the call.

## 101. Root test totals
Full root Jest passed 65 suites and 674 tests with zero failures.

## 102. Functions test totals
Standalone Functions Jest passed 17 suites and 401 tests. Focused call race passed 79 tests; focused Gift/UI passed 18 tests.

## 103. Emulator totals
All 19 emulator scripts passed: 16 on localhost 8289 and 3 on localhost 8189. A first run encountered an emulator transaction invalidation; the complete fresh rerun passed.

## 104. Babel/static parse
All 327 repository JS/JSX/CJS files outside dependencies and generated logs parsed successfully with Babel. The validator itself was the 328th parsed file and was deleted afterward.

## 105. JSON parse
All 274 project JSON files outside dependencies parsed successfully with `JSON.parse`.

## 106. Git diff check
Final `git diff --check` passed with no whitespace errors; Windows line-ending notices are informational.

## 107. Physical validation status
No device/manual validation was performed. Evidence is local automated Jest and isolated localhost Firestore emulator testing only.

## 108. Deployment requirements
Backend call-context validation requires a future authorized Functions deployment and UI changes require the normal client release. Firebase billing is unavailable and deployment was not attempted.

## 109. Remaining limitations/deferred work
Host-side live animation is deferred because no existing call-safe realtime Gift listener exists. Production catalogue/economics remain intentionally absent until approved, and physical two-phone validation remains pending deployment.

## 110. Confirmation no production Gift values invented
No catalogue item, asset, price, Host share, platform share, call rate, VIP discount, or payout value was added to production configuration.

## 111. Confirmation no production mutation
Only repository files and isolated emulator namespaces were written; production Firebase/data were not mutated.

## 112. Confirmation no deployment
No Firebase, Functions, rules, index, or application deployment was run.

## 113. Confirmation no staging
The Git index remains empty; no file was staged.

## 114. Confirmation no commit
No commit was created; HEAD remains the required baseline.

## 115. Confirmation no push
No remote Git write or push occurred.

## 116. Confirmation Storage unchanged
Firebase Storage configuration/data remain unchanged and no Storage operation ran.

## 117. Confirmation Paystack untouched
No Paystack API, webhook, verification, charge, refund, or configuration operation ran.
