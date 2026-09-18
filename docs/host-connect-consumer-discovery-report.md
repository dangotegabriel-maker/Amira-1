# Checkpoint 6: Host Connect + Host-side Consumer Discovery

## 1. Baseline commit

`amira-v2`, commit `6b95d68`. Working tree was clean before implementation. Remote state was not changed; the user reported synchronization with origin.

## 2. Exact files modified/new

Modified:

- `firestore.rules`
- `functions/src/index.js`
- `functions/src/__tests__/callPaymentLifecycle.test.js`
- `src/screens/host/HostDashboardScreen.js`
- `src/screens/main/__tests__/consumerLevelVisibility.test.js`
- `src/services/discoveryService.js`
- `src/services/firebaseService.js`
- `src/services/__tests__/creatorRoleRules.emulator.cjs`
- `src/services/__tests__/discoveryService.test.js`

New:

- `functions/src/hostConnect.js`
- `src/services/hostConnectService.js`
- `src/screens/host/__tests__/hostConnectUi.test.js`
- `src/services/__tests__/hostConnectService.test.js`
- `src/services/__tests__/hostConnect.emulator.cjs`
- `docs/host-connect-consumer-discovery-report.md`
- `docs/host-connect-consumer-discovery-git-status.txt`

## 3. Existing Host Connect architecture found

The existing approved-Host `HostDashboardScreen` already supplied Connect, For You/Following and a two-column Consumer grid. It used client-side raw `users` reads, role-string filtering, outgoing-only block filtering, and potentially unbounded hydration of followed IDs. Pending profiles carrying a legacy Host role could be missed. Cards had immediate Message controls. A total-follower subscription and profile-media readiness panel added dashboard clutter.

Today used `user.hostMetrics.today` with fallback zeros for Calls, Call Time and Earnings without authoritative derivation. Availability defaulted to Offline when absent. The existing direct-write adapter and rules allowed approved Hosts to set Busy and overwrite availability independently of call locks. Call accept/recovery already owns Busy, pre-call availability and restoration; those sensitive implementations were retained unchanged. No safe Story composer/publisher or authoritative sponsored-invite backend was found.

## 4. Final Connect screen structure

Existing Connect screen: real own Host identity, normal avatar when present, disabled Add Story beside it, Online/Offline control with truthful loading/unavailable/Busy states, one compact Today metric, exactly `For You | Following`, and compact two-column Consumer cards. No Visitors feed/tab, Search, analytics dashboard or fake people. Removed unsupported metrics, total-follower subscription, immediate card Message buttons and media-readiness panel. Navigation remains Host `Connect | Messages | Activity | Profile` and Consumer `Home | Match | Messages | Profile`; pending applicants remain Consumers and approval remains permanent.

## 5. Availability source/model

Reuse protected `users/{authUid}.hostStatus.availability`, existing `activeCallLocks/{authUid}`, and existing call-controlled `preCallAvailability`. New authenticated `getHostAvailability` returns the real state or null and whether a toggle is currently permitted. UI refreshes on focus/pull, identity/role change and existing UserContext availability changes. Incoming-call subscription remains the existing service and is now scoped to focused approved Hosts with real Online state.

## 6. Exact Online/Offline update behavior

`setHostAvailability` accepts only `{availability: online|offline}`. Auth supplies owner UID; owner/clock/other keys are rejected. Within one transaction, read the protected approved-Host profile and its existing call lock before updating only availability. Missing/demo/nonapproved profiles are denied. Unknown availability is unavailable, rather than silently repaired or treated as Online. UI uses an immediate ref lock plus disabled switch to suppress rapid duplicate toggles, waits for backend success, and reconciles with a fresh availability read after failure. Failed reconciliation displays unavailable with retry; no optimistic success or fabricated Online state.

The existing `dbService.updateHostAvailability` entry point delegates to the same callable adapter so it cannot bypass the transaction.

## 7. Busy protection and call-system interaction

Clients cannot request Busy. Existing Busy or any existing Host call lock prevents an ordinary toggle, including a ringing/stale lock until the existing call recovery owns its cleanup. Transaction reads conflict with concurrent changes to the Host or lock. Emulator race verifies a concurrent system Busy/lock transaction remains Busy with its lock preserved. Direct client availability/pre-call writes are denied by tightened rules. Call accept, lock creation/recovery, timeout, connected accounting, settlement and pre-call Online/Offline restoration were not edited. Admin/system paths retain their existing access. This helper never deletes/reconciles a lock or mutates a call.

## 8. Today metrics shown and exact semantics

Only `Recent visitors today`. Reuse Checkpoint 5 `listProfileViews` validation: current owner-approved Host, verified `consumer_to_host` marker, owner/viewer matching, trustworthy server timestamp, real current Consumer actor and both-direction block exclusion. From its latest 100 pair records, count valid last-view timestamps at or after UTC midnight and at or before backend now. UTC boundary is `now - now % 86,400,000`.

