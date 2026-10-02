# CP30 - Authoritative action, double-submit and idempotency audit

## 1. Baseline and recovery

Repository: `C:\Users\NiBS-GA\Amira-1`. Branch: `amira-v2`.
Required and verified starting commit: `211d3afafe5c4d475dc47309a7dd140039a4a2a8` (`fix: harden navigation and route lifecycles`). The working tree was clean before CP30 edits. Work resumed after usage interruptions with existing CP30 edits preserved; HEAD and branch were rechecked. No reset, stash, clean, restore, commit, push or deployment was performed.

## 2. Scope and method

Reviewed screen/component event handlers, service mutations, registered navigation, session guards, server transactions, ledgers and applicable Firestore rules. Searches included press/submit/confirm/save/send/accept/decline/claim/purchase/block/follow handlers and create/update/set/delete/request/respond service calls. Followed meaningful persistent and economic operations through their backend implementations, including mutations initiated by reads/subscriptions. Local filters, pagination, carousel and media controls were distinguished from authoritative writes.

The inventory below groups equivalent entry points, not individual JSX buttons. Paths are relative to the repository: UI names under `src/screens` or `src/components`; client services under `src/services`; server files under `functions/src`. Authenticated owner means the exact CP28 `authenticatedSession`, not merely its UID. A guard suppresses obsolete continuations; it does not cancel a server write already sent.

Classification: **1** backend idempotent for the stated operation; **2** client single-flight plus backend authority; **3** stable client request key plus backend authority; **4** unsafe/defect. Multiple numbers distinguish the client mechanism from the server effect. Set/delete operations can converge while timestamps change; these are not claimed to return identical responses. Disabled features are explicitly marked unavailable rather than assigned a fictional guarantee.

## 3. Full action inventory

