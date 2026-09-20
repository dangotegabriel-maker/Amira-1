# Checkpoint 18 — Authoritative Social Relationship Integrity Report

## 1. Baseline
Work began on branch `amira-v2` at exact clean HEAD `042aa85ea1535fa254deff6522e6bcecc30cacea`, subject `feat: add authoritative consumer reward tasks`.

## 2. Files changed, new, and deleted
Modified: `functions/src/socialMessaging.js`, its unit test, `src/services/followService.js`, and the social-messaging and Host Connect emulator tests. New: this report and its Git-status record. No product file was deleted.

## 3. Audit findings
The existing graph was mostly authoritative. The flaw was a permanent friendship marker: after the first mutual Follow, an unfollow/refollow could never produce a later genuine friendship event. Live messaging remained safe because it already read both current Follow documents.

## 4. Existing Follow architecture
Both directions use `users/{sourceUid}/following/{targetUid}` with direction-specific, rules-validated schemas. Direct documents are canonical; no friend-request collection exists.

## 5. Consumer → Host source of truth
A Consumer record carries `consumerId`, `hostId`, and server `createdAt`. Rules require the authenticated owner, an approved Host target, valid direction, no self-follow, and no block.

## 6. Host → Consumer source of truth
An approved Host record carries `sourceId`, `targetId`, `sourceRole: host`, `targetRole: consumer`, and server `createdAt`. The target must remain a Consumer, including a pending Creator.

## 7. Previous Friendship behavior
`syncFriendship` derived mutuality correctly and created one trusted system message and materialized record. Record existence then suppressed all later events forever and did not record a transition back to false.

## 8. Final Friendship model
Live Friendship is the conjunction of two valid directional Follow records, eligible current roles, and no block. The materialized record now tracks `active`, activation identity, transition count, and timestamps.

## 9. Derived/materialized decision
Follow documents remain the only authorization truth. `friendships/{pairId}` is a server-only transition/event projection; stale projection data cannot grant messaging or any capability.

## 10. Eligible pair model
The only supported pair is Consumer—including pending Creator—↔ approved, real, non-demo Host. Consumer↔Consumer, Host↔Host, self, demo, blocked, and stale-role pairs fail closed.

## 11. Mutual Follow transition
The second valid directional Follow changes live state false→true. The transaction re-reads profiles, blocks, and both Follow records before recording the transition.

## 12. Order independence
The pair is sorted for deterministic IDs, while each Follow is validated against its actual source and target. Consumer-first and Host-first therefore converge on the same Friendship.

## 13. Idempotency
The activation identity is made from both server-created Follow timestamps. Retries for the same two incarnations see the same key and create no duplicate projection or message.

## 14. Concurrent Follow behavior
Firestore transaction contention serializes simultaneous sync calls. Unit and emulator races produced exactly one event for each activation.

## 15. Friendship system event
Each genuine activation creates trusted type `friendship_created` with text `You're now Friends 🤝`, null sender, server timestamp, and canonical participants.

## 16. Event identity and deduplication
Message IDs combine deterministic pair ID and monotonic `transitionCount`. Same-transition retries reuse projection state; a later Follow incarnation gets the next count and a distinct historical event.

## 17. Follow notification status
No production push provider exists. Existing Host Activity Followers and live Follow projections provide in-app visibility; no push success was fabricated.

## 18. Unfollow behavior
Deleting either canonical Follow immediately makes authorization non-Friends. Sync marks the projection inactive while preserving conversations, messages, calls, Gifts, windows, and reward history.

## 19. Unfollow silence
No unfollow notification or system message was added. The only event is a false→true friendship transition.

## 20. Refollow behavior
Refollow creates a new server-timestamped Follow incarnation. If the reverse Follow still exists, it creates one new friendship event without repeating the legacy friendship reward.

## 21. Block behavior
Block cleanup deletes both Follow directions and both Like directions. Sync treats either block as non-Friends and can mark an old projection inactive; messaging and other interaction services independently reject blocks.