This is a bounded snapshot of unique current eligible latest-pair Visitors today, not total profile opens, immutable historical analytics or a lifetime count. Repeated within-window opens do not inflate it; latest eligible later opens can refresh it. Loading, true zero and unavailable/error have separate UI states and retry.

## 9. Today metrics deliberately omitted and why

Calls and Call Time are omitted to keep Today small and avoid presenting limited Activity samples as exhaustive daily analytics. Existing conservative read-only proven Activity Calls remain separate and unchanged. Earnings, Gifts, conversions, invite acceptance, Quick Match, Story views and VIP analytics lack an appropriate implemented authoritative source and are omitted. Likes/new Followers could support current-relationship snapshots but were deliberately left in Activity rather than added as analytics. No fake zero metrics remain.

## 10. For You eligibility

Approved Host actor only, verified using protected approval rather than role strings. Candidate must have a real nonblank display name, `isProfileComplete: true`, be a Consumer under existing protected-approval truth, not self, not marked demo, and unblocked in both directions. Pending applicants remain eligible even with legacy `role: host`; approved targets are excluded even if a legacy role says Consumer. Invalid DOB/photo/country fields are omitted from display, not replaced with fake values. No Host-side authoritative hide preference exists; the Consumer-to-Host `discoveryHidden` model is not incorrectly reused.

## 11. Exact For You ranking

After filtering the bounded candidate pool, matching valid country with the current Host scores 1; other profiles score 0. Sort score descending, UID ascending as deterministic tie-break. If Host country is absent/invalid, sort by UID only. Country uses ISO-like recognized region validation and excludes unknown/pseudo regions; UI resolves country/flag through the existing catalogue. No inferred sensitive traits, language guesses, finances, Level, VIP, Friends, popularity or private application data influence ranking. Compatibility outside the candidate pool is not considered.

## 12. Following source/direction

Reuse `users/{hostUid}/following/{consumerUid}` with `sourceId`, `targetId`, `sourceRole: host`, `targetRole: consumer`. Validate fields/document identity, then fetch only that bounded set of target profiles. Apply the same Consumer eligibility and bidirectional blocks; sort by UID. No Consumer-to-Host followers are substituted. Unfollow removes a row on refresh; approval of a target removes it from Consumer discovery even if an old follow document remains. No second follow/Friends model or fake count.

## 13. Consumer compact projection

Reuse Checkpoint 5 public identity/derived-age/controlled-interest/public-photo helpers on the backend. Return only `uid`, `username`, `profilePic`, `countryCode`, `age`, `bio`, `interests`. Photos must be existing public HTTPS references. Invalid/missing age is null; unknown or malformed country is empty. Raw profiles are never returned to Connect. Excluded: email, phone, wallet, balances, spending, purchased Credits, qualifying totals, Level, VIP, earnings, payout, raw DOB, application/verification/private settings. Backend reads a bounded set of existing profiles; full-profile projection remains separate.

## 14. Exact Consumer card fields/actions

Public photo or actual-name initial, actual display name, valid derived age if available, existing catalogue country/flag if available, and concise public bio or up to two controlled interests. Image failure falls back to that person's initial. No invented name/age/country/photo, availability/presence indicator, Level/VIP/Friends badge, financial/private data or per-card presence listener. One card tap opens existing `UserProfile` with Consumer UID. No Message/Invite/Gift commercial shortcut or entitlement side effect on cards.

## 15. Full Consumer Profile integration

Existing Checkpoint 5 full Consumer profile and backend `getPublicConsumerProfile` remain unchanged. They independently validate approved actor, Consumer target and both blocks. Existing full-profile Follow/Following/Friends, Message, report/block and authoritative Level behavior are preserved. No duplicate mini-profile or new profile model was added. Backend remains final authority when a Connect snapshot becomes stale.

## 16. Profile-view tracking behavior

Connect card rendering and navigation do not write a view. Successfully loaded focused full Consumer profile retains Checkpoint 5 authenticated `host_to_consumer` tracking, server timestamps, one latest record per pair and 30-minute dedup. Existing full-profile tests cover card versus successful load, failed/loading omission and opposite direction. Existing Host Activity emulator retains self/block/direction/dedup/privacy protection. No duplicate manual tracking from Connect.

## 17. Level placement/regression

Level remains visible only in the permitted existing Host view of a full Consumer profile, via authoritative Level service. Compact Connect and Activity rows and conversation headers do not receive it. Level/qualifying totals are absent from compact projection and ranking. Level accounting and thresholds were not changed; existing placement and security suites remain green.

## 18. Friends/follow behavior

