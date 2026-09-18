# Consumer Discovery + Host Profile Cleanup

## 1. Baseline and outcome

Branch: `amira-v2`. Clean starting commit: `08bde8f` (`feat: add consumer rewards cleanup and Amira Level foundation`). Initial `git status --short` was empty. Work completed locally on 2026-09-18.

Consumer Home retains For You / New / Following and its two-column grid, now using real approved Hosts without demo fallbacks. New uses a protected application approval timestamp over a rolling 14-day window. Home and normal Match share session filters. Cards show compact identity, truthful availability, stored rate and real rotating photos. Normal Match supports online priority, offline fallback and a free repeat cycle. Full Host Profile has authoritative Like/unlike/counts, existing Follow/Friends, a cross-platform More menu and sticky actions. Gift is explicitly unavailable. Optional media is public-only and absent when unavailable. No payment, upload, commercial Gift, VIP, Quick Match lifecycle or call architecture was implemented or rewritten.

## 2. Exact modified and new files

Modified:

- `firestore.rules`
- `functions/src/index.js`
- `src/components/DiscoveryFilterModal.js`
- `src/components/HostCard.js`
- `src/screens/main/HomeScreen.js`
- `src/screens/main/MatchScreen.js`
- `src/screens/main/UserProfileScreen.js`
- `src/screens/main/__tests__/consumerLevelVisibility.test.js`
- `src/services/blockService.js`
- `src/services/discoveryService.js`
- `src/utils/hostRecency.js`
- `src/utils/__tests__/hostRecency.test.js`

New:

- `functions/src/hostDiscovery.js`
- `functions/src/hostDiscoveryDomain.js`
- `functions/src/__tests__/hostDiscovery.test.js`
- `src/hooks/useDiscoveryFilters.js`
- `src/hooks/useRotatingHostPhoto.js`
- `src/utils/discoveryFilters.js`
- `src/utils/__tests__/discoveryFilters.test.js`
- `src/services/hostProfileService.js`
- `src/services/__tests__/discoveryService.test.js`
- `src/services/__tests__/hostDiscovery.emulator.cjs`
- `src/components/__tests__/discoveryFilterModal.test.js`
- `src/components/__tests__/hostPhotoRotation.test.js`
- `src/screens/main/__tests__/discoveryProfileUi.test.js`
- `docs/consumer-discovery-host-profile-report.md`
- `docs/consumer-discovery-host-profile-git-status.txt`

No navigation, approval, Level economy, earnings, call-recovery, RTC, Storage, dependency or index source file was changed.

## 3. Architecture found in the audit

Home already provided the three requested tabs and a two-column FlatList. `discoveryService` queried a bounded Host pool, normalized whole user documents, ranked online/recent Hosts deterministically, and injected development demo Hosts when real results were absent. Following similarly substituted demo relationships. New used seven days and public `hostApprovedAt`/`hostCreatedAt` fields. Filters included Search, free-text interest and pricing tier, with state local to Home. There was no shared Home/Match filter state.

Match used the existing country/interest compatibility score but queried only online Hosts, lacked a caught error state, and had a local skipped list whose initial/reset behavior was incomplete. HostCard showed age, written country, unconditional verification, NEW/DEMO badges and a default price; rotation was 6.5 seconds and enabled only for the first four Home cards.

Full profiles already used the existing profile fetch, follow subscription, profile views, call reputation, report and block services. They supported gallery/introduction video and existing Consumer Level visibility for approved Hosts. They lacked a safe Like relationship, requested social counts, Not Interested and a sticky action bar. No immutable Amira ID was established. Stories publishing/Moments and commercial Gift settlement were not active authoritative systems. The disconnected legacy GiftTray contains hardcoded economics, client wallet mutation, a literal `target_user_id`, swallowed ledger errors and a success callback; it is not a legitimate settlement path to reuse.

## 4. For You after cleanup

Authenticated Consumer discovery calls `getDiscoveryHosts`. The backend selects at most 60 documents with protected `hostStatus.isApproved == true`, rechecks authoritative account classification, and excludes `isDemo` records. Both block directions and the Consumer's discovery-hidden preference are checked before a public projection is returned.

