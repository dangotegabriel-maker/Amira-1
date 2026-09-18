# Host Activity + Profile Views + Social Relationship Cleanup

## 1. Baseline commit

Branch `amira-v2`, commit `76ccf3a` (`feat: improve consumer discovery and host profiles`). Working tree was clean before this batch. Work was local only.

## 2. Exact files modified/new

Modified:

- `firestore.rules`
- `functions/src/index.js`
- `functions/src/socialMessaging.js`
- `functions/src/__tests__/callPaymentLifecycle.test.js`
- `functions/src/__tests__/socialMessaging.test.js`
- `src/screens/host/HostActivityScreen.js`
- `src/screens/host/HostVisitorsScreen.js`
- `src/screens/main/MyProfileScreen.js`
- `src/screens/main/UserProfileScreen.js`
- `src/screens/main/WhoViewedMeScreen.js`
- `src/screens/main/__tests__/consumerLevelVisibility.test.js`
- `src/screens/main/__tests__/discoveryProfileUi.test.js`
- `src/services/profileViewService.js`
- `src/services/__tests__/messageEntitlementClient.test.js`
- `src/services/__tests__/socialMessaging.emulator.cjs`

New:

- `functions/src/hostActivity.js`
- `functions/src/hostActivityDomain.js`
- `functions/src/profileViews.js`
- `functions/src/__tests__/hostActivityDomain.test.js`
- `src/services/hostActivityService.js`
- `src/services/__tests__/hostActivityService.test.js`
- `src/services/__tests__/hostActivity.emulator.cjs`
- `src/screens/host/__tests__/hostActivityUi.test.js`
- `src/screens/main/__tests__/profileViewTrackingUi.test.js`
- `docs/host-activity-profile-views-report.md`
- `docs/host-activity-profile-views-git-status.txt`

## 3. Existing Activity/profile-view architecture found

Activity previously contained two route cards rather than a combined feed. The old Visitors route hydrated entire Consumer profiles and presence for every row, sorted online users before visit time, and supplied a fallback name. Existing backend profile tracking already used one document per owner/viewer pair and a 30-minute backend dedup window, but accepted unsupported role directions and had no direction/provenance marker. Tracking started alongside profile loading, potentially before a successful full-profile load. Consumer Who Viewed Me and direct Firestore rules could reveal identities from legacy active VIP flags. Those reveal paths have been removed.

The existing authoritative Likes, both follow directions, derived mutual Friends, atomic block cleanup, finalized call history, public-photo helpers, full-profile screen and conversation route were reused. No duplicate social or Activity collection was created.

## 4. Final Activity tabs

Exactly `All | Visitors | Likes | Followers | Gifts | Calls`, approved Hosts only. Existing Host shell remains `Connect | Messages | Activity | Profile`; Consumer shell remains `Home | Match | Messages | Profile`. Pending applicants remain Consumers. Navigation shell and permanent approval transition were not modified.

## 5. All feed data sources and ordering

All merges validated Visitors, current Likes, current Followers and proven finalized Calls. No Gifts. Events require a valid actor, supported type and trustworthy timestamp; missing/demo actors and actors without a real display name are omitted. Sorting is timestamp descending with event-ID lexical tie-breaking. Followers use Consumer UID in their event ID to avoid collisions between follow documents whose document ID is the same Host UID. Invalid/future/numeric/string/missing timestamps are omitted rather than replaced with now.

## 6. Visitor data model

Reuse `users/{ownerUid}/profileViews/{viewerUid}`. Server writes `ownerUid`, `viewerUid`, `direction`, `profileViewVersion: 1`, `firstViewedAt`, `lastViewedAt`, and `viewCount`. Directions are `consumer_to_host` and `host_to_consumer`. There is one latest visible record per pair, not an append-only event stream. The existing protected stats counter is retained for compatibility but is not trusted for UI counts.

## 7. Exact 30-minute dedup implementation

Within a Firestore transaction, read both profiles, both block directions and the existing pair record before writing. Auth supplies the viewer UID. Eligibility and dedup use backend time only; writes use `FieldValue.serverTimestamp()`. For a verified record, elapsed time less than `1,800,000` milliseconds returns `counted: false` without a write. At or after the boundary, update that same document, preserve a valid first timestamp and increment its count. Transaction retries serialize concurrent opens. Unsupported directions and blocked/missing profiles are denied; demo/incomplete profiles return false; self-view returns false. No client clock or forged viewer UID is accepted by the callable.

## 8. What counts/does not count as a profile visit

