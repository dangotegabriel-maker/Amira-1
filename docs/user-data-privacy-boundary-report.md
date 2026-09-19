# Checkpoint 8: User data privacy boundary

## 1. Baseline branch and commit

Branch `amira-v2`, commit `1ba2799`. The working tree was clean before implementation. The branch and HEAD remain unchanged. Validation used local code and isolated `demo-amira-*` Firestore emulator namespaces only.

## 2. Exact files modified and new

Modified:

- `firestore.rules`
- `functions/src/index.js`
- `src/components/FreeNowBanner.js`
- `src/components/IncomingCallCard.js`
- `src/screens/main/BlockedUsersScreen.js`
- `src/screens/main/ChatDetailScreen.js`
- `src/screens/main/MessageHomeScreen.js`
- `src/screens/main/__tests__/messageEntitlementUi.test.js`
- `src/services/__tests__/followHelpers.test.js`
- `src/services/__tests__/messagingOpen.test.js`
- `src/services/firebaseService.js`
- `src/services/followService.js`
- `src/services/messagingService.js`

New:

- `functions/src/publicIdentity.js`
- `functions/src/__tests__/publicIdentity.test.js`
- `src/services/publicIdentityService.js`
- `src/services/__tests__/publicIdentityService.test.js`
- `src/services/__tests__/userPrivacy.emulator.cjs`
- `src/screens/main/__tests__/privacyIdentityUi.test.js`
- `docs/user-data-privacy-boundary-report.md`
- `docs/user-data-privacy-boundary-git-status.txt`

No schema, index, dependency, configuration, core call, RTC, payment, economic-domain, or prior projection implementation was modified.

## 3. Original raw users rule and behavior

`match /users/{uid}` permitted `allow read: if signedIn();`. Any authenticated account knowing another Firebase UID could get or listen to the entire account document, or query user documents. This bypassed privacy filtering in discovery, Connect, full-profile, Activity and Level callables. The generic client profile getter also normalized cross-user documents using the current authenticated account as a fallback, making missing display fields potentially misleading.

## 4. Complete dependency audit

Before edits, repository searches covered raw `users` paths, collection/document construction, get/getAll-style reads, transactions, getDoc/getDocs, snapshots, collection groups, Firebase Admin operations, role/approval, call state, authentication and all requested product surfaces. Application code was inspected in `src`, `functions/src`, `shared`, and root entry/config files. Dependency directories, generated files and previous reports were not treated as application consumers. No additional ordinary profile-reading source outside these areas was found.

The cross-user dependency map was completed before changing the rule:

| Original client dependency | Exact consumed information | Decision and replacement |
| --- | --- | --- |
| `followService.follow` | Target existence, UID, protected `hostStatus.isApproved`; source own approval determines the existing follow schema | Replace target raw get with relationship capability. Keep own get and rule-authorized transaction. |
| `followService.subscribeRelationship` | Source/target UID and protected approval to derive valid role pair; four follow/block subdocument existence states | Remove target raw listener. Keep owner listener and four authorized relationship listeners; refresh backend capability on subscription/relationship/owner snapshots. |
| `messagingService.prepareConversation` | Recipient existence only | Use message-context identity authorization before existing participant-only conversation read. |
| `ChatDetailScreen` | Target UID and protected approval for header call/gift eligibility; display name had come from route params | Use message identity and protected header capability. Derive name from the authorized projection, clear stale identities, expose retry. Call entry requires only target UID; public rate/availability remain authoritative in the existing call backend. |
| `MessageHomeScreen`, Calls tab | Other participant UID and username, used for display/navigation; history supplies call state/time, separate presence supplies existing online ordering | Batch participant identities by authorized call IDs. Preserve history/presence behavior; disable navigation when the projection reports a block. |
| `IncomingCallCard` | Caller username, profile photo and optional country name | Use call-derived participant identity for name/photo. Optional country label is omitted because the tiny endpoint does not return country. Accept/decline and expiry behavior are unchanged. |
| `BlockedUsersScreen` | UID, username, profile photo for row and Unblock | Use a bounded owner-block projection. Stop hydrating the previous union of outgoing and incoming blockers; only outgoing blocks authorize Unblock rows. |
| Dormant `FreeNowBanner` | UID passed to video-call entry; fabricated Jessica name from socket event | Gate the unused component to null. No imports/mounts were found. The event has no trusted identity/availability proof. No invitation feature was implemented. |