The existing online/recent score is retained: online adds 100, recent approval adds 20, and UID breaks ties. No random sorting or new opaque recommender was introduced. Selected filters apply locally to this normalized bounded pool. Empty real data stays empty; loading, empty, error/retry and pull-to-refresh behavior are provided. Consumer tabs remain Home / Match / Messages / Profile; approved Host tabs remain Connect / Messages / Activity / Profile. Pending applicants remain Consumers. No mode switch or Search tab was added.

## 5. New definition and trusted field

Source: `hostApplications/{hostUid}.approvedAt`, accepted only when the application's status is `approved` and the target is an approved Host. A valid nonfuture timestamp qualifies when `now - approvedAt <= 14 * 86,400,000` milliseconds. This is a rolling 14-day approval window, not account creation time. New results sort by approval time descending, with UID ties.

The baseline application rules allow applicants to create only draft/submitted payloads and specifically restrict their fields and update keys. They cannot approve an application or create/modify `approvedAt`; trusted administrators/backend writers can. Public user approval-date fields are not protected by equivalent owner-update rules, so they are ignored as evidence. The backend response's `hostApprovedAt` is a numeric projection of the protected application timestamp, not a newly trusted public user field. Approval authority itself was not changed.

## 6. Legacy timestamp handling

Approved Hosts lacking a valid approved application timestamp remain eligible for For You, Following and Match, but are omitted from New. Future/invalid timestamps and dates on submitted applications do not qualify. Public `hostCreatedAt`, account `createdAt`, and client-written public approval dates are not fallbacks. No production backfill or migration was performed. A future approved backfill would need documented trusted approval evidence; wallet/activity/account age cannot substitute for it.

## 7. Following and blocks

Following reads the Consumer's actual `users/{consumerUid}/following/{hostUid}` relationships, bounded to 60 records per request. Consumer/Host ownership fields must match the source and document identity before fetching targets. Targets are rechecked for approval, demo status, both block directions and discovery-hidden preferences; filters then apply. No examples or demo Following data are inserted.

Returning from a full profile, changing tabs, focusing Home or refreshing fetches current relationships, so a completed unfollow disappears on the next refresh/focus. This is snapshot discovery, not a live listener per card. The existing full-profile follow relationship listener remains live. Shared `getBlockedIds` now includes incoming blocks through the already-supported blocked collection-group query, improving mutual exclusion in the existing Host Connect path without redesigning it.

## 8. Filters and persistence

Exactly Country, Language, Age Range, Online Now and Interests are exposed. No Search or pricing control remains in the active filter UI. The existing country selector/map is reused. Languages are selectable values observed in the real bounded Host pool (existing `hostProfile.languages` or `languages` arrays), including the currently selected value. No unsupported language catalogue is invented.

Interests use the existing onboarding ten-item controlled catalogue: Music, Travel, Food, Gaming, Art, Sports, Movies, Tech, Fashion and Fitness. Read-only normalization accepts case variations, deduplicates and limits to ten; arbitrary legacy tags are omitted. Selected interests all must match. Unknown country/language/interest data fails the applicable selected filter safely. Age derives only from a valid calendar DOB and must be 18–120; unknown age is excluded when an age range is selected. Online Now requires actual stored `hostStatus.availability == online`, with no last-active guess or legacy `isOnline` substitution.

`useDiscoveryFilters` stores immutable filter snapshots in memory by Consumer UID and shares them through `useSyncExternalStore`. Filters survive discovery tab changes, Home/Match navigation and screen remounts during normal app usage. They are not persisted across a process restart or shared across account UIDs. Clear Filters applies the reset immediately. Invalid age ranges cannot be applied. Not Interested preferences are separate from filter reset.

## 9. Compact Home cards

Cards show a real main/rotating public photo or an identity initial placeholder, Host name, country flag only when the existing country map recognizes the code, truthful Online/Busy/Offline status, video icon and stored positive integer video rate. Missing rate says “Rate unavailable”; no 25-Credit default is manufactured. Busy is amber and its call action is disabled; offline call actions are disabled too. Existing backend eligibility rechecks still govern attempted calls.

Excluded: written country name, age, interests, Amira Level, VIP, Friends, Host tier, NEW, DEMO, follower/like counts, biography and Like action. Home is still a two-column grid. The existing permanent Host/Consumer navigation boundary is preserved.

## 10. Photo rotation and cleanup