Existing both-direction Follow, mutual Follow = Friends, idempotent friendship event/grant, silent end on unfollow and block breakup are preserved. No friend request or alternate friendship model. Friends remains an appropriate full-profile label, not a Connect/Activity/card/header badge or commercial ranking factor. Host Profile Following is unchanged. Emulator tests verify correct direction, unfollow disappearance, target transition exclusion, and existing mutual/block behavior.

## 19. Block behavior

For You and Following check both existing block documents. Blocks disappear on focus/pull/tab refresh without app restart. Existing atomic cleanup removes reciprocal Follows/Likes and current Friends. Full profile/view recording, messages and calls retain their existing independent final safeguards. Historical Activity Calls behavior is unchanged. No deferred Gift/Quick Match/sponsored enforcement was invented or claimed complete.

## 20. Add Story audit/final gated behavior

No Add Story composer route or safe Story publishing lifecycle was found; existing Story viewer/Moments UI and gated media upload service do not establish a safe composer. New approved-Host Add Story affordance is disabled with `Coming later`. It checks `EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS === true`: when false/unconfigured its accessibility label states uploads unavailable; when true it remains coming later because publishing is still absent. Enabling that flag alone cannot publish. No picker/upload invocation, Storage activation, fake toast/document/URL/base64/local Story, active Story ring, analytics or Moments upload. Both flag values are tested.

## 21. Invite status

No authoritative sponsored-invite backend; remains deferred. Connect cards have no Invite action and do not start calls or create invitation records. Existing full-profile and Activity behavior is preserved. Sponsored duration/accounting/anti-spam/busy-call economics are not implemented.

## 22. Gifts/VIP/Quick Match status

All remain deferred. No legacy GiftTray revival, Gift settlement/earnings, VIP badge/purchase/identity unlock/ranking, paid messaging or Quick Match entitlement consumption/reservation/lifecycle. Existing count-only Who Viewed Me and protected view identities remain unchanged.

## 23. Discovery refresh strategy

Bounded snapshots on focus, pull-to-refresh, tab change and explicit retry. Existing effect cancellation ignores stale For You/Following results and responses after blur/unmount. No per-card listeners/timers. Availability/Today snapshots likewise ignore stale responses; toggle request version avoids replacing newer reads, with a ref lock against rapid writes. Existing incoming-call subscription tears down on blur, role change or non-Online state. No Consumer presence fan-out. Availability flags may be stale until a refresh; the backend transaction remains authoritative.

## 24. Bounds/pagination limitations

For You reads at most 60 existing account documents ordered by document name before filtering/ranking. This intentionally does not trust role strings or require approval-field backfills; Hosts/demo/blocked/incomplete accounts can consume pool slots and matches outside it can be missed. Following reads at most 60 existing own-follow records before validation/hydration; targets beyond that bounded sample can be missed. No unlimited ID hydration remains. Filtered pages may contain fewer than 60 and do not fetch replacement pages. Today uses a latest 100-view-document sample before validation/counting and is labelled recent, not exhaustive analytics. Pagination and fair rotating/cursor candidate coverage remain future needs; this checkpoint does not claim a complete marketplace recommendation engine.

## 25. Rules/index changes

Remove the permissive `validAvailabilityChange` function/branch. Approved-Host clients must retain unchanged Host status in normal profile edits; Online/Offline uses authenticated backend. Existing Consumer applicant submission remains allowed under its original strict batch checks. This also closes client pre-call-state changes permitted by the old branch. No rules are broadened; broad signed-in `users` reads remain a separate project. No index files changed: document-name bounded account query, existing own-follow subcollection and single-field profile-view timestamp ordering need no new composite index.

## 26. Security/privacy implications

Four callables derive owner from auth: `getHostAvailability`, `setHostAvailability`, `getHostConnectConsumers`, `getHostConnectToday`. Validate exact allowed request keys; alternate owner/clock keys are rejected. Nonapproved/Consumer/pending/demo actors are denied. Approval truth and bidirectional blocks protect discovery; compact whitelist excludes private data regardless of profile contents. Busy/locks are read and respected, never forged/removed by toggles. Creator approval, Host rate, Level totals/earnings and view identities remain protected. Existing raw-user read permissions are neither expanded nor claimed solved. As with any snapshot, backend operations validate current eligibility again when a relationship changes after fetch.

## 27. Exact tests added/updated

Added `hostConnectUi.test.js` (9 cases): exact tabs/compact fields/full-profile route/no impression, two denied roles, rapid-toggle serialization, failed-update Busy reconciliation, independent error/zero/retry behavior, stale tab response, and two Add Story flag cases. Added `hostConnectService.test.js` (1 case) verifying owner/clock-free callable payloads. Added 1 `discoveryService.test.js` case for both authenticated Host discovery adapters. Added 1 `callPaymentLifecycle.test.js` case executing exported handlers for auth/owner validation, Busy rejection and lock protection. Updated existing Level placement test mocks for the new status/Today adapter without changing its assertions.