| Action | UI/source path | Service/backend path | Authority | Class | Session owner | Target owner | Risk found | Resolution / guarantee boundary |
|---|---|---|---|---|---|---|---|---|
| Start/prepare normal call | main/UserProfileScreen, ChatDetailScreen; call entry consumers | callService; index.js, callPreflight.js | Server eligibility, active-call locks, transaction | 2 | Exact session captured by call entry | Captured peer; originating route | Existing implementation correct | Existing single-flight prevents local duplicate dispatch; server prevents parallel active calls. Start has no durable request key and is not globally idempotent. |
| Accept/decline incoming call | IncomingCallCard; global call navigation | callService; index.js | Server ringing state and participants | 2 | Global authenticated owner | Incoming call ID | Correct existing handoff | Response ref lock retained. Card disappearance during successful acceptance must not cancel global navigation. Repeated terminal response may reject. |
| End/hang up | main/VideoCallScreen | callService; callRecovery.js | Server finalization/ledger | 2 + 1 | Exact session | Call ID and route | Failed end fabricated summary and prevented retry | Keep screen with unconfirmed status, release end lock after failure; navigate only on acknowledged end. Terminal server end is repeat-safe. |
| Connected acknowledgement, reconnect, settlement | main/VideoCallScreen; rtcService | callService; callRecovery.js, connectionAccounting.js | Server epochs, sequences, leases and connected time | 2; 1 per settlement ID | Exact session | Call ID/RTC session | Periodic settlement could overlap | Synchronous settlement lane; backend deterministic increment ledger retained. A later settle may legitimately settle newly due time. |
| Quick Match request/cancel | main/MatchScreen | quickMatchService; quickMatchService.js | Server request, reservation, candidate and terminal state | 3 for start; 1 terminal cancellation | Exact session | Request ID | Retry allocated a new request ID | Retain start key on uncertainty; clear on acknowledged response. Existing active-request dedup and cancellation/refund authority retained. |
| Quick Match accept/reject | QuickMatchOfferCard | quickMatchService; quickMatchService.js | Server offer deadline, accepted call, reservation | 2; accepted replay 1 | Exact session/global handoff | Offer request and Host | Failure dismissed retryable offer | Keep failed offer visible until deadline; existing synchronous response lock and same accepted call retained. |
| Sponsored invitation send | host/HostActivityScreen, main/UserProfileScreen, ChatDetailScreen | sponsoredInviteService; sponsoredInviteService.js | Server role/availability/block/pair checks | 2 | Exact session | Captured recipient | Same-frame dispatch possible | Add scoped invite lanes. Backend pending-pair suppression retained; a later explicit send is a new intent, not a durable retry receipt. |
| Sponsored invitation accept/decline | SponsoredCallInviteBanner | sponsoredInviteService; sponsoredInviteService.js | Server terms, invitation state, call locks | 2; accepted replay 1 | Exact session/global handoff | Invite ID and terms fingerprint | Failure silently discarded invitation | Visible unconfirmed error and retry; existing lock and refreshed-terms acceptance retained. |
| Gift from profile/chat/call | GiftTray and consumers | giftService; giftService.js | Atomic wallet, gift ledger, earnings, context validation | 3 | Exact session | Host + source + call | Pending key/lock could outlive owner; mutable gift payload | Owner-specific pending request and lock; snapshot gift/asset. Same gift retry reuses key; only acknowledged response shows success. |
| Send text / consume Chat Pass / paid unlock | main/ChatDetailScreen | messagingService; socialMessaging.js, messageEntitlements.js | Server entitlement precedence, atomic message and ledger | 3 | Exact session | Conversation and pending message | Success cleared a newer draft | Clear only the sent draft value; retain stable pending message ID and synchronous send lock. Errors remain unconfirmed/precise entitlement failures. |
| Conversation read acknowledgement | ChatDetailScreen, message activity lifecycle | messagingService; firestore.rules | Member-authorized transaction | 1 for unread state | Captured authenticated UID/session lifecycle | Conversation ID | Existing convergent write | Reset own unread count; read timestamp can advance. No charge or fabricated entitlement. |
| Daily check-in | main/RewardsScreen | rewardsService; consumerRewards.js | Server UTC-day claim transaction | 2 + 1 within day | Exact session | Server date claim | State-only duplicate guard | Shared synchronous claim lane; backend one grant per day retained. Retry on another server day is a new daily claim. |
| Task claim / evidence | main/RewardsScreen; getTasks | rewardsService; consumerRewardTasks.js, rewardEvidence.js | Server configured task, evidence and claim scope | 2 + 1 per scoped claim | Exact session | Task/version/date scope | Duplicate dispatch; successful claim described as failure after refresh error | Keep authoritative task result and distinguish refresh failure. Evidence uses deduplication IDs; no client grant. |
| Level milestone claim | main/MyLevelScreen | levelService; consumerLevels.js | Purchased lifetime + configured milestone transaction | 2 + 1 per level | Exact session | Milestone level | Duplicate dispatch; refresh failure hid confirmed claim | Synchronous lane; mark only returned level and explain refresh failure. No local balance grant. |
| Referral redeem / unavailable reward | RewardsScreen | rewardsService/configuration | Unavailable | N/A | Current screen | Displayed feature | No live redeem path | Preserve truthful unavailable behavior; no invented rewards. |
| VIP / recharge / payment / payment method | VIPStoreScreen, PaymentScreen, PaymentMethodScreen | vipService, billingService, paystackService; vipService.js | Provider/server only; checkout unavailable | N/A for unavailable checkout | Exact screen/session lifecycle | Selected plan/display | No active provider to prove end-to-end settlement | Fail closed; no fake purchase or activation. Server VIP authority inspected, unchanged. |
| Like / unlike / hide | main/UserProfileScreen | discoveryService; hostDiscovery.js | Authorized pair and fixed relationship paths | 2; 1 desired state | Exact session | Viewed UID | Overlapping relationship intents and hide navigation | Shared relationship lane; captured target and guarded completion. Timestamp refresh is not byte-for-byte idempotence. |
| Follow / unfollow | UserProfileScreen, FollowingScreen, CallSummaryScreen | followService; socialMessaging.js friendship sync | Rules/transaction and server friendship derivation | 2; 1 desired edge | Exact session | Peer; summary call + peer | Conflicting same-frame actions; list failure not visible | Scoped relationship/per-peer/summary locks; list error alert, remove only after success and reject older read versions. |
| Block / unblock | UserProfileScreen, ChatDetailScreen, BlockedUsersScreen; call safety | blockService; hostDiscovery.js, firestore.rules | Server block cleanup; owner-only deletion | 2; 1 desired own block | Exact session | Captured peer | Duplicate dispatch; clearing own block incorrectly implied no bilateral block | Lock action and re-read bilateral relationship after unblock; list removal only on success. Reverse block remains authoritative. |
| Review completed call | main/CallSummaryScreen | callReviewService; callReviews.js | Deterministic call/reviewer record and reputation transaction | 2 + 1 for same rating | Exact session | Call ID + peer | State-only guard and incomplete target scope | Summary lane and composite target guard. Different repeated rating remains a conflict. |
| Profile/conversation report | ReportUserModal; UserProfileScreen, ChatDetailScreen | reportService; firestore.rules reports match | Create-only reporter write; admin-only reads/updates | 3 (duplicate prevention, not receipt recovery) | Exact session | Reported UID/context and draft | Modal closed before acknowledgement; random ID per retry | Await explicit success; retain failed draft and same key. Retry of committed report may be denied; never treat denial as success. |
| Call report / block-and-end | main/VideoCallScreen | reportService, blockService, callService | Separate authoritative report/block/end operations | 3 report; 2 safety lane | Exact session | Call and captured participant | Missing profile target; unhandled errors; duplicate dispatch | Participant fallback, visible failures, stable report key and lane. Block success is not rolled back if end later fails. |
| Notice read | main/MessageHomeScreen | noticeService; firestore.rules | Owner-authorized same-document write | 1 for read flag | Exact session | Notice ID | Rejection unhandled/invisible | Guard and catch; show unconfirmed error. Timestamp may change on repeat. |
| Name, birthday, gender, country saves | onboarding/*SetupScreen | UserContext.updateProfile; firebaseService, firestore.rules | Captured-user profile write and restricted fields | 2 | Exact session including same-UID replacement | Onboarding screen/own profile | State-only locks; stale alerts; invalid name left spinner active | Shared action hook, guarded completion/errors, validation before busy. Navigation follows authoritative context state. |
| Edit Profile save / picker upload | main/EditProfileScreen | firebaseService, mediaService | Firebase Auth/profile rules; real Storage only when available | 2 | Exact session/focus | Own profile | Concurrent save/upload; picker failures outside catch | Shared profile lane; picker errors retryable; current-owner checks between profile operations and navigation. Partial distributed writes remain possible. |
| Creator draft / Continue / media replacement/removal | host/HostApplicationScreen | hostApplicationService, mediaService, applicationStorageService | Draft transaction/rules; real media ownership | 2 | Exact session | Own application and captured media | Error compensation could delete media already referenced by committed draft | Retain uncertain uploaded media; delete previous media only after acknowledged replacement/removal. Existing synchronous lock and hydration guards retained. |
| Creator Submit | host/HostApplicationScreen | hostApplicationService; firestore.rules | Validated application transaction; approval not client-controlled | 2 | Exact session | Own application | Confirmed submit reported failed when refresh failed | Keep submitted state; separate refresh error. Repeat under-review submit rejected; no duplicate approval/economic grant. |
| Host online/offline | host/HostDashboardScreen | hostConnectService; hostConnect.js | Approved Host, active call/busy checks | 2; 1 desired status | Exact session | Own Host/status version | Existing correct path | Ref lock and snapshot version retained; client cannot override authoritative busy status. |
| Host earnings / settings/rates | Host profile/activity/earnings views | hostEarningsService, hostProfileService | Server aggregates/configured rates | Read-only / unavailable mutation | Exact session | Own Host | No active payout/rate-edit action | No withdrawal implementation or invented client earnings. |
| Login, quick account, Google | onboarding/LoginScreen | firebaseService/authService | Firebase authentication | 2 locally; account creation not idempotent | Mounted unauthenticated intent | Captured credentials/provider response | Concurrent auth intents, repeated response, stale error/loading | Shared synchronous intent lock, response dedup, mounted guards. Already-issued Firebase auth intent is not cancellable by UI guard. |
| Logout/session termination | UserContext and registered logout entry points | sessionTerminationService; Firebase Auth | Captured session termination lifecycle | 2 | Exact session/global lifecycle | Captured auth instance/session | Existing correct path | Single-flight and stale-cleanup protections retained; replacement account is not signed out by old cleanup. |
| Presence / friendship / identity / profile view | UserContext, registered profile and subscription lifecycle | presenceService, followService, amiraIdentityService, profileViewService; amiraIdentity.js, profileViews.js, socialMessaging.js | Server identity/relationship/view validation; owned presence | 1 within each identity/evidence scope; presence desired state | Captured session | Own UID, peer or view pair | Existing ownership and server dedup inspected | No local identity/economic fabrication; a later valid view can legitimately be new evidence. |
| RTC mic/camera/speaker, permissions, settings | VideoCallScreen; rtcService | Native SDK/OS | Local device, not financial | N/A financial; local controls | Active call/session | RTC session/device | Not a server financial mutation | Existing session cleanup and Agora authentication preserved; device behavior needs physical testing. |
| Legacy onboarding/media/role components | Unregistered RoleSelection, PhotoUpload, Interests, LocationPermission | Legacy/local handlers; registered Root navigation excludes these | Not reachable product actions | Dormant; unsafe to enable without review | Legacy component | Legacy draft/profile | Legacy role patch must not become a role switch | Left unregistered. No claim that dormant code is safe to wire into production. |
| Other unavailable/local features | Story, translation, introductions, dormant moderationService, discovery filters | translationService, introductionService, moderationService, discoveryFilterStore | Read-only, unavailable or local preference | N/A | Local/session as applicable | Local selection | No active authoritative mutation found | Story read-only; translation/introductions fail closed; mock moderation arrays have no live consumers. No fake backend added. |

## 4. Confirmed defects and production fixes

The following 17 defect groups are addressed; grouping does not imply 17 individual handlers:

1. Onboarding same-frame duplicate saves and obsolete errors; invalid name left loading active.
2. Login intents could overlap and obsolete login continuations could update errors/loading.
3. Profile save/upload could overlap; permission/picker failures bypassed normal recovery.
4. Relationship, unfollow, unblock and review actions lacked synchronous arbitration; list failures could be invisible.
5. Unblock presented a false bilateral-unblocked state without checking the other user's block.
6. Reports closed/cleared before confirmed success and retries could create new moderation records.
7. Failed call end navigated with a fabricated fallback summary and could not be retried.
8. Call safety used a possibly missing profile, lacked visible rejection handling and could duplicate dispatch.
9. Periodic settlement requests could overlap even though the backend already deduplicated increments.
10. Completed message send cleared a newer draft entered while awaiting the old message.
11. Gift pending IDs/locks needed exact owner/source scoping and payload capture.
12. Sponsored outgoing intents could overlap; failed incoming sponsored/Quick Match responses discarded retryable UI.
13. Quick Match start retry did not preserve its existing backend-supported request key.
14. Reward and Level claims relied on React busy state and conflated confirmed claim with follow-up refresh failure.
15. Creator submission conflated successful authoritative submit with later profile refresh failure.
16. Creator upload error compensation could delete media after a draft actually committed or profile mirroring failed.
17. Notice read failures were unhandled and not visible.

The shared `src/hooks/useActionLock.js` binds a synchronous lane set to the existing guard identity. A new owner has independent lanes; an obsolete `finally` cannot release a replacement owner's lock. Locks are released on real failures. Existing UI busy states still render progress, but are not the concurrency primitive.

Production changes are limited to 25 JavaScript files. No backend implementation, Firestore rules, package/dependency, navigation topology or economic configuration changed. Report writes retain the existing document schema and create-only rule, using a stable chosen document ID. Quick Match uses an already-supported callable requestId field.

## 5. Correct paths inspected and authority findings

Normal call entry already has synchronous shared single-flight and exact-session guarded navigation. Incoming acceptance deliberately belongs to the global authenticated lifecycle: Host busy state can remove the invitation card before a successful response arrives. Availability already has a ref lock and status-version reconciliation. Creator draft progression already has a synchronous lock, captured-session checks and failed-hydration protection. Session termination, context profile refresh and listener isolation already distinguish replacement sessions with the same UID.

Backend inspection establishes financial authority from repository code, not UI assumptions:

- Calls: active participant locks, role/approval/availability/block checks, connected-time evidence, deterministic call/increment ledger IDs and terminal finalization. Client timers request settlement; they never calculate authoritative charges. Normal start is not request-idempotent.
- Gifts: deterministic sender/request transaction ID; existing record payload checks; purchased-wallet debit, catalog validation, call context, ledger and earnings update in the transaction.
- Messaging: stable message request ID, payload/sender verification, server entitlement selection, atomic paid unlock/pass consumption and unique refund ledger entries.
- Rewards/Level: server date/scope/level claim IDs, configuration and evidence validation, transactional grants. Level continues to derive from qualifying purchased lifetime Credits.
- Quick Match/sponsored calls: request/offer/invite state transitions, active locks, terms validation and reservation/refund rules remain server-owned. Acceptance replay returns the existing accepted call where supported.
- Reviews: one deterministic review per eligible call/reviewer, same-rating replay, conflicting changed rating rejection and transactional reputation update.
- Reports: create-only same-ID writes prevent duplicate records for that key. Privacy rules do not permit the reporting client to read back a lost receipt; denied retry is not success evidence.

All locked economics and product decisions remain unchanged: Consumer and Host tabs, no role switch, purchased-only Level, VIP 3/7/30 days, Who Viewed Me, paid messaging 24-hour/refund behavior, Quick Match 20-second intro, paid 10-second call increments, sponsored 30 seconds, gifts, Host Activity, Agora authentication, Amira ID and Creator Application. No local balance increment substitutes for a server result. Story/translation/payment/Storage availability remains truthful.

## 6. Test changes and session/target evidence

15 test files changed or were added; 45 tests added relative to the baseline full-suite total (898 -> 943). Five new suites cover the action hook, onboarding/auth intents, report modal, report service and Creator action integrity. Extended suites cover call end/safety/review, profile save, chat draft/invite/block, social targets, follow lists, gift ownership, reward/Level refresh failures, Quick Match retry, notices and Host invitations.

Deferred promises exercise same-frame repeated handlers, failure/retry, obsolete target results, logout, same-UID session replacement and unmount. Hook tests show an old completion cannot unlock a new owner's operation. Gift/chat tests assert one economic dispatch for rapid invocation and stable retry identity. Creator tests model committed-but-unacknowledged draft and profile-mirror failure, proving no compensating media deletion. Existing call-entry, incoming-call, availability and UserContext isolation regressions remain in the focused run.

The report service tests mock Firestore and verify identical document targeting plus propagation of denied retry; they do not claim live rule/emulator validation. Creator upload tests enable the media flag only inside the mocked test process and restore it; no real upload or project feature enablement occurred.

Two intermediate focused runs exposed test-fixture issues: the Quick Match factory mock needed the newly exported requestId method, and a social retry assertion expected unfollow despite its fixture hydrating following=false. Fixtures/assertion were corrected to match the service contract and authoritative fixture. Final focused and full runs have no failures; no production regression was hidden or test removed.

## 7. Deferred and unsupported guarantees

- Stable pending gift/message/report/Quick Match IDs are in memory, not a durable outbox. Process restart, discarded route state or a deliberately new intent may allocate a new key. No cross-device or exactly-once-after-restart guarantee is claimed.
- A report with lost acknowledgement can exist while the client displays unconfirmed. Same-ID retry cannot create another report but may remain denied; admin receipt reconciliation would require a separate product/backend change.
- Retaining media on uncertain draft completion can leave an orphan. Reconciliation/garbage collection is deferred; deleting possibly referenced media is not safe compensation. Storage remains unavailable unless its existing real prerequisites are met.
- Auth/profile/application operations spanning multiple services can partially commit. Owner invalidation suppresses later UI work; it does not undo valid writes. Firebase sign-in already dispatched cannot be cancelled by a mounted flag. The existing development quick-account credential disclosure remains intentionally available after its auth transition.
- Google provider/browser behavior, native picker permissions, Agora reconnect and real network loss require devices/provider configuration. Unit mocks do not prove transport-level ordering or deployed backend state.
- No active checkout, provider verification, withdrawal or editable-rate workflow was invented. Dormant legacy role/onboarding code remains outside registered navigation and must be reviewed before any future activation.

## 8. Recommended physical-device matrix (not executed)

| Scenario | Procedure | Expected evidence |
|---|---|---|
| Start/end call | Two phones; double-tap Start and End; interrupt end response, retry | One active call; no fabricated final summary; server ledger has one entry per increment |
| Gifts | Double-tap same gift; interrupt response; retry unchanged gift | One request ID within pending owner; one server gift debit; acknowledgement only after response |
| Messaging | Double-tap Send; type next draft before reply; retry lost response | One message/charge/pass use; newer draft remains; unchanged retry uses same ID |
| Pending logout | Begin profile/claim/gift then logout before response | No old alert/navigation/state on logout screen; dispatched server write is not locally undone |
| Account replacement | A action pending; logout, login B; also replace session with same UID | B/new session has independent locks and no obsolete completion |
| Relationship safety | Rapid follow/unfollow, block/unblock; retain reverse block on second phone | Serialized local intent; authoritative relationship remains blocked where appropriate |
| Creator | Double-tap Continue/Submit; interrupt draft response/profile refresh | One local dispatch; confirmed submission stays submitted; referenced media not deleted |
| Host/Quick Match | Rapid online/offline and offer response; lose response until deadline | Busy/availability authority preserved; one accepted call; retry only while valid |
| Sponsored invite | Repeated send/accept; refresh terms before response; retry error | One pending pair/accepted call; revised terms require acceptance; visible error |
| Claims/reports | Rapid claim/report; drop refresh or acknowledgement | Confirmed claim distinguished from refresh failure; report draft retained when unconfirmed |
| Native auth/media/RTC | Cancel/retry Google, deny picker permission, background/reconnect call | Retryable UI, no competing login intent, no obsolete navigation or client billing authority |

## 9. Validation results

All final checks passed:

| Check | Exact result |
|---|---|
| Focused CP30 + retained lifecycle/authority regressions | 20 suites, 245 tests passed; 114.763 seconds |
| Complete root Jest (`node node_modules/jest/bin/jest.js --runInBand --silent`) | 82 suites, 943 tests passed; 61.257 seconds |
| Functions Jest (from functions, `node ../node_modules/jest/bin/jest.js --runInBand --silent`) | 17 suites, 402 tests passed; 15.021 seconds |
| Babel with installed babel-preset-expo, configFile/babelrc disabled | All 40 changed/new JavaScript files transformed |
| `git diff --check` | Passed |
| Emulator | Not rerun: no backend, rule, schema or callable contract changes; existing requestId and create-only document contract reused |
| Physical/two-phone tests | Not performed; matrix above is recommendation only |

Root Jest discovers the Functions tests too; the separate 402-test Functions run is required validation, not 402 additional unique tests. Node validation ran with sandbox escalation because installed dependency resolution on this Windows workspace requires it.

## 10. Final Git state

Branch `amira-v2`; HEAD remains `211d3afafe5c4d475dc47309a7dd140039a4a2a8`. All CP30 changes are unstaged. Counts: **25 production JavaScript files + 15 test JavaScript files + 2 audit artifacts = 42 modified/new files**. No staged changes, commits, pushes or deployments.

The complete path-level snapshot is `docs/action-integrity-audit-git-status.txt`, generated last after edits and validation with `git status --short > docs/action-integrity-audit-git-status.txt`. The manifest itself is verified in actual Git status. Git may collapse the new `src/hooks/__tests__/` and onboarding test directories in short status; the 42-file count uses untracked files expanded with `-uall`.