`useRotatingHostPhoto` reuses existing public `profilePic`/legacy photo references and `hostProfile.gallery` or legacy `photos`, deduplicated and bounded to ten HTTPS references. Explicit nonpublic gallery objects are omitted. A single usable photo is static; two or more rotate every 3 seconds. Failed images are removed from the usable sequence; exhausted photos show an initial placeholder, without substituting an unrelated image. Full-profile hero failures also fall back truthfully.

Dependencies use photo contents and Host UID, so routine object/callback rerenders do not reset the card timer. The owned interval clears on unmount, media changes, inactive state and insufficient usable photos. Home enables rotation only for viewable cards while focused; Match enables it while focused. FlatList viewability callbacks/configuration are stable. No per-card Firestore listener, upload function or Storage activation was added.

## 11. Normal Match

Match uses the same real backend candidate pool, shared filters, blocks and preferences. Busy Hosts are excluded. Existing country/controlled-interest compatibility scoring and stable UID ties are retained, with online priority; offline eligible Hosts can be selected after online candidates, or immediately if no eligible online Host exists. Online Now intentionally excludes that offline fallback.

A session ref tracks previously passed Hosts. Next selects unseen eligible Hosts until exhaustion, then resets the cycle gracefully; a one-Host pool may repeat after its single candidate is exhausted. Next is free/unlimited and cycles locally without requesting a call, charging Credits, granting messages or consuming Quick Match entitlements. Focus/filter refreshes update the pool, and stale async responses are discarded. Loading, empty and caught error/retry states do not fabricate a match. Message opens existing ChatDetail; Video invokes existing `startVideoCall`.

## 12. Full Host Profile structure

Consumer requests use `getPublicHostProfile` and a whitelisted backend response. Identity includes real photo/name, valid flag, truthful availability and authoritative stored rate. No approval-equals-identity-verification badge is asserted: the audit found no separate trusted verification result suitable for public display. No permanent ID is fabricated.

Followers, Following and Likes appear as non-tappable counts. Genuine zero comes from a successful backend aggregate query. A failed initial read produces profile-unavailable state; failed social refreshes show “Unavailable”, rather than displaying made-up zeros. About and controlled Interests render only when present. Existing real public gallery/introduction video remain. Explicit public saved Moments render only when present. No Gifts rail is invented.

Follow remains in the main profile area. One sticky bar outside the ScrollView contains Like/Liked, Message, Video with real rate and disabled Gift/“Coming later”. It uses existing safe-area insets for bottom padding. Like/Message/Video are disabled as applicable for blocks; Video is also disabled for offline/busy/missing rate. No duplicate sticky bar is inserted during scrolling. Approved Hosts viewing Consumer full profiles retain their backend-derived Consumer Level badge and existing message/follow path; Consumer Level is not attached to a Host profile.

## 13. Likes: relationship, idempotency and counts

New authoritative relationship: `users/{hostUid}/likes/{consumerUid}` with `consumerId`, `hostId` and server `createdAt`. `setHostLike` binds the sender to callable authentication, accepts only `hostId` and a boolean `liked`, and rejects spoofed ownership fields. It transactionally verifies an existing Consumer/pending applicant, an approved non-demo Host, and both block directions before reading/writing the deterministic relationship document. Hosts cannot use this Consumer-like flow. Duplicate/concurrent likes are idempotent and preserve the original record; unlike removes it and repeated unlike is safe.

Like count is an authoritative aggregate of actual relationship documents, not a client-maintained counter. Profile refresh follows completed Like/unlike actions. Blocks atomically remove the relationship, and transaction conflicts prevent an in-flight Like from resurrecting it. The Host can read their incoming relationships for a future Activity Likes list (including creation time); no Activity UI redesign or notification economy was added. No Like action appears on Home or normal Match cards.

## 14. Follow and Friends preservation

Existing Consumer → Host and Host → Consumer follow schemas/services/rules remain. Full-profile `subscribeRelationship`, mutual-follow Friends label and existing friendship synchronization are reused. Friends is confined to the existing full-profile relationship presentation, absent from compact discovery cards and conversation headers. Like is independent of Follow and cannot create Friends. Existing message entitlement priority, friendship event idempotency and grants remain unchanged; no opening/Like operation grants a message.

## 15. Report, Block and Not Interested

More is an actual modal menu exposing Report, Block (Unblock when applicable) and Not Interested, with Cancel and no Share. It supports all rows on Android rather than relying on an Alert with more buttons than that platform supports. Report reuses the existing report modal and authenticated report submission.