App tracking occurs on the focused, successfully loaded existing FULL profile, with matching target UID, eligible roles, no self-view/demo/block. A stable rerender does not retrack; a genuine later open/refocus can retrack subject to backend dedup. Home/Match/Connect cards, stories, message threads, discovery/search appearances and backend profile fetches do not invoke tracking. The callable requires `context: full_profile`; this is request validation, not attestation that pixels were displayed. The backend independently verifies actor, target, roles, blocks and time.

## 9. Likes source and behavior

Read `users/{hostUid}/likes/{consumerUid}` with validated Host/Consumer fields and server `createdAt`. One relationship per pair; newest first within the bounded page. Unlike deletes the relationship and disappears on refresh. Existing transactional Like creation and sender/ownership rules remain intact. Like does not imply Follow, Friends or a messaging entitlement.

## 10. Followers source and behavior

Reuse `users/{consumerUid}/following/{hostUid}` containing `consumerId`, `hostId`, and server `createdAt`. Query the existing `following` collection group by authenticated Host ID; additionally validate the path and fields. Show only currently existing, unblocked Consumer relationships and sort trustworthy timestamps descending. Unfollow disappears on refresh. No new follower count/model or Activity Follow control was added; full-profile Follow remains available.

## 11. Calls source and authoritative fields

Read existing `callHistory` for authenticated participant UID using its existing created-time index, then verify the matching primary `calls/{callId}` document. Require matching caller/receiver/two participants, Host as receiver, history `status: ended`, genuine connected/end timestamps, positive integer saved `durationSeconds`, primary `accountingVersion: 2`, ended call/connection, and saved `connection.connectedMs` flooring to the same saved duration. Display the persisted connected duration and history end timestamp. Ringing/missed/failed, legacy version-1, missing-primary and inconsistent records are omitted. No Credits, rate or earnings appear in Activity. This reader never settles, reconciles, ends or updates a call, lock, wallet or earnings record.

## 12. Gifts behavior/deferred state

Gifts remains a tab with `No gift activity yet.` No trustworthy settled commercial Gift source was found. No promotional entitlements, old client ledgers or legacy GiftTray records are treated as commercial events. Gift settlement and catalogue economics remain deferred.

## 13. Activity public Consumer projection

Activity actors contain only UID, actual display name, existing safe public HTTPS photo and country code. Rows contain no Level, VIP, Friends or financial metadata. Backend full Consumer profile projection additionally returns valid derived age, controlled gender, public bio/interests/gallery and role flags needed by the existing screen. It does not return raw DOB, email, phone, wallet, purchased/Level qualifying totals, earnings, payout data or Creator application documents. Level remains a separate existing authoritative full-profile request.

## 14. Message behavior

Message navigates to existing `ChatDetail` with Consumer UID/name. Existing Host messaging stays free; it does not grant a Consumer free reply. No entitlement economics changed. Current block state makes Activity messaging unavailable; the existing send backend independently enforces blocks and entitlements.

## 15. Invite audit and final behavior

No safe authoritative sponsored-invite backend was found; existing Host dashboard references were future placeholders. Invite is disabled, labelled as coming later for accessibility, with restrained feed copy explaining deferred video invites. It has no press handler, fake toast, fake invitation record or call-start effect. Sponsored accounting, anti-spam and busy-call behavior remain deferred.

## 16. Consumer -> Host profile-view behavior

Only actual Consumers (including pending applicants) viewing an approved Host through the loaded full-profile path generate direction-A views. Approved Hosts cannot use that direction by viewing another Host. Unapproved targets, either block direction, demo/incomplete profiles and self-view do not create valid visible activity. Valid direction-A latest-pair records populate Visitors and All.

## 17. Host -> Consumer foundation

An approved Host opening a Consumer full profile records direction B in the same bounded pair model, with server time and the same dedup window. Consumer identity access is not unlocked. The existing Host full-profile branch now fetches a backend public projection rather than a raw Consumer document. Authenticated actor ownership cannot be supplied through a viewer UID parameter.

## 18. Current Who Viewed Me UI without VIP

Consumer UI requests only its own count: up to 100 validated unique recent Host viewers from the bounded latest-record query, after role/demo/block filtering. This is not a lifetime count or repeated-open total, and has no fixed calendar-window meaning. Positive counts show `Viewer identities are coming later.` Zero, loading and retryable errors are distinct. No actual Host identities, fabricated blurred people/photos, VIP purchase or identity unlock appear, even with stored active VIP flags. My Profile uses a neutral label when count is unknown instead of inventing zero.