Existing safe paths were checked: Consumer Home/Match/Host Following use `discoveryService` and Host discovery projections; Host Connect/Consumer Following use protected Connect projections; full profiles use Host discovery/Host Activity projections; Activity actors and visitors use protected backend projections. None needs raw client hydration.

Intentional owner dependencies:

| Source | Owner-private purpose |
| --- | --- |
| `firebaseService` auth login helpers | Read the UID returned by successful Firebase Auth; verify own quick-login accountId; hydrate own Google-linked account. |
| `firebaseService` create/ensure/get/subscribe | Own bootstrap, canonical/legacy owner hydration, constrained creation/update, removal of a legacy stored password field. |
| `UserContext` | Authenticated account hydration/listener, own refresh and balance refresh; own Amira ID bootstrap remains protected. |
| `OTPScreen` | Read successfully authenticated credential owner's profile. |
| `followService.requireSource` and source listener | Own protected approval determines permitted role and follow schema. |
| `hostApplicationService` | Own profile/application transaction; own DOB eligibility; private draft and submission state. |
| Owner profile/settings/edit/rewards/earnings screens | Consume own UserContext or owner-specific private collections/callables. No additional cross-user raw access. |
| Existing legacy financial/reward methods in `firebaseService` | Own account refs only. Their existing constrained/disabled economic behavior was not expanded. |

Other reads are distinct authorized data, not raw profiles: own notices/entitlements/discovery preferences; own or recipient follow/block documents; participant conversations/messages/calls/history; owner Rewards/Level/Earnings; public Host reputation; existing separate presence documents. `MessageActivityContext` uses owner blocks and a recipient-constrained blocked collection group. Follow counts use a Host-constrained following collection group. Likes, profile views and friendship operations use existing protected backend paths. `mediaService`'s `users/` strings are owner Storage object paths, not Firestore profile reads; Storage remains gated.

Backend and rule-engine dependencies are retained and enumerated in section 26. Ordinary client access and trusted backend access were classified separately.

## 5. Actual field classification

| Classification | Fields/models found in repository | Treatment |
| --- | --- | --- |
| Intended public profile data | `username`/legacy `name`, public `profilePic`/`photoURL`/`photo`, country code/name, gender where full profile displays it, bio, controlled interests, languages, explicitly public gallery/media URLs, derived adult age | Only existing surface allowlists or tiny name/photo projection; no auth-account fallback or raw spreading. Country name is not newly projected. |
| Canonical public identity with protected assignment | `amiraId` (`AMR-XXXXXX`) | Verified reservation-backed full profiles only; absent from tiny identities and compact cards. |
| Public Host state with protected authority | `hostStatus.isApproved`, `hostStatus.availability`, `hostProfile.videoRateCredits`, `rateTier`; approved application date used by discovery | Existing protected full/compact Host projections unchanged; new message endpoint exposes only the approval capability needed for header actions. |
| Owner-private personal/authentication data | `email`, `phone`, `phoneCode`, raw `dob`, `accountId`, `authProvider`, `isGuest`, account acknowledgement, completion/bootstrap metadata, created/updated/legacy timestamps, legacy password cleanup | Raw owner access only; new cross-user endpoints never include them. Derived age can remain in existing profile projections. |
| Private financial/accounting data | `wallet.creditBalance`, wallet currency/legacy `coins`, `coin_balance`, balance/call-price compatibility data; `earnings.pending`, `available`, currency; VIP tier/status/start/expiry; legacy reward flags | No new public access. Protected financial/VIP fields remain protected by existing rules. |
| Private referral/settings/progress data | `settings.doNotDisturb`, `referralCode`, `referredBy`, `referralStats`, `profileViewStats`, legacy `rewards.dailyClaimedAt`/`googleLinked`; Level/qualifying compatibility fields | Owner raw data; approved public social counts continue through existing safe paths. Referral `AMIRA-` code stays distinct. |
| Protected separate private models | `consumerLevels` qualifying purchased-credit total and milestone accounting; `consumerRewards` Chat Pass/free-video/reward ledgers and chat windows; `hostEarnings`, `platformRevenue`, credit transactions | Existing owner/backend authorization, economics and dedicated public-Level result unchanged. |
| Private application/verification/payout model | `hostApplications.details`, `media`, guided `verification.evidence`, `payoutSetup`, application/review/submission metadata; private verification Storage paths | Owner/admin application rules remain. Existing projection reads only intended public approval date/profile attributes. Never copied into the new endpoints. |
| Protected system/call state | Approval truth, verification/application transition, permanent Host role, Busy/pre-call availability, call locks, entitlements, connection accounting, RTC credentials, settlement | Existing trusted backend authority remains. Tiny identity endpoints are read-only. |