The normal block path now calls `blockAndRemoveSocial`: one transaction creates the owned block record and deletes both follow directions and both possible Like directions. Existing direct client block records remain supported by a retryable `onBlockRemoveSocial` trigger. The trigger re-reads current block state, so delayed events after an unblock do not delete new unblocked relationships. Unblocking does not restore deleted Follow/Like relationships.

Not Interested writes the Consumer's private `users/{uid}/discoveryHidden/{hostUid}` through a role/target/block-checked callable. It excludes discovery results without creating a block or removing Follow/Like. The profile/message/call relationship remains usable when otherwise eligible. This batch does not supply an undo-hidden-preference UI.

Existing call-start and text-send block eligibility remain enforced. Historical conversations/messages and historical friendship grant records are retained; Friends access is derived from current follow/block state. Active-call termination on a new block was not added. Gift, Quick Match and sponsored invite lifecycles are deferred and therefore cannot be claimed as implemented downstream block effects.

## 16. Stories and Moments

The existing Home Stories area remains but receives only real saved, explicitly public stories with a valid unexpired `expiresAt` and HTTPS media reference. No real active records means no Stories row. Public Host photos can serve as an existing story's thumbnail if that story is video-only; no story is invented to create a circle.

Profile Moments accept only existing explicitly public saved records with valid media references. VIP-only, unknown-visibility and unmarked Moment/Story records are omitted safely. Empty Moments means no content rail. No direct Moment upload, Story publication, save-to-Moments lifecycle or VIP unlock was implemented. Future Story → optional Save to Moments remains a separate lifecycle. The read adapter uses existing user-level arrays; a future authoritative media collection may require an adapter once its lifecycle is approved.

## 17. Gifts

No trustworthy active commercial Gift aggregate/settlement model was found. The legacy GiftTray's client spending and success callback are unsafe for this flow, so it is not opened or revived. No public received Gift types/counts, total Consumer spending, new catalogue economics or Promotional Gifts are displayed. The sticky Gift action is visibly disabled with “Coming later”. Legacy disconnected code was left untouched to avoid a broad deletion; it remains disconnected from discovery/profile/Match. There is no fake Gift success or settlement.

## 18. Permanent Amira ID

No immutable server-assigned permanent Amira ID was found. Existing generated referral codes are not repurposed as Amira IDs. Public profile identifiers are omitted rather than manufactured or trusted from arbitrary owner-editable fields. No generator, name/ID Search, collision scheme or production migration was introduced. Future ID assignment must have trusted uniqueness and immutability before public display is wired to it.

## 19. Call and messaging systems

Discovery, Match and profile buttons invoke the existing normal `startVideoCall` → callService path; Message uses existing ChatDetail. No new call system, paid confirmation, ring/reconnect timeout, settlement, connected-time/recovery logic, free-to-paid continuation, audio call or Quick Match call behavior was touched. Calls still re-fetch/check approval, blocks, availability, protected rate and accounting eligibility at the backend.

No paid message unlock/refund, message grant from Like/profile opening, or altered Friends priority was added. The only shared social compatibility change is the authoritative block cleanup path and reverse-block discovery lookup, required to remove Likes/follows and mutually exclude profiles.

## 20. Rules and indexes

Added only two nested rules: Like relationships are read-only to the relevant owner Host or sender Consumer when unblocked; discovery-hidden preferences are read-only to their owner. All client writes to either path are denied. Authenticated callables perform the writes. No existing write permission was broadened and no existing protected approval, rate, Level, earnings or call rule was relaxed.

`firestore.indexes.json` is unchanged. Candidate queries use a single approved flag, and aggregates/reverse-block lookups use existing following/blocked single-field collection-group overrides. No new composite index is required by this implementation; no index was deployed.

## 21. Security and privacy

Consumer-facing discovery/profile now return an explicit public projection, excluding email, phone, wallet, earnings, raw DOB, application verification/payout data and other raw user fields. The backend reads the protected application only to project approval time; it does not return its details. Missing rates/availability/media do not become fabricated values. Pending applicants cannot become Host candidates merely by having role `host`; approval remains the protected authority.