## 22. Unblock behavior
Unblock removes only the block. Deleted Follows are not recreated, so neither Following nor Friendship returns without new user actions.

## 23. Like separation
Likes remain under the Host's `likes` collection. Like/unlike never writes Follow or friendship state and block cleanup removes Likes independently.

## 24. Messaging Friends priority
Consumer sends and access queries calculate Friends from both current Follow documents inside the transaction. `resolveMessagingEntitlement` evaluates Friends before active window, Chat Pass, paid access, or recharge.

## 25. Host → Consumer messaging behavior
Approved Hosts retain existing free send behavior. Host initiation creates neither Follow nor Consumer reply access; Consumer reply re-evaluates the normal priority.

## 26. History after Friendship ends
Unfollow and block do not delete conversation documents or historical messages. Only future sends are re-authorized.

## 27. Active 24-hour window interaction
Friendship does not create or extend a window. If Friendship ends, an already valid earned or paid window continues to its original expiry.

## 28. Chat Pass interaction
Friends sends consume zero Chat Passes. Existing passes remain untouched and become available if Friendship later ends.

## 29. Paid messaging interaction
Friends sends create no paid unlock and debit no Credits. A paid window bought earlier is not refunded merely because Friendship later forms.

## 30. Full Host Profile UI
The full profile subscription derives `Friends` from both live Follow snapshots and eligibility. The existing primary relationship action displays it truthfully.

## 31. Full Consumer Profile UI
The same full-profile screen serves the approved Host view of a Consumer, including current Follow/Friends label, safe identity, permitted VIP data, and Amira Level projection.

## 32. Conversation header behavior
No Friends badge was added to the conversation header. Backend access can be free through Friendship without adding that presentation.

## 33. Compact-card behavior
Consumer Home, Host Connect, Activity, match, and other compact cards remain free of Friends badges. Existing UI tests explicitly assert this on relevant surfaces.

## 34. Follower/following counts
Host follower count uses a validated Consumer→Host collection-group query; Host following count uses the Host-owned collection. Clients cannot write aggregate count fields.

## 35. Consumer Following
Consumer Following reads actual Consumer→Host records, validates approved non-demo Hosts, and filters blocks. Mutual Follow is unnecessary.

## 36. Host Following
Host Connect Following reads valid Host→Consumer records and current eligible Consumer profiles. One-way Follow is sufficient.

## 37. Host Activity Followers
Followers uses valid Consumer→Host records and safe identity projection. It excludes blocked pairs and does not require Friendship.

## 38. Checkpoint 17 reward evidence preservation
The canonical Consumer→Host path and schema are unchanged. Follow evidence still validates the current approved non-demo Host and uses stable Host UID deduplication.

## 39. Level independence
No relationship path writes `consumerLevels` or lifetime qualifying purchased Credits. Friendship and refollow do not affect Level.

## 40. VIP independence
VIP neither creates Friendship nor changes mutual-Follow evaluation. Existing VIP identity/content rules remain independent.

## 41. Gift independence
Gifts neither create Friendship nor depend on its projection. Gift service continues its own role, approval, block, catalog, and purchased-Credit checks.

## 42. Call independence
Calls do not create Follows or Friendship. Existing call preflight, block, billing, settlement, and recovery logic is unchanged.

## 43. Quick Match independence
Quick Match does not create Friendship and continues checking both block directions for candidates and acceptance.

## 44. Sponsored invite independence
Invites do not create Friendship and retain their own current role, availability, lock, terms, expiry, and block checks.

## 45. Discovery ranking independence
Friendship, spending, VIP, and Level were not added to discovery ranking. Following tabs continue to be explicit relationship filters.

## 46. Who Viewed Me preservation
Profile views remain separate evidence with existing deduplication and VIP identity gating. They never create Follow or Friendship.

## 47. Host Activity Visitors preservation
Visitors remains based on real profile-view records and block filtering. Friendship state is irrelevant.