No active user-document push/device-token writer or general private-account/moderation visibility model was found. Device/push/verification/payout/internal-setting fields were nevertheless injected as hostile extra sentinels to prove whitelists do not leak future or legacy additions. They are test fixtures, not a claim that production stores those exact keys. Purchased/bonus/Paystack/gift accounting outside the currently implemented models remains deferred and is not newly projected.

## 6. Final raw users read policy

`allow read: if owns(uid) || admin();`. Owners may read/listen to their own raw document. Ordinary authenticated cross-user gets, listeners and unrestricted user collection queries are denied. Anonymous reads are denied. A trusted custom `admin` claim is an explicit privileged exception, consistent with the existing administrative write authority. Admin SDK bypasses client rules as before.

The client generic getter/ensure/listener also verifies owner identity. Getter checks again after its asynchronous read; listener callbacks ignore results after account changes. Rules, rather than these convenience guards, enforce confidentiality.

## 7. Final raw users write policy

Create/update/delete rules are byte-for-byte unchanged. Creation remains owned, Consumer-only, no assigned Amira ID/Level/qualifying fields, default rate and zero protected balances. Owner updates preserve Amira ID value and field presence, wallet/earnings, qualifying/Level fields, rates, protected approval, VIP, visitor/referral accounting, role permanence and Host status except the existing atomic applicant transition. Administrative updates retain their existing privileged rule. Delete remains denied.

Owner read permission does not grant arbitrary writes. This checkpoint does not replace the existing protected-field policy with a generic owner-write rule.

## 8. Collection split decision

No split, duplicate profile collection, new directory, schema migration or production backfill. Existing authorized backend projections plus owner/admin raw access solve the audited dependencies without maintaining a second drifting public profile model.

## 9. Exact safe public projection architecture

Existing Host discovery/domain, Host Connect, Host Activity/domain, profile-view, dedicated Level and verified Amira ID paths remain unchanged.

New shared `functions/src/publicIdentity.js` constructs exactly `{uid, username, profilePic}`. Photo references reuse the existing HTTPS/public-media helper; empty fields stay empty. It never derives a name from UID/current-auth data or invents a photo. Four callable exports authenticate with `requireAuth(request)` and reject unexpected input keys:

| Callable | Input | Authorization | Exact result |
| --- | --- | --- | --- |
| `getRelationshipCapability` | `{targetUid}` | Existing non-demo actor/target, distinct valid IDs; protected current Consumer/approved-Host pair and bidirectional block check | `{valid}` only. Unsupported/blocked pairs return false without identity. |
| `getMessageIdentity` | `{targetUid}` | Existing non-demo accounts, no block either way; current permitted opposite-role pair OR exact two-party existing deterministic conversation | `{identity, canInteract, hostStatus:{isApproved}}`. Historical same-role conversation retains tiny identity but no newly eligible interaction/header privilege. |
| `getCallParticipantIdentities` | `{callIds}` with 1–30 distinct IDs | Each trusted call or legacy history record must contain exactly its distinct caller/receiver and the actor; opposite UID is derived on server | `{participants:[{callId, identity, canInteract}]}`. Missing/demo profiles yield null identity/false. Blocks retain participant-only historical identity but disable new interaction. No client-selected target UID. |
| `listOwnedBlockedIdentities` | `{}` | Non-demo actor; derive targets only from that actor's owned blocked documents, valid matching blockedUid | `{people, bounded:true, sourceLimit:50}`. Name/photo-only management exception works despite the owned block. Incoming blockers are not identity-hydrated. |

These are scoped capabilities/relationship projections, not a general profile search/list-by-UID directory. A current approved Host can obtain minimal identity for an eligible Consumer, matching the existing Host-to-Consumer profile/message authorization; a Consumer can obtain eligible approved Host identity. Same-role strangers cannot use the message endpoint. Call and blocked batches require actual authorized records.

Client `publicIdentityService` shares existing lazy callable/emulator wiring, has no global identity cache, rejects responses if authentication changed, and chunks call contacts into sequential batches of 30. It has no raw-profile fallback. UI state is keyed to actor/account/target/call as appropriate and ignores late responses after cleanup. All new endpoints are read-only.