## 19. Follow/Friends regressions and fixes

Both existing follow directions and derived mutual-follow = Friends remain unchanged. Existing friendship event/grant idempotency, silent end on unfollow, and block breakup remain intact. Host Profile Following continues to represent Consumers followed by that Host. Activity integration fixes the follower event-ID collision and reuses existing full-profile relationship state/actions. Friends and Level badges are absent from Activity and remain in their existing permitted full-profile placements. Conversation/card behavior was not redesigned.

## 20. Block behavior and historical treatment

Both block directions filter Visitors/Likes/Followers and count-only Consumer view counts; new profile-view recording is denied. Existing atomic block cleanup deletes reciprocal Follows and Likes and ends current Friends; historical friendship grants are retained and are not treated as current friendship. Profile-view documents remain historical but hidden while blocked, so unblocking can reveal an eligible historical latest visit. Deleted Likes/Follows do not automatically reappear. Legitimate blocked Calls remain historical with Message and profile navigation disabled. Missing/demo actors are omitted. Existing authoritative message/call/discovery safeguards remain unchanged. Deferred Gifts, Quick Match and sponsored invites were not rewritten or claimed complete.

## 21. Activity refresh/realtime strategy

Bounded snapshots on focus, selected-tab change, retry and pull-to-refresh; no per-row Firestore/presence listeners. Request versions ignore stale/unmounted responses. One focused-screen interval updates relative time every 60 seconds and is cleared on blur/unmount. Existing full-profile relationship subscriptions retain their existing cleanup. Activity does not write read state on fetch.

## 22. Bounds/pagination limitations

Activity sources each query at most 50 records; All merges at most 200 candidate records and returns at most 50 events. Actor hydration is shared per unique actor in that request. Consumer view count query is capped at 100 before filtering. Pagination is not implemented. Followers use the existing indexed Host-ID query with a 50-document bound before chronological sorting, so that sample is not guaranteed to be the globally newest 50 followers. Calls sample the latest 50 by creation time and sort accepted results by end time, so exceptionally old-created/recent-ended calls outside that sample may be missed. Filtering may yield fewer than the limit without fetching replacement pages. These are bounded recent snapshots, not exhaustive activity/counts.

## 23. Rules/index changes

The sole rules change tightens `canReadVisitorIdentities` to approved Hosts. Consumer direct profile-view reads are denied even with legacy VIP flags; existing owner-Host-only metadata reads remain. Profile-view create/update remain denied to clients. No rules were broadened. No index file changed: existing callHistory participant-array/created-time and following Host-ID indexes are reused; normal subcollection timestamp queries use existing single-field indexes.

## 24. Security/privacy implications

New Activity callable binds owner to authenticated UID, validates its tab-only request and requires protected approved-Host status. Consumers, pending/unapproved Hosts and owner-spoof parameters are denied. Public Consumer profile callable independently checks approved actor, Consumer target and both blocks. Profile-view callable rejects spoofed actors/client clocks/non-full-profile contexts; list callable rejects alternate owner parameters. Consumer responses and direct Firestore queries cannot reveal private view identities. Private projection fields are never returned. Protected approval, Level totals, earnings and rates remain protected. The separate broad `users` read issue is unchanged; this batch reduces raw-profile hydration without claiming that larger issue is solved. Snapshot actions can become stale between refreshes; existing operation backends/rules remain the final authority.

## 25. Exact tests added/updated

New Jest suites:

- `hostActivityDomain.test.js`: 20 cases for exact tabs/order, role directions, public projections, conservative read-only call proof and untrusted timestamps.
- `hostActivityService.test.js`: 1 case for safe client payloads without owner identity.
- `hostActivityUi.test.js`: 7 cases for six tabs, access, compact rows, profile/message navigation, disabled Invite, empty/error/retry states, blocked calls, legacy Visitors route and count-only Who Viewed Me.
- `profileViewTrackingUi.test.js`: 3 cases for card versus loaded full profile, loading/failure omission and opposite-direction full profile with retained Level.

Updated Jest suites: `socialMessaging.test.js` tightens role directions and Consumer identity privacy while retaining dedup/Friends/message assertions, and uses Firestore-like Date timestamps with a realm-preserving mock clone; `callPaymentLifecycle.test.js` adds 1 auth/ownership/context/clock case; `messageEntitlementClient.test.js` expects full-profile context; existing Consumer Level/discovery profile suites mock the new public Consumer adapter.