## 48. System-event security
Conversation and message client creates remain denied. Only trusted backend code can create `friendship_created`; clients may send only validated text through the callable.

## 49. Privacy boundary
Raw cross-user `users/{uid}` reads remain denied. Relationship capability and public-profile callables expose bounded safe projections; reciprocal Follow point reads are limited to participants.

## 50. Role-transition behavior
Pending Creators remain Consumers. Approval changes them to Host, making former Consumer-direction relationships invalid for live checks; no projection can override current roles.

## 51. Invalid/stale Host behavior
An unapproved or missing Host fails `validFollow`, so live Friendship and messaging access fail closed even if old Follow or projection documents remain.

## 52. Demo/self safety
Rules prohibit self-follow, and public relationship eligibility excludes demo Hosts. Deterministic pair validation also rejects identical IDs.

## 53. Block race handling
Follow creation rules check both block directions. Cleanup re-reads current block state, deletes social records transactionally, and delayed friendship sync re-reads current blocks and Follows.

## 54. Follow race handling
Create uses a client Firestore transaction and does not replace an existing record or timestamp. Concurrent creates converge on one canonical document.

## 55. Unfollow race handling
Delete is idempotent. Delayed triggers re-read current truth; the activation key also detects a new Follow incarnation if a rapid refollow occurs before an older trigger runs.

## 56. Messaging race handling
Send authorization, pass consumption, paid debit, window creation, message creation, and mutual-Follow reads share one transaction. Existing same-message races still charge/consume once.

## 57. Security rules
Follow rules enforce ownership, exact directional schemas, current eligible roles, server timestamp, no self, and no block. Updates are denied; friendship/system-message writes remain server-only.

## 58. Direct-write denial results
Emulators denied forged source/target roles, wrong-owner writes/deletes, updates, blocked follows, friendship writes, system messages, conversations, balances, levels, and private cross-user queries.

## 59. Follow/Friendship test results
Focused Jest covered labels, subscriptions, one-way state, both directions, repeated sync, concurrent sync, unfollow, refollow, blocks, invalid roles, and reward non-regrant.

## 60. Messaging test results
Unit and emulator suites verified Friends-free sends, end-of-Friendship fallback, paid/free windows, pass ordering, refunds, Host reply rules, and blocks.

## 61. Profile/UI test results
Full-profile UI showed truthful Friends while preserving Like, Message, Video, Gift, counts, More, identity, VIP, and Level behavior.

## 62. Following test results
Discovery and Host Connect emulators verified one-way Following lists, unfollow removal, current role filtering, blocking, and bounded queries.

## 63. Activity test results
Host Activity emulator and UI tests passed Followers, Visitors, Likes, Gifts, Calls, safe identity, actions, block filtering, and no compact Friends badge.

## 64. System-event test results
Initial and refollow activations each created one message; simultaneous retries created no duplicates. The event preserved conversation read/unread state and remained client-unforgeable.

## 65. Block cleanup results
Emulator coverage verified both Follow directions and Likes disappear, discovery/activity exclude the pair, sync returns non-Friends, and other blocked interactions remain denied.

## 66. Role results
Consumer, pending Creator, approved Host, deapproved Host, demo, wrong-direction, same-role, and self cases retained their expected allow/deny outcomes.

## 67. Checkpoint 17 regression
Consumer reward tasks emulator passed, and root tests preserved Follow evidence, task deduplication, claims, UTC periods, and economics.

## 68. Checkpoint 16 regression
Privacy and profile-view suites passed Who Viewed Me count, VIP reveal, block filtering, 30-minute deduplication, and raw-data denial.

## 69. Checkpoint 15 regression
Sponsored invite emulator passed suppression, expiry, terms refresh, acceptance, block checks, sponsored seconds, and paid continuation integration.

## 70. Checkpoint 14 regression
Call unit and emulator suites passed 10-second settlement, continuation, reconnection, end races, recovery, and accounting invariants.