## 10. Consumer discovery impact

No ranking, filters, tabs or projection edits. Approved Hosts only; For You/New/Following remain on the bounded existing backend. Private account fields, raw DOB, Level/VIP/financial totals and quick-login IDs do not appear. The sentinel emulator exercises Consumer candidates/full Host profile and existing discovery regression passes.

## 11. Host Connect impact

No edits to Connect source/service/projection. Real Consumers and pending applicants remain eligible; protected approval excludes Hosts; existing completeness, country/ranking, bidirectional block and demo filtering remain. Exact compact keys are tested, without Level/VIP/Amira ID/financial fields. No card raw hydration or new presence claim.

## 12. Full Host profile impact

Existing Consumer-authorized Host profile and social projection retained. Canonical Amira ID is reservation-verified. Intended bio/interests/public photos/media, derived age, country, languages, approval date, public rate/availability and social counts remain; email/phone/raw DOB/account credentials/application verification/payout/wallet do not. Exact top-level keys and sentinel absence tested.

## 13. Full Consumer profile impact

Existing approved-Host-authorized Consumer projection retained, including reservation-verified Amira ID and intended full-profile fields. Level remains a separate protected request, not part of raw hydration. Bidirectional blocks, demo suppression and protected Consumer role remain. Exact top-level keys and sentinel absence tested.

## 14. Own Profile and UserContext impact

UserContext still ensures, hydrates, subscribes to and refreshes the authenticated owner. Its richer private document remains permitted. Own account balances, settings, approved Host Profile, creator state and own Amira ID bootstrap are retained. Generic raw access now fails early for mismatched owners; in-flight getter and listener responses are guarded against account change. Own listeners are not converted to public projections.

## 15. Edit Profile impact

Actual normal save payload: `username`, `bio`, `countryCode`, `countryName`, `phoneCode`, `updatedAt`; Firebase Auth displayName updated separately. Photo update payload: `profilePic`, `updatedAt` through the existing gated media service. No Edit Profile changes. Normal owner name/bio edit succeeds in the privacy emulator; attempts to mutate Amira ID, approval, availability/Busy, protected rate, Level/qualifying total, wallet, earnings and Host role permanence remain denied.

## 16. Creator Application and approval impact

Own application/profile transaction remains authorized. No private verification evidence or payout setup enters new projections. Atomic submission still keeps Consumer role; normal user cannot self-approve. Protected approval makes Host transition permanent and keeps Connect/Messages/Activity/Profile shell. Creator tests and emulator regress both submission and trusted approval.

## 17. Host Earnings privacy impact

Owner-approved-Host/admin authorization is unchanged. Consumer, pending applicant and other Hosts cannot read another Host's earnings. No new earnings fields in any identity or profile result. Economics and future payout setup are untouched.

## 18. Rewards and Level privacy impact

Owner Rewards/Level and milestone authority remain unchanged. Dedicated public Level returns only the authorized level number, while qualifying purchased-credit totals/config/accounting stay private. No Level/VIP on Connect, Activity, message header or tiny identity. Raw compatibility `level`/qualifying fields in hostile fixture accounts cannot bypass this boundary. Existing Level and Rewards suites pass without threshold/economic changes.

## 19. Amira ID privacy impact

Amira ID remains immutable, canonical and reservation-backed on permitted full profiles and owned UI. `amiraIds` client reads/writes remain universally denied, including ordinary enumeration and privileged client reads in the privacy test. No reservation authority metadata, search, lookup directory, regeneration or migration was introduced. Nine-digit quick-login `accountId` and `AMIRA-` referral codes stay private/distinct from `AMR-` profile identity. Existing login UI terminology remains a physical-review item, not a credential redesign.

## 20. Messages identity hydration impact

Inbox continues to use existing trusted conversation participant summaries (`uid`, `username`, `profilePic`, role) and participant-only conversation/message rules; no additional per-row profile callables or user listeners. Account-keyed inbox/notice state and cleanup prevent previous-account identity lists from lingering.

PrepareConversation and ChatDetail replace raw recipient reads with message-context projection. Header uses its verified display name rather than route fallback identity; Consumer-to-approved-Host call/gift affordances use protected capability, without Level/VIP/Friends badges. Identity failure retains honest unavailable/retry text. Historical conversation identity does not require current discovery eligibility. Sending, drafts, retry IDs, unread/read state and Chat Pass/Host-free messaging backend economics remain unchanged.