New `hostActivity.emulator.cjs` validates real emulator relationships, concurrent dedup/Likes, server timestamps, direction eligibility, privacy/rules, chronological merge, Calls, bounds, actions/economics and both block directions. Existing `socialMessaging.emulator.cjs` updates only the obsolete active-VIP Consumer identity-reveal expectations to denial/count-only behavior.

## 26. Exact final test totals

Full root Jest: **50 suites, 451 tests passed**, zero snapshots. Standalone Functions: **9 suites, 224 tests passed**, zero snapshots; these backend tests overlap root totals and are not additional distinct tests. Static Babel parse: **211 JS/CJS files** across `src`, `functions/src` and `shared`. `git diff --check` passed. Focused runs were used during implementation; initial timestamp-mock/text-encoding failures were corrected and covered by final passing validation.

## 27. Exact emulator results

| Local suite | Result |
| --- | --- |
| New Host Activity/profile views | 82 checks passed |
| Creator role/earnings | 40 checks passed |
| Level/rewards | 53 checks passed |
| Discovery/profile | 47 checks passed |
| Existing social/messaging | 69 checks passed |
| Existing follow rules | Passed; suite does not print a numeric total |
| Existing rewards/economy rules | 32 checks passed |
| Call recovery transaction race | 9 assertions passed |

All ran against task-owned Firestore emulator localhost `127.0.0.1:8289` with current rules and isolated demo namespaces. Existing social/follow/rewards scripts that hardcode 8189 were run through an in-memory Node Module wrapper replacing only port and demo namespace; their actual assertions ran. Test fixtures were isolated emulator data, not product seed/demo activity. No deployed or physical validation occurred.

## 28. Migrations/backfills/index requirements

No production migration, backfill or new index is required for this local implementation. Unmarked legacy view records are omitted because the old writer accepted unsupported contexts/directions. A new genuine eligible full-profile open lazily replaces its existing pair record with verified metadata and a new server first/last timestamp/count of 1. Old counts/timestamps are not rebranded as verified visits. A coordinated future release must deploy backend/rules/client together before these new local callables can function remotely; no deployment was performed here.

## 29. Remaining limitations

No settled Gifts, sponsored Invite lifecycle, VIP identity reveal, Activity unread model/badge, pagination, Stories viewer integration or Storage uploads. No fabricated activity/counts. Bounded sampling/count limitations are described above. Full-profile context is not device-display attestation. Legacy/unproven calls and visits may be absent. Existing broad user-read permissions remain a separate project. Physical layout, touch targets, network behavior and real-device routing require later validation. Call accounting/recovery, Level thresholds, rewards economics, permanent approval, navigation shell and deferred commercial lifecycles remain unchanged.

## 30. Future physical validation checklist

Pending; not performed:

1. On separate Consumer/approved-Host devices verify exact role tabs and deny pending/Consumer Activity routes.
2. Open Home/Match/Connect cards without full profiles and verify no view; open full profiles in both directions and verify server-visible visit/count, same-pair dedup, later-window refresh and no effect from client clock changes.
3. Verify Activity tab/focus/pull refresh, loading/error/retry, all six truthful empty states, chronological ties and no unread badge.
4. Like/unlike/follow/unfollow across devices and refresh Activity; verify current relationships, mutual Friends/full-profile labels and no Activity/card/header badges.
5. Verify identity/avatar opens existing Consumer full profile with authoritative Level; Message opens existing chat, Host send is free and Consumer reply still requires entitlement.
6. Block in each direction; verify social rows/counts disappear, new views fail, current actions remain blocked and genuine historical call rows remain disabled.
7. Use genuine completed v2 calls to verify saved connected duration/end time; ensure ringing/failed/unproven calls do not appear as completed and no Activity fetch changes settlement/locks/earnings.
8. Verify disabled Invite never sends/succeeds, Gifts remains empty, and Consumer Who Viewed Me reveals no identities/purchase/blur even with legacy VIP fields.
9. Verify failed photos use initials, relative time updates with one screen timer, rapid tab changes ignore stale responses, and blur/unmount leaves no Activity timer/listener work.

## 31. No external mutation confirmation

No deploy, stage, commit, push, production Firestore mutation, billing activation or Storage activation occurred. Changes remain local and unstaged on baseline `76ccf3a`. Diff scope and whitespace were inspected. The task-owned emulator was used only for local test data and is stopped after validation. Git status is captured in `docs/host-activity-profile-views-git-status.txt`. No physical or deployed validation is claimed.