The existing broad authenticated `users` read issue remains a separate project. Existing full-profile follow/block listeners still use their baseline permitted profile reads, and approved Host → Consumer profile fetches remain as before. No new broad user read permission or public collection migration was added. The new projection reduces the data used in Consumer discovery, but does not solve that pre-existing privacy issue.

## 22. Tests added/updated

- `hostDiscovery.test.js`: 9 tests for transactional Like/unlike/idempotency, role/ownership/block rejection, atomic cleanup/delayed events, preference separation, trusted projection, valid DOB and public media/controlled interests.
- `discoveryFilters.test.js`: 2 tests for approval/demo exclusion and all requested filter predicates, including missing age and truthful online eligibility.
- `discoveryService.test.js`: 3 tests for real backend tab routing/no fallback, stable ranking and normal Match priority/fallback/exclusions.
- `hostPhotoRotation.test.js`: 4 real card tests for 3-second rotation, stable rerender, owned interval cleanup, single/inactive/failed photo behavior, prohibited metadata, truthful availability and missing rate.
- `discoveryFilterModal.test.js`: 2 real modal tests for exact controls, controlled selection, immediate reset and invalid age rejection.
- `discoveryProfileUi.test.js`: 5 real Home/Match/profile tests for tab structure, shared persistence/reset, empty/error states, unlimited selection cycle, existing Message/Video paths, authoritative social actions/counts, safe Gift, menu/preference behavior and failed social refresh.
- Existing `hostRecency.test.js`: updated the intentionally obsolete seven-day product expectation to 14 days; added boundary/future/unsafe-fallback assertions.
- Existing `consumerLevelVisibility.test.js`: added mocks for the new Host-only profile adapter and safe-area dependency; all original Level/placement assertions remain.
- `hostDiscovery.emulator.cjs`: 47 real backend/client-rule checks in a unique localhost demo namespace.

Initial timer assertions mistakenly counted React Native framework timers too; final tests specifically prove the rotation interval is created once at 3 seconds and that its exact owned handle is cleared. The existing Level UI suite needed the new service mock to avoid importing untransformed Firebase ESM in Jest. These were harness corrections, not security assertion weakening.

## 23. Exact final validation totals

| Check | Final result |
| --- | --- |
| `node node_modules/jest/bin/jest.js --runInBand --roots src functions/src` | 46 suites / 419 tests passed; 0 snapshots; 75.574 seconds |
| `npm test --prefix functions` | 8 suites / 203 tests passed; 0 snapshots; 10.726 seconds |
| Babel parser over `src`, `functions/src`, `shared` JS/CJS | 202 files parsed successfully |
| `git diff --check` | Passed |

Baseline was 40 suites / 394 tests. This batch adds 6 suites / 25 tests. Standalone Functions tests overlap the full run and must not be summed as unique tests. Focused UI validation passed before the full final run. No physical or deployed validation is claimed.

## 24. Emulator results

All emulator operations used localhost Firestore on port 8289, unique `demo-*` namespaces and test-only media references/configuration. No real Hosts, purchases, images, social relations or counts were fabricated in production UI or records.

| Suite | Result |
| --- | --- |
| New discovery/profile backend and security | 47 checks passed |
| Existing Creator role/earnings security | 40 checks passed |
| Existing Level/rewards backend and security | 53 checks passed |
| Existing social messaging backend/security | 69 checks passed |
| Existing rewards/economy security rules | 32 checks passed |
| Existing follow rules | Passed: both directions, role/ownership/schema denial, blocking, recipient-only query, count and unfollow |
| Existing call recovery real transaction races | 9 assertions passed: settlement/end/reconcile/reconnect/duplicate-end |

Existing social/rewards/follow scripts hardcode port 8189 and static demo IDs. An in-memory Node Module wrapper changed the port to 8289 and added unique namespace suffixes while preserving their source assertions; those scripts were not edited. New backend checks include three parallel Likes yielding one document/count, unlike to genuine zero, pending eligibility/Host denial, both block directions, blocking concurrent with Like, private-field omission, protected rate/approval/Level/earnings denial, trustworthy New versus legacy public dates, and hidden-preference separation.

## 25. Migrations/backfills/index requirements

None is required to start the foundation with safe empty/legacy states. New Like/preferences records are created only by explicit authoritative actions. No production record migration/backfill or bulk ID/approval-date generation occurred. Legacy approval dates may be backfilled later only from trusted evidence under a separately authorized procedure. There are no new index requirements. A later authorized backend/rules release is necessary before these new callables can be used against a deployed environment; this batch intentionally did not perform that release.