## 21. Follow, Friends, Like and Block impact

Follow creation preserves asymmetric Consumer/Host schemas, transaction idempotence and server timestamp. Backend capability replaces only raw target validation; Firestore remains final authority for protected roles/both blocks and schema. Unfollow remains possible after target role changes.

Full-profile/chat relationship subscription retains owner source plus four authorized follow/block listeners, with target approval capability fetched through backend. Current unfollow/block immediately breaks displayed Friends; existing friendship sync/trigger remains idempotent. Tests prove no target raw listener/get and late capability cleanup. Like/block cleanup backend and friendship economics are untouched.

Blocked management now lists only owned outgoing blocks, rather than presenting incoming blockers as unblockable people. Name/photo projection is narrowly permitted to manage existing owned blocks. Failure, retry, loading and unblock errors are explicit. The first 50 owned block documents are considered; missing/demo targets are omitted. No arbitrary block-target directory.

## 22. Profile Views and Who Viewed Me impact

No edits. Latest-pair marker, server time, 30-minute dedup, Consumer-to-Host/Host-to-Consumer directions and block filtering remain. Approved Host Visitors use allowlisted actors. Consumer result remains count-only, including active legacy VIP fixture. Raw user privacy does not grant Consumer access to view identities or change subcollection rules.

## 23. Call UI and profile hydration impact

Only IncomingCallCard identity effect/rendering and MessageHome Calls-tab hydration were changed. Both use participant-derived safe identity. Existing history limit/grouping/presence ordering remains. Historical calls can display minimal participant identity after role transition/block without new interaction privilege. Account/call keying and cleanup prevent stale caller data; projection errors have retry. Call endpoints, locks, expiry timer, accept/decline handlers and navigation into the existing call flow were not redesigned.

`FreeNowBanner` was unmounted/dormant and used fabricated socket identity; gating it prevents a future unsafe read without inventing an authoritative invitation lifecycle. `index.js` adds only six lines for the new identity factory and four callable exports; every existing core call implementation is unchanged.

## 24. Availability and Busy impact

Existing `hostConnect.setAvailability` remains backend-authoritative Online/Offline only. Client status/rate edits remain denied. Busy, pre-call state, lock constraints and recovery restoration remain in unchanged call code. Emulator regressions include availability/lock transaction race and unchanged recovery accounting.

## 25. Remaining client cross-user raw reads

**None found in ordinary application code.** Final searches cover raw user document/collection refs, getDoc/getDocs, snapshots, collection groups, the generic getter/listener and dynamic users paths.

Remaining raw-user client refs are owned: generic owner profile/auth/bootstrap methods, follow source validation/source listener and owned creator application transactions. Cross-user refs under `following`/`blocked` are narrowly authorized subdocuments, not complete `users/{uid}` documents. `mediaService` paths are gated owner Storage paths. Separate participant history/conversation/call, presence and reputation reads are not raw account documents.

No exception to ordinary cross-user raw account access was retained. Trusted custom-admin and Admin SDK access are intentional privileged exceptions, not ordinary flows.

## 26. Intentional trusted server/Admin raw access

| File and operations | Intentional purpose |
| --- | --- |
| `functions/src/index.js`: startVideoCall, respondToVideoCall, acknowledgeVideoConnected, legacy settleVideoCallIncrement/endVideoCall, reconcileExpiredVideoCalls | Read participant approval/rate/balance and block/preview state; protected call/Busy/accounting writes; bounded Busy-user recovery query. Existing implementations unchanged. |
| `callRecovery.js`: recovery transaction and recoverLock | Participant profile/accounting reads, Consumer balance debit, protected Host Busy restoration and orphan-lock recovery. |
| `callPaymentLifecycle.js`: synchronize/confirm | Trusted participant eligibility, Host Busy restoration, wallet/rate/accounting verification. |
| `callReviews.js`: submit | Trusted completed-call Host authorization, bidirectional block checks, reputation update. |
| `socialMessaging.js`: readPair used by sendText/getChatAccess/syncFriendship | Current protected pair roles, private entitlements and bidirectional blocks; allowlisted conversation summaries and social/friendship events. |
| `messageEntitlements.js`: prepare/grant helpers | Owner protected role and reward/chat-pass authority. |
| `consumerRewards.js`: claim/dashboard role checks | Owner Consumer eligibility and private reward accounting. |
| `consumerLevels.js`: snapshot/claim/publicLevel | Owner protected roles/qualifying authority and approved Host public-Level authorization, both blocks. |
| `hostDiscovery.js`: viewer/candidates/profile/setLike/hide/cleanup | Consumer actor, bounded approved Host pool, current pair authorization, public allowlist, block/follow/like cleanup. |
| `hostConnect.js`: owner/availability/setAvailability/discover/today | Approved Host actor, bounded Consumer/following pool, protected availability/lock state, safe Connect and visitor counts. |
| `hostActivity.js`: approved/consumerProfile/list | Approved Host actor, permitted current/historical actors, public full Consumer/compact identity, blocks and call proof. |
| `profileViews.js`: track/list | Protected direction and viewer eligibility, private pair record/count update, allowlisted approved-Host visitor identities, Consumer count-only output. |
| `amiraIdentity.js`: ensure/read/publicId | Owner canonical immutable assignment, reservation authority/reverse query and read-only public verification. |
| New `publicIdentity.js`: profile/pair/message/call/blockedProfiles helpers | Minimal allowed identity/capability after context authorization; no writes. |