New `hostConnect.emulator.cjs` exercises real Firestore transactions/rules/fixtures for eligibility, ranking independence, safe field projection, invalid public attributes, both blocks, ownership, Following direction/unfollow/approval transition, UTC/current-view semantics, protected fields, direct availability/pre-call denials, and concurrent system Busy/lock creation. Existing Creator emulator replaces its obsolete direct availability-write success assertion with denial; its other assertions remain intact and new backend success is tested separately.

## 28. Exact final Jest/Functions totals

Final full root Jest: **52 suites / 463 tests passed**, zero snapshots. Standalone Functions: **9 suites / 225 tests passed**, zero snapshots; backend tests overlap root totals. Focused implementation run: **5 suites / 79 tests passed**. Babel static parse: **216 JS/CJS files** across `src`, `functions/src`, `shared`. `git diff --check` passed; final diff scope was reviewed and no unrelated changes were included.

## 29. Exact emulator results

| Local suite | Result |
| --- | --- |
| New Host Connect/availability/discovery | 68 checks passed |
| Creator role/earnings | 40 checks passed |
| Level/rewards | 53 checks passed |
| Consumer discovery/profile | 47 checks passed |
| Host Activity/profile views | 82 checks passed |
| Social/messaging | 69 checks passed |
| Follow rules | Passed; suite does not print a numeric total |
| Rewards/economy rules | 32 checks passed |
| Call recovery transaction race | 9 assertions passed |

Task-owned emulator `127.0.0.1:8289`, current rules, isolated demo project namespaces. Existing social/follow/rewards scripts hardcode 8189; an in-memory Node Module wrapper changed only port/demo namespace and ran their existing assertions. New fixture data exists only in the emulator, never as app seed/product records. Initial new-suite expectation that blocked friendship sync returns false was corrected to its existing permission denial. No physical/deployed validation.

## 30. Migrations/backfills/index requirements

None required for local implementation. No production migration/backfill occurred. For You scans a bounded account pool rather than requiring false-approval fields on legacy Consumers. Existing follow/view models are reused without migration. A later coordinated authorized backend/rules/client deployment is necessary to use the new callables remotely and avoid older clients relying on direct availability writes; no deployment performed here.

## 31. Remaining limitations

Bounded discovery can miss eligible profiles/follows; no pagination. Only bounded recent unique Visitors in Today; no daily exhaustive analytics. No Host-to-Consumer hide preference; richer report/block stays full-profile. Snapshot changes require refresh; operation backends are final authority. Unknown availability and lingering Busy/locks must be handled by existing call recovery, not a Connect bypass. Add Story stays disabled even with the upload flag enabled. Stories/Moments, VIP, Gifts, Quick Match and Invite lifecycles remain deferred. Broad users-read privacy remains separate. No physical layout/network validation claimed.

## 32. Future physical validation checklist

Pending, not performed:

1. Verify approved Host starts at Connect with exact shell; Consumer/pending stays on Consumer shell and cannot access Connect.
2. On real Host device test Online/Offline, update failure/retry, rapid toggles, incoming ring locks, accepted Busy and existing post-call availability restoration without accounting changes.
3. Use distinct real accounts to verify eligible/pending Consumers, approved target exclusion, compact fields/initial/image-failure behavior and no presence/Level/VIP/Friends badges or financial data.
4. Verify deterministic same-country preference/UID ties, truthful empty/error states, pull/focus refresh and fast For You/Following switches without stale rows.
5. Follow/unfollow and block both directions across devices; refresh and verify Following/For You removal, current Friends/full-profile behavior, message entitlement and backend block protection.
6. Verify card impressions create no views; actual successful full Consumer profile opens use existing view dedup and permitted authoritative Level.
7. Verify recent Visitors today matches UTC latest-pair semantics, real zero differs from failure, and no unsupported Calls/Earnings/Gifts metric appears.
8. Verify Add Story disabled with upload flag false/unconfigured and true; no publishing/upload/fake success/Story ring or active Storage path.
9. Verify blur/unmount cleans incoming-call subscriptions, no per-card presence listeners/timers exist, and request errors after navigation do not overwrite another screen/account state.

## 33. No external mutation confirmation

No deploy, stage, commit, push, production Firestore mutation, billing activation or Storage activation. Changes remain local and unstaged at baseline `6b95d68`. No call accounting/recovery source was modified. Task-owned emulator is stopped after local validation. Final status is captured in `docs/host-connect-consumer-discovery-git-status.txt`. No physical/deployed validation claimed.