## 26. Remaining limitations

Discovery/Following candidate requests are capped at 60. Remaining filtering may exclude those candidates even when matching Hosts exist outside the bounded page; this is not exhaustive marketplace pagination. Language choices reflect observed existing fields rather than a finalized language catalogue. Candidate validation fans out to bounded backend document reads (two blocks, preference and application per candidate); there are no per-card listeners, but a future public discovery collection/cache could reduce that read cost.

Discovery, availability and Like counts are snapshots refreshed on focus, tab/filter pool refresh, pull-to-refresh and relevant profile actions; changes from other sessions may be stale until refresh. Backend call/message/Like eligibility remains authoritative during that interval. Profiles use a bounded public media adapter and HTTPS references, not an upload/visibility entitlement lifecycle. Unmarked protected media is omitted. Verification badges and permanent IDs remain deferred until separate trusted contracts exist. Not Interested has no undo UI in this batch. Active-call block teardown and deferred commercial block effects are not implemented. Known broad user-read privacy remains unresolved.

## 27. Future physical validation checklist

Physical validation was not performed. Use a later authorized development/emulator setup; do not deploy solely for this checklist while billing is unavailable, alter production records, enable Storage or claim fixtures represent real purchases.

1. On Consumer and pending-applicant devices, verify Home/Match/Messages/Profile; on an approved Host verify Connect/Messages/Activity/Profile, with no mode switch and no Consumer Level/Rewards route regression.
2. Confirm Home has exactly For You/New/Following, no Search, and no Stories circles when no real active public stories exist. Check truthful loading/empty/error/retry states with no sample Hosts.
3. In isolated approval fixtures, check approved versus pending, dates just inside/outside 14 days, future/missing dates and ignored public client approval dates. Verify New ordering.
4. Apply every filter, move across all discovery tabs and Match, return/remount Home, and confirm persistence for the same account. Clear Filters and verify immediate reset; unknown DOB/language/country should not invent a match.
5. Check compact cards for name/flag/state/rate only; no age, country text, interests, Level/VIP/Friends/NEW, counts or Like. Compare online/busy/offline rendering and call disabled state.
6. Verify one-photo cards stay static; multiple real photos rotate around 3 seconds; failed images fall back; offscreen/unfocused cards pause and scrolling/unmounting leaves no timer activity. Do not add uploads to supply media.
7. Run normal Match through all fixture candidates, checking online-first selection, offline fallback without Online Now, Busy exclusion, no repeats before exhaustion and a graceful unlimited reset. Verify Next does not change Credits or Quick Match entitlements.
8. On full Host Profile, verify real Follow/Following/Friends, independent Like/unlike, repeated taps/concurrent sessions yielding one Like, correct actual counts and unavailable states for failed refreshes. Confirm counts are not tappable and interests hide when empty.
9. Check sticky layout on Android/iOS at different sizes/insets, with one bar only. Open Message/Video through existing paths; Busy/Offline/blocked states must not imply immediate call availability. Gift must remain disabled with no tray/success/spending.
10. Open More and confirm Report/Block/Not Interested with no Share. Complete report using existing flow; block in both directions and verify Follow/Like removal, mutual discovery exclusion and new interaction denial. Unblock should not restore deleted social records; Not Interested should hide discovery while preserving otherwise allowed interaction.
11. Verify public existing Moments/Stories only, with no fake rail and no VIP-only/unmarked media exposure, upload buttons or VIP unlock. Confirm no fabricated verification badge or Amira ID.
12. Recheck Host → Consumer full-profile Level badges and excluded compact/header placements, message entitlement/Friends priority, check-in behavior and call recovery/accounting using the existing authorized development setup.

## 28. Worktree and authorization confirmation

Implementation, focused/full Jest, standalone Functions, emulator validation, static parsing and diff inspection are complete. `git diff` was reviewed for scope and `git diff --check` passed. Changes remain unstaged/uncommitted. No commit, push, deployment, production Firestore mutation, billing/API activation or Storage activation occurred. No physical validation is claimed.

Exact final short status is captured in [consumer-discovery-host-profile-git-status.txt](consumer-discovery-host-profile-git-status.txt). The task-owned local Firestore emulator was shut down after validation.