`callPreflight.js` and other pure domains consume server-supplied profiles without issuing their own raw database reads. Shared role/model helpers similarly do not independently grant database access. Firestore rule-engine get/getAfter/exists reads of users for protected relationship/role validation remain trusted rule evaluation, independent of client read permission. Local emulator fixture/test Admin operations are not production application reads.

## 27. Private sentinel leak tests

Backend unit tests and a unique emulator project inject recognizable email, phone, wallet/earnings amounts, qualifying total, quick-login accountId, VIP, payout, verification, device/push, authentication and private-setting sentinels. Whole serialized results must not contain the recognizable private values or raw DOB/accountId.

Surfaces checked: full Host, full Consumer, Consumer discovery, compact Connect, Activity Visitors, new message identity, call participant identities and owned-block management. Exact full-profile top-level, Connect compact, Activity actor, tiny identity and message result keys are asserted. Verified Amira IDs remain present only on intended full profiles; tiny/compact identity do not contain them. Bidirectional blocks, unauthorized caller, malformed call participants, demo accounts, role transitions, no raw directory and read-only accounting are checked.

## 28. Firestore rules change

One read predicate changed: `signedIn()` to `owns(uid) || admin()` for raw user documents. No write/subcollection/collection-group/call/application/Rewards/Level/identity reservation rule was loosened or modified. Tests deny Consumer-to-Host, Host-to-Consumer, Consumer-to-Consumer and Host-to-Host raw gets, a cross-user snapshot, unrestricted user enumeration and anonymous gets, while allowing owner and privileged admin reads. Protected owner-write assertions and all prior rules suites remain.

## 29. Exact tests added and updated

Added:

- `functions/src/__tests__/publicIdentity.test.js`: 26 tests for explicit tiny identity, private sentinels, protected pair capability, both blocks, message/history authorization, demo/missing targets, call derivation/participant shape, read-only state, owned blocks, invalid batches, auth/input keys.
- `src/services/__tests__/publicIdentityService.test.js`: 6 tests for sequential 30-call batching, empty history, account change, sign-out, truthful error/no raw fallback and owner-only block request.
- `src/screens/main/__tests__/privacyIdentityUi.test.js`: 7 tests for incoming identity request/no call mutation, retry, late previous-account rejection, owned unblock, blocked-list retry, Calls hydration retry and blocked historical navigation denial.
- `src/services/__tests__/userPrivacy.emulator.cjs`: 72 checks of current rules plus real backend projections and sentinels.

Updated:

- `followHelpers.test.js`: mock protected capability in existing follow tests, assert only owner raw get; 2 added live-listener/cleanup tests. Existing role/schema/idempotence/ownership assertions retained.
- `messagingOpen.test.js`: mock message projection instead of raw recipient existence; existing deterministic/new conversation/no-write assertions retained.
- `messageEntitlementUi.test.js`: mock message identity with actual name/protected capability rather than raw target. Existing messaging retries/economics/header affordance assertions retained.

No pre-existing arbitrary raw-read assertion was removed. A new Jest array-valued parameter table initially registered an empty row as a done-callback test; the table was corrected to wrap each callIds value. Final full suites pass. The expected Amira Identity unavailable warning in an existing failure-path test remains.

## 30. Final root Jest totals