## 71. Checkpoint 13 regression
Quick Match emulator passed reservation, candidate filtering, offers, acceptance, connection, release, cancellation, block checks, and intro behavior.

## 72. Checkpoint 12 regression
VIP emulator passed membership lifecycle, authoritative expiry, identity/content access, payment guards, and direct-write denials.

## 73. Checkpoint 11 regression
Gift emulator passed purchased-only debit, provenance, idempotency, Host earnings split, system Gift message, aggregation, and block checks.

## 74. Checkpoint 10 regression
Social and paid-messaging emulators passed Chat Pass priority, 24-hour windows, paid unlock, no-reply refund, and Host reply rules.

## 75. Checkpoint 9 regression
Credit emulator passed P/B/L/U invariant, generic spend/refund, verified purchase, reversal, and forged-wallet denial.

## 76. Checkpoint 8 regression
Creator-role, discovery, Host Connect, Activity, identity, and privacy suites preserved permanent approved-Host role and safe Consumer/pending projections.

## 77. Root test totals
Full root Jest passed **65 suites / 661 tests**, with zero failures and zero snapshots.

## 78. Functions test totals
Standalone Functions Jest passed **17 suites / 393 tests**, with zero failures. Focused social/profile run passed **4 suites / 75 tests**.

## 79. Emulator totals
All **19 emulator scripts** passed: 16 on port 8289 and 3 on port 8189. Social messaging increased to **71 checks**; named suites also included Follow rules, rewards rules, discovery 47, Host Connect 68, Activity 86, privacy 73, Gifts 45, VIP 46, sponsored invites 28, Credits 20, and call race 11.

## 80. Babel/static parse
Repository-wide Babel parsing passed **262 JS/JSX/CJS files**; JSON parsing passed `package.json`, `functions/package.json`, `firebase.json`, and `firestore.indexes.json`.

## 81. Git diff check
`git diff --check` passed. Git printed only the repository's Windows LF-to-CRLF notices; no whitespace errors were reported.

## 82. Performance/query behavior
Authorization uses direct pair document reads in one transaction. Following/Activity queries remain bounded; no unbounded friendship scan or new index is required.

## 83. Migration/legacy-data status
No migration ran. An old friendship record with current mutual Follows is adopted by adding its activation key without replaying its historical event or reward; later false→true transitions use the new counter.

## 84. Physical validation status
No physical-device validation was performed or claimed. Validation was unit, static, and isolated local Firestore emulator only.

## 85. Deployment requirements
The Functions change and app service change require normal reviewed deployment/release to become live. Firestore rules did not need modification.

## 86. Remaining limitations/deferred work
There is no push-notification provider, so Follow has in-app visibility only. Materialized `active` may lag when eligibility changes without a Follow/block write, but it grants nothing; every live capability reads canonical records and current roles.

## 87. Confirmation: no friend requests
No friend-request, accept, reject, or pending-request model was introduced.

## 88. Confirmation: no fake Friendship
UI and messaging derive Friendship from two real, valid Follow records and block/role state. Projection or event history cannot fabricate access.

## 89. Confirmation: no Friends badge in conversation header
Conversation header code was not changed and displays no Friends badge.

## 90. Confirmation: no Friends badge on compact cards
No compact card gained a Friends badge; relevant tests continue to assert absence.

## 91. Confirmation: no production mutation
All writes used isolated `demo-*` Firestore emulator projects on localhost. Production Firebase was neither read nor changed.

## 92. Confirmation: no deployment
No Functions, rules, app, or hosting deployment occurred.

## 93. Confirmation: no staging
No file was added to the Git index.

## 94. Confirmation: no commit
No Git commit was created.

## 95. Confirmation: no push
No branch, commit, or tag was pushed.

## 96. Confirmation: Storage unchanged
Firebase Storage was not enabled, used, configured, or modified.

## 97. Confirmation: Paystack untouched
No Paystack request, verification, secret, configuration, or payment operation occurred.