`npm test -- --runInBand`: **58 suites passed, 528 tests passed, 0 failed, 0 snapshots**; final run 32.790 seconds. Root Jest includes Functions unit tests, so these totals must not be summed with standalone Functions. The initial existing-only run passed 55 suites/487 tests before new test discovery; the final complete run supersedes earlier intermediate results.

## 31. Standalone Functions totals

From `functions`, `npm test -- --runInBand`: **11 suites passed, 264 tests passed, 0 failed, 0 snapshots**; final run 7.736 seconds. Baseline standalone suite also passed 10 suites/238 tests; the added suite supplies 26 tests.

## 32. Exact emulator suite results

All suites used current edited `firestore.rules`, Firestore emulator v1.19.8 at `127.0.0.1:8289`, isolated demo namespaces, with successful exit status:

| Suite | Result |
| --- | --- |
| `userPrivacy.emulator.cjs` | 72 checks passed |
| `creatorRoleRules.emulator.cjs` | 40 checks passed |
| `levelRewards.emulator.cjs` | 53 checks passed |
| `hostDiscovery.emulator.cjs` | 47 checks passed |
| `hostActivity.emulator.cjs` | 82 checks passed |
| `hostConnect.emulator.cjs` | 68 checks passed |
| `amiraIdentity.emulator.cjs` | 58 checks passed, including concurrency/security |
| `socialMessaging.emulator.cjs` | 69 checks passed |
| `followRules.emulator.cjs` | Passed both directions, role/ownership/schema denials, blocking, recipient-only query, live count and unfollow; script prints no assertion total |
| `rewardsRules.emulator.cjs` | 32 checks passed |
| `callRecoveryRules.emulator.cjs` | 24 checks passed |
| `functions/src/__tests__/callRecovery.emulator.cjs` | 9 real transaction-race assertions passed |

The three older suites hard-code port 8189/static project IDs. They were evaluated through an in-memory Module adapter replacing only the port with 8289 and adding unique privacy-regression project suffixes. Their test assertions/files were unchanged. Expected permission-denied diagnostics in the original call rules script are passing negative cases, not failures. Only the task-owned emulator is stopped after validation.

## 33. Babel/static parse

Babel `@babel/parser` with JSX and unambiguous source type parses all `.js`/`.cjs` under `src`, `functions/src`, `shared`, plus root `App.js`. Final count: **231 files**, no syntax errors. No generated/dependency files counted. Initial 230-file parse preceded the final new UI test file; final parse includes it.

## 34. Diff check and manual review

`git diff --check` passes. Git's LF-to-CRLF repository normalization notices are not whitespace errors. Complete source/rules/test changes and new projection/test files were manually inspected after tests; final report/status artifacts are also reviewed. Raw path/get/snapshot/collection-group/helper searches were repeated. No raw-profile spreading occurs in new backend projections. Existing spreads of already-safe projections and private owner normalization remain appropriate.

## 35. Performance and query bounds

Existing Consumer discovery/Connect candidate pools: 60; Activity source/merged result bounds retained; profile views: 100; Calls history: 200; inbox ordinary list: 100; notices: 100. Existing all-inbox unread model was not redesigned.

New call requests: at most 30 distinct call IDs per callable, sequential client chunks; grouping selects one latest call per contact, yielding at most 200 contacts/7 identity requests from the existing 200-record history. Each item reads a call (optional history fallback), actor/target profiles and two block refs; no global users query. Presence remains existing separately bounded reads from known inbox/call participants, not raw hydration or fabricated status.

Owned blocked list: one name-ordered query limited to 50 source block documents, one actor read and at most 50 target reads. No pagination added. Relationship/message capability operations involve fixed single-pair reads. Full-profile/chat relationship subscription has five listeners (one owner raw, four relationship docs), not target raw and not per-card listeners. Capability refresh occurs on completed subscription and relevant confirmed listener changes; it has no polling loop. Snapshot bursts can cause multiple fixed-pair refresh requests; superseded results are ignored. No unrestricted public identity bulk endpoint or unbounded new client user query.

## 36. Migration, backfill and index requirements

No migration/backfill or new index required. New block listing uses existing document-name ordering; call/message/relationship identity uses direct record refs. Previous approved Host discovery/history/follow/profile-view indexes remain as already defined. No production operation executed. A future reviewed release must coordinate new callables/client/rules: deploying only the read rule with an old client would break the unsafe legacy lookups, and the repository changes have not changed currently deployed production access.

## 37. Remaining privacy limitations

- This is locally validated repository code, not deployed enforcement. Production retains its currently deployed rules until a separately reviewed release.
- Public names/photos intentionally remain visible through authorized role/message/call/block contexts. Known historical participant-only identity may remain readable after block; new interaction is disabled and existing backend interaction checks remain final authority. Owned-block management is a deliberate minimal identity exception.
- Identity/capability callables provide snapshots, not live target-user listeners. Refocus/retry/relationship changes refresh relevant state; a target role/photo change alone may not instantly redraw an already focused surface. No stale financial/private fields are cached. Actual follow/message/call authorization rechecks protected state.
- Calls-tab interaction flags are snapshots; a subsequent block is still enforced by existing chat/call backend and relationship listeners. Deleted/malformed/unavailable call records can reject a batch and show retry rather than fabricated empty/identity success.
- Block management considers the first 50 owned source records and omits missing/demo targets. Later records need future pagination; no incoming blocker profile disclosure. No account deletion/recycling system is added.
- Existing separate presence and participant conversation summaries remain readable under their existing rules. Historical conversation display metadata may be old; no profile-photo refresh/backfill or wider participant-data redesign was performed.
- No active general private-account/moderation visibility schema or push-token user writer was found. Future such features must retain allowlists and add explicit context authorization; injected unknown private fields already remain excluded.
- Existing owner update protections were preserved, not replaced with a comprehensive schema validator. Owner-private unsupported fields stay private; financial/approval/identity authority cannot be inferred from a client display capability.
- Physical devices, released clients, actual Firebase deployment, Agora/media/network latency and production index behavior were not exercised.

## 38. Future physical validation checklist

- Consumer and approved Host sign-in, quick login, Google/OTP flow as configured, account switch/sign-out, own profile/bootstrap/Amira ID and settings.
- Normal Edit Profile and constrained failure when trying protected fields; Storage-gated photo controls remain truthful.
- Creator draft/submission/review state and trusted permanent Host transition, shell and owner Earnings.
- Consumer For You/New/Following filters, approved Host full profile/rate/availability/public ID; Host Connect/Following, pending applicants, full Consumer profile and separately authorized Level/public ID.
- Live follow both ways, Friends event once, unfollow breakup, both block directions/cleanup, owned blocked rows/unblock/retry; review >50 blocked-account limit.
- Messages inbox/unread/notices, current projected chat name, no Level/VIP/Friends header badges, identity failure/retry, account/route/role change while requests are pending, Host free sends and unchanged Consumer Chat Pass behavior.
- Incoming video caller photo/name/retry and unchanged accept/decline/ring expiry; historical Calls grouping/presence/block navigation and role transitions. Review omitted optional country label.
- Existing connected-time/reconnect/settle/end/recovery/Busy restoration flows with prior authoritative accounting checklist, without changing timings/economics.
- Profile-view pair dedup/Host Visitors/Today counts and Consumer count-only result even with legacy VIP; compact surfaces without Amira ID/Level.
- Reviewed release compatibility and cold/offline/error states once callables/client/rules are coordinated. No arbitrary UID/raw user or reservation get/listen/query succeeds from ordinary credentials.

## 39. No external mutation or Git operation

No deploy, stage, commit, push, billing activation, Firebase Storage activation, production Firebase mutation, production migration/backfill, or outbound message. All fixtures and destructive cleanup were restricted to task-owned localhost emulator data/processes. HEAD remains `1ba2799`; changes are unstaged for user review. Final complete git status is saved separately.

## 40. High-risk call recovery, accounting and economics unchanged

Zero edits to call recovery/accounting/payment/connection/RTC/domain source, callService, callHistoryService, callNavigationService, messaging entitlement/economy domain, Rewards/Level/Host earnings economics. `index.js` adds independent identity exports only. IncomingCallCard's accept/decline handlers and ring timeout timer are unchanged. MessageHome changes display identity and account cleanup, not call lifecycle. Recovery races, call rules and all relevant root/Functions economics regressions pass.

## 41. Deferred systems unchanged

No implementation/redesign of VIP/purchases, Paystack/recharge verification, purchased-versus-bonus ledger, paid messaging economics, Gifts/settlement, Quick Match/invites, Stories/Moments publishing, Storage, translation provider, audio calls, paid automatic continuation, ring/reconnect/billing changes, Level thresholds, earnings economics, Amira ID search/QR, account deletion/recycling, or Creator approval dashboard. Gating the dormant fabricated FreeNow banner introduces none of these systems.
