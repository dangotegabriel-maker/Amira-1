# CP28 - Real-time listener and session lifecycle audit

## Baseline
Resume verification: `amira-v2`, HEAD `2a3d70ce819e1e78da41c0bd8214a456fed622c2` (`fix: make incoming call reception app-wide`). The working tree was already dirty: 56 modified tracked files and six untracked CP28 files. The recovered report described a clean original baseline; that historical claim was not independently reverified. No AGENTS.md found in repository search.

## Pre-change ownership inventory
The recovered table covered 47 paths. Resume review retained it, verified the implementation, and added delayed logout confirmation as path 48. Counts are meaningful feature/lifetime paths, not individual onSnapshot calls (the relationship composite alone has five). **48 paths** audited: 39 defect-bearing paths, four correct paths, three intentionally screen-scoped paths, and two inactive/deferred paths. These are path classifications, not 39 independent root causes. Service adapters and their callers were traced together. The table describes baseline behavior; the implementation disposition below describes the final changes.

| # | Feature | Service / owner | Attach / cleanup | Intended route lifetime | Pre-change protection / finding | Classification |
|---|---|---|---|---|---|---|
| 1 | Auth bootstrap/profile | UserProvider / onAuthStateChanged + subscribeToUserProfile | Auth mount; unsubscribe/invalidate on replacement/unmount | Session-wide | CP25 exact owner token | CORRECT |
| 2 | Incoming calls | Root IncomingCallListener / subscribeIncoming | Approved online Host + foreground; full cleanup | Survives all tabs | CP27 token + generation | CORRECT |
| 3 | Incoming identity/response/expiry | IncomingCallCard | Visible call; identity cancel and expiry timer cleanup | Call lifetime | CP27 capability/action lock | CORRECT |
| 4 | Presence | AppContent / presenceService.start | UID effect; global stop writes current UID | Session-wide | UID only; cleanup can write B offline | DEFECT |
| 5 | Unread/banner inbox | MessageActivityProvider / subscribeInbox(all) | UID mount; unsubscribe | Session-wide | Errors and banner navigation unguarded | DEFECT |
| 6 | Message activity blocks | MessageActivityProvider / 2 block snapshots | UID mount; unsubscribe | Session-wide | Queued error lacks alive/session check | DEFECT |
| 7 | Message activity AppState/timer | MessageActivityProvider | Mount/banner; removes event/timer | Foreground banner only | Timer clear is correct; stale banner action unsafe | DEFECT |
| 8 | Messages inbox/presence | MessageHome / subscribeInbox + presence.get | Mounted tab; stop on UID/unmount | Visible screen | Alive only; out-of-order presence completions | DEFECT |
| 9 | Notices | MessageHome / noticeService.subscribe | Mounted tab; stop on UID/unmount | Visible screen | Alive only | DEFECT |
| 10 | Call history/identity pages | MessageHome / listPage + publicIdentity.calls | UID/retry; alive first page only | Calls view | Load more unguarded; response ordering | DEFECT |
| 11 | Chat identity/relationship | ChatDetail / publicIdentity.message + follow | Focus/recipient; cleanup | Visible conversation | UID/active only; queued relationship callback | DEFECT |
| 12 | Chat access expiry | ChatDetail / chatPassService + timeout | Focus/access revision; timer cleanup | Visible conversation | Active only; access not reset across recipient | DEFECT |
| 13 | Chat preparation | ChatDetail / prepareConversation + blocks | Conversation; active cleanup | Conversation lifetime | Block promise unguarded; old conversation state retained | DEFECT |
| 14 | Chat message window | ChatDetail / subscribeMessages | Focus + foreground; unsubscribe | Visible foreground chat | CP26 service guards Auth object; screen callbacks need scope | DEFECT |
| 15 | Chat conversation metadata | ChatDetail / subscribeConversation | Conversation exists; unsubscribe | Visible conversation | Unsubscribe only | DEFECT |
| 16 | Chat send/block/invite/report | ChatDetail delayed handlers | User action | Current recipient/session | Late state/Alert/navigation and repeated presses | DEFECT |
| 17 | Relationship composite | followService.subscribeRelationship | 5 snapshots + capability + queued syncFriendship | Consumer screens | UID-only emit; queued sync can run in replacement session | DEFECT |
| 18 | Follower counts | followService.subscribeFollowerCount | No active consumer found | Public count if used | Unused adapter | DEFERRED |
| 19 | Host Quick Match offers | HostDashboard / offer + 5s interval | Connect focus + online | Online Host foreground | Server candidate selection ignores route; unreachable off Connect | DEFECT |
| 20 | Quick Match response | QuickMatchOfferCard | Offer action | Offer/session | No action lock/session/expiry navigation guard | DEFECT |
| 21 | Consumer Quick Match | Match / state 3s poll + start/cancel | Active request on mounted Match | Active request across tab changes | Alive only; overlapping polls and late navigation | DEFECT |
| 22 | Sponsored invite inbox/response | Home / SponsoredCallInviteBanner | Focus load; cleanup | Home offer surface | Response unguarded; not a live app-wide listener | DEFECT |
| 23 | Video call document/RTC | VideoCall / callService.subscribe + rtcService | Call screen mount; stops/leave | Call lifetime including overlays | Mounted flags miss session and delayed errors | DEFECT |
| 24 | Video heartbeat/payment queues | VideoCall / report/ack/sync/settle timers | Call phase; clears timers | Active call | Queued work can invoke under replacement Auth | DEFECT |
| 25 | Video reconnect/gift/AppState | VideoCall timers + AppState | Call mount/phase; clear/remove | Call lifetime; background ends connected call | Late finish/Alert/nav unguarded | DEFECT |
| 26 | Call entry disclosure | callNavigationService.startVideoCall | Disclosure -> prepare -> request | Current originating screen/session | Delayed confirmation can initiate as B | DEFECT |
| 27 | Call summary relationship/review | CallSummary | Focused; unsubscribe/active | Visible summary | Delayed review/follow errors not guarded | DEFECT |
| 28 | Profile relationship/reputation/identity | UserProfile / follow/review/profile services | Target/focus; mixed cleanup | Visible target | Reputation unfocused; delayed social actions unguarded | DEFECT |
| 29 | Profile level/gifts/view tracking | UserProfile | Focused target; mostly alive guarded | Visible target | Session currency missing; tracking is server-authorized | DEFECT |
| 30 | Host Activity/Visitors | HostActivity + HostVisitors wrapper | Focus/tab/retry; request version + minute timer cleanup | Visible screen | Read ordering correct; invite response needs guard | DEFECT |
| 31 | Who Viewed Me | WhoViewedMe / profileViewService | Focus/retry; request version | Visible screen | Role/privacy enforced server; existing cleanup | INTENTIONAL SCREEN-SCOPED |
| 32 | Following | FollowingScreen | Focus load without cleanup | Visible screen | Late load/unfollow; out-of-order refresh | DEFECT |
| 33 | Blocked identities | BlockedUsers | Focus/retry; active cleanup | Visible screen | Late unblock action | DEFECT |
| 34 | Host Connect discovery/availability/Today | HostDashboard | Focus + version/alive; cleanup | Visible screen | Async availability failure can alert after exit | DEFECT |
| 35 | Home/Match discovery | Home + Match | Focus/filter; request version cleanup | Visible screen | Bounded discovery; no need global listener | INTENTIONAL SCREEN-SCOPED |
| 36 | Rewards balance/dashboard/midnight | Rewards | Focus + unsubscribe/timer cleanup | Visible screen | Late claim/getTasks actions; active only | DEFECT |
| 37 | Level read/claim | MyLevel | Focus/retry; active cleanup | Visible screen | Late claim reads/Alerts | DEFECT |
| 38 | Host earnings | HostEarnings / subscribe | Mounted screen + retry | Visible screen | Listener continues behind nested screen; active only | DEFECT |
| 39 | Profile counts/application | MyProfile | Focus read without cleanup | Visible screen | Late read/error overwrites | DEFECT |
| 40 | Wallet/Recharge/VIP reads | Wallet, Recharge, VIPStore | Mount/focus; mixed cleanup | Visible screen | Wallet/Recharge unguarded completion | DEFECT |
| 41 | Gift catalog/send | GiftTray | Visible Modal; catalog active cleanup | Current target/visible tray | Late success/recharge navigation; no ref action lock | DEFECT |
| 42 | Own Amira identity | AmiraIdentity | Focus/UID/retry; alive cleanup | Visible identity | Existing cleanup + root session unmount | INTENTIONAL SCREEN-SCOPED |
| 43 | Discovery filter external store | useDiscoveryFilters | useSyncExternalStore automatic cleanup | Account/session | UID cache survives externally replaced same-UID login | DEFECT |
| 44 | Legacy socket | socketService singleton imported by UserProvider | Constructor adds permanent AppState event | No active socket connect callers | Unowned AppState/timer survives disconnect | DEFECT |
| 45 | Visual timers/input events | Splash, rotating host photos, keyboard, intro video | Mount/visibility/platform; cleanup | Component lifetime | No account financial/identity side effects | CORRECT |
| 46 | Inactive/unavailable surfaces | FreeNowBanner, NudgeInbox, legacy agora, GiftLedger, payments/media/translation | No live authorized subscription path | Remain unavailable/inactive | No new activation | DEFERRED |
| 47 | Onboarding/application/edit profile | CP25 onboarding + application/edit actions | Screen; UserProvider guarded APIs | Current onboarding/profile screen | CP25 guarded forms correct; application/edit hydration and write-chain continuations lack exact-session guards | DEFECT |

| 48 | Delayed logout confirmation | MyProfile/Settings -> UserProvider.terminateSession | User confirmation; shared single-flight termination | Captured authenticated session | Old callback resolves current owner and can terminate replacement account | DEFECT |

## Quick Match evidence
`functions/src/quickMatchService.js` candidatePool selects approved online Hosts and transactionally checks active-call locks and both block directions; no Connect focus or route is part of eligibility. An online Host remains selected off Connect but the existing offer poll stops: confirmed reachability defect. The safe correction is one foreground Host session-level poll owner, preserving the existing callable offer/response flow and server economics. Consumer request state must continue across tabs while a request is active, but never across sessions. No new price, entitlement timing or candidate-count constant is needed.


## Recovery and continuation

Preserved all recovered work. No reset, restore, checkout, stash, clean, staging, commit, push, package installation, or deployment was performed. The obsolete CP25 attachment and its `6df3db9` baseline were superseded by the explicit CP28 handoff.

Already present on recovery: the inventory above (then 47 entries), `useSessionGuard`, keyed session navigation, session-bound presence, a single root Host Quick Match poller, screen and action guards, listener error handling, and regression additions. The report still contained `IMPLEMENTATION_AND_VALIDATION_PENDING`; no final status artifact existed. Test success from the interrupted session was not assumed.

Resume work reviewed the existing diff and new files, completed regression coverage, and corrected the remaining issues:

- Preserve unsent chat drafts across temporary blur while clearing them for recipient/session replacement.
- Reject Quick Match acceptance after expiry during a block lookup; suppress background acceptance completion navigation.
- Bind ordinary Match call disclosure to the focused Host target without stopping an active Consumer Quick Match request on tab changes.
- Recheck call lifetime inside delayed RTC initialization; reset call-scoped refs and local presentation on a new call target.
- Reset obsolete busy indicators on focus return and suppress delayed Host availability/action errors.
- Stop application media/profile follow-up work after invalidation without enabling uploads.
- Handle stale report and cancellation failures without unhandled UI actions.
- Reject delayed logout confirmation captured by an obsolete session, including same-UID replacement.

### Exact files found at recovery

The following 56 tracked modifications were already present (not created by the resume review):

```text
App.js
src/components/GiftTray.js
src/components/IncomingCallListener.js
src/components/QuickMatchOfferCard.js
src/components/SponsoredCallInviteBanner.js
src/components/__tests__/discoveryFilterModal.test.js
src/components/__tests__/giftTray.test.js
src/components/__tests__/incomingCallLifecycle.test.js
src/context/MessageActivityContext.js
src/context/UserContext.js
src/context/__tests__/messageActivityUi.test.js
src/context/__tests__/userSessionIsolation.test.js
src/hooks/useDiscoveryFilters.js
src/navigation/RootNavigator.js
src/navigation/__tests__/accountNavigation.test.js
src/screens/host/HostActivityScreen.js
src/screens/host/HostApplicationScreen.js
src/screens/host/HostDashboardScreen.js
src/screens/host/HostEarningsScreen.js
src/screens/host/__tests__/hostActivityUi.test.js
src/screens/host/__tests__/hostConnectUi.test.js
src/screens/main/BlockedUsersScreen.js
src/screens/main/CallSummaryScreen.js
src/screens/main/ChatDetailScreen.js
src/screens/main/EditProfileScreen.js
src/screens/main/FollowingScreen.js
src/screens/main/HomeScreen.js
src/screens/main/MatchScreen.js
src/screens/main/MessageHomeScreen.js
src/screens/main/MyLevelScreen.js
src/screens/main/MyProfileScreen.js
src/screens/main/RechargeHubScreen.js
src/screens/main/RewardsScreen.js
src/screens/main/UserProfileScreen.js
src/screens/main/VIPStoreScreen.js
src/screens/main/VideoCallScreen.js
src/screens/main/WalletScreen.js
src/screens/main/__tests__/callPaymentUi.test.js
src/screens/main/__tests__/consumerLevelVisibility.test.js
src/screens/main/__tests__/discoveryProfileUi.test.js
src/screens/main/__tests__/hostAccountUi.test.js
src/screens/main/__tests__/messageEntitlementUi.test.js
src/screens/main/__tests__/myLevelUi.test.js
src/screens/main/__tests__/privacyIdentityUi.test.js
src/screens/main/__tests__/profileViewTrackingUi.test.js
src/screens/main/__tests__/rewardsUi.test.js
src/screens/main/__tests__/truthfulUi.test.js
src/services/__tests__/callEntry.test.js
src/services/__tests__/followHelpers.test.js
src/services/callNavigationService.js
src/services/callService.js
src/services/followService.js
src/services/messagingService.js
src/services/presenceService.js
src/services/rtcService.js
src/services/socketService.js
```

Six untracked files already present:

```text
docs/realtime-listener-session-audit-report.md
src/components/QuickMatchListener.js
src/components/__tests__/quickMatchLifecycle.test.js
src/hooks/useSessionGuard.js
src/screens/main/__tests__/screenSessionLifecycle.test.js
src/services/__tests__/sessionListeners.test.js
```

## Production change map

Paths are relative to the repository root. All 38 changed/new production files are accounted for below.

| Exact file(s) | Final behavior |
|---|---|
| `App.js`, `src/services/presenceService.js` | Presence attaches to the exact session and captured Auth object; old cleanup/event cannot mark the replacement account offline. AppState is detached once. |
| `src/context/UserContext.js` | Exposes a distinct session key, clears account discovery filters when invalidating, and rejects obsolete logout callbacks. Firebase Auth remains authoritative. |
| `src/navigation/RootNavigator.js` | Keys the authenticated subtree by session, clearing screen-local state and subscriptions even for same-UID replacement. |
| `src/hooks/useSessionGuard.js` (new) | Captured guard checks exact session, component lifetime, target, and optional focus/visibility. Changing scope invalidates old closures. |
| `src/hooks/useDiscoveryFilters.js` | Old-session callbacks cannot modify discovery filters. Existing persistence across Home tabs and Match remains. |
| `src/context/MessageActivityContext.js` | Guards inbox/block values, errors, banner navigation, and exact-session reattachment; adds explicit retry. Session-wide badge/banner ownership remains. |
| `src/components/IncomingCallListener.js` | Hosts the single Quick Match owner alongside CP27 incoming-call reception; ordinary incoming call presentation takes precedence. CP27 subscription remains singular. |
| `src/components/QuickMatchListener.js` (new) | One serial five-second poll for approved online foreground Hosts across tabs/nested routes; cleanup on ineligibility/background/session replacement; guarded block checks, expiry, dismiss replay suppression and retry. |
| `src/components/QuickMatchOfferCard.js` | Ref-based response lock, deadline timer and acceptance recheck; authoritative respond endpoint retained. A successful accept may complete after the server changes Host availability to Busy, but cannot navigate an obsolete/background session. |
| `src/screens/host/HostDashboardScreen.js` | Removes the Connect-owned offer poll; discovery/Today remain focus-scoped; guards availability reconciliation and late feedback. |
| `src/screens/main/MatchScreen.js` | Active Consumer request polling remains alive across tabs, serializes requests, skips background ticks/results, guards start/cancel and deduplicates call navigation. Normal call disclosure is target/focus-bound. |
| `src/components/SponsoredCallInviteBanner.js` | Home-scoped reads and response continuations are guarded, with a response lock and safe failure dismissal. Not converted into a global listener. |
| `src/components/GiftTray.js` | Visibility/recipient/call/session guard, duplicate-tap lock, stable retry identity, and guarded server-success/recharge callbacks. |
| `src/screens/main/ChatDetailScreen.js` | Conversation-target/session ownership, scoped preparation/access/relationship/history/metadata, guarded sends/block/report/invite actions; preserves newest-250 chronological history and drafts across temporary blur. |
| `src/services/messagingService.js` | Conversation preparation stops its read chain after invalidation; metadata subscription suppresses queued values/errors after unsubscribe or Auth replacement. Message query bounds/order unchanged. |
| `src/screens/main/MessageHomeScreen.js` | Screen-focused inbox/notices; presence completion ordering; guards first-page/load-more call history and identity resolution, with a load-more lock. |
| `src/services/followService.js` | Exact Auth/session checks for relationship snapshots, errors, capability responses, queued friendship synchronization, and follow/unfollow write preparation. Existing schema and authorization unchanged. |
| `src/screens/main/FollowingScreen.js`, `src/screens/main/BlockedUsersScreen.js` | Suppress obsolete list/action completions; Following adds load ordering/cleanup. |
| `src/screens/main/UserProfileScreen.js` | Reputation stays focus-scoped; guard profile/Level/Gift reads and social/invite/report callbacks; clear target-scoped display/busy state. |
| `src/screens/main/CallSummaryScreen.js` | Guard relationship/review reads and review/follow completion feedback. |
| `src/screens/host/HostActivityScreen.js` | Existing bounded/versioned feed stays screen-owned; row invite callbacks are session/focus-bound. |
| `src/screens/host/HostEarningsScreen.js` | Focus-owned authoritative earnings subscription, guarded values/errors/retry and cleanup. |
| `src/screens/main/VideoCallScreen.js` | Guard call-document errors/values, RTC permission and credential continuations, queued connection reports, heartbeat/payment timers, end/navigation, AppState and Gift feedback. Call remains mounted behind its Chat overlay. |
| `src/services/callService.js` | Exposes call-document subscription error callback to the screen. |
| `src/services/rtcService.js` | Rechecks caller lifetime after initialization before preview/channel join. No credential or Agora authority change. |
| `src/services/callNavigationService.js`, `src/screens/main/HomeScreen.js` | Guard disclosure confirmation, prepare/request chain and delayed recharge navigation against obsolete origin/session. |
| `src/screens/main/RewardsScreen.js`, `src/screens/main/MyLevelScreen.js` | Guard reads/subscription/midnight refresh, claims and follow-up reads/feedback; clear stale claim-busy indicators. No local rewards or Level authority. |
| `src/screens/main/MyProfileScreen.js` | Guard count and application read completions. |
| `src/screens/main/WalletScreen.js`, `src/screens/main/RechargeHubScreen.js`, `src/screens/main/VIPStoreScreen.js` | Guard authoritative read results/errors. No financial mutation or checkout activation. |
| `src/screens/main/EditProfileScreen.js`, `src/screens/host/HostApplicationScreen.js` | Guard hydration, permission/picker continuations and asynchronous profile/application follow-up actions. Storage gate remains unchanged. |
| `src/services/socketService.js` | Importing the dormant singleton no longer attaches AppState; connect owns the event, disconnect removes it and timers/notification queue; old connection callbacks cannot affect a replacement. |

## Ownership and session safety disposition

- **Correct baseline owners:** Auth/profile bootstrap (1), CP27 incoming listener/card (2-3), visual-only component lifetimes (45). Their ownership was retained.
- **Intentionally screen-scoped:** Who Viewed Me (31), discovery (35), own identity read (42), plus messaging lists/chat, profiles, relationships, rewards, earnings, Activity and reviews. Existing cancellation/version checks combine with the new keyed session subtree; these were not all globalized.
- **Session-wide:** Auth/profile, presence, unread/banner activity, incoming calls, and the now-correct Host offer owner. An active Consumer Quick Match request survives tab blur while its Match component remains mounted.
- **Logout/account replacement:** Captured session capability fails immediately on invalidation; root remount disposes local state. Old logout actions cannot target a new owner. Firebase sign-out remains the state authority.
- **Same UID:** Session keys/capability identity, not UID equality, distinguish successive sessions. Presence additionally captures the Auth object. Tests replace same-UID sessions before resolving delayed work.
- **Queued values/errors:** Snapshot guards, local alive/request versions, and checks around awaits reject stale updates. Unsubscribe alone is not relied on for the fixed callback paths. Already-dispatched server operations are not cancelled or rolled back by a UI guard; authorization/idempotency remain server responsibilities.
- **Unmount/target changes:** Cleanup invalidates guards, removes listeners and clears timers. Call target changes reset call-local evidence/clock/queue state. Chat target changes clear draft/history; temporary blur preserves the unsent draft.
- **Route changes:** Host offers and incoming calls remain reachable across Connect/Messages/Activity/Profile. Screen-specific reads detach or invalidate on focus exit where applicable. Mounted VideoCall retains call ownership behind call Chat. Its established connected-call background termination behavior is unchanged.
- **Foreground/background:** Host offer attachment is foreground-only and reattaches on return. Consumer polling skips work/results while backgrounded. Presence follows AppState. This is not push, background execution, native incoming-call UI, or terminated-app delivery.
- **Duplicate risks:** One root offer owner; no Connect duplicate. Polls serialize within their owner lifetime; response locks cover Quick Match and Gifts, and history paging/send initiation have local locks. An uncancellable old network request can still overlap a new lifecycle's request, but its completion is ignored.

## Regression coverage

26 changed/new test files cover exact-session replacement, stale success/error callbacks, unmount, recipient changes, focus behavior, duplicate presses, block/expiry checks, background offer responses, presence cleanup, RTC initialization and delayed logout. Existing CP25/26/27 tests remain part of the full run. Some changed UI tests only receive the required stable authenticated-session mock; they are not counted as new lifecycle scenarios.

Focused command: local Jest with `--runInBand --silent --runTestsByPath` and all changed/new test paths. Result: **25 suites, 275 tests passed**. Earlier recovery checks also passed (8 suites/111 tests; then 23 suites/254 tests), superseded by the final focused result.

The first full root run exposed an obsolete CP24 cleanup fixture that never delivered an Auth callback and attempted logout again while signed out. Updated that fixture to authenticate before testing shared in-flight termination and to establish a new session before a subsequent attempt. Assertions for one sign-out/cleanup per flight remain. Supplemental focused validation: cleanup + UserContext suites, **2 suites / 39 tests passed** (overlaps the 275-test focused run; do not add these counts). Production stale-session rejection was not weakened.

## Safety review

Reviewed production diffs and new files, plus targeted added-line scans. No client Credit/purchased-Credit mutation, local ledger fallback, fake Gift success, fake production calls/identities, broad `AsyncStorage.clear()`, role switching, Storage enablement, simulated translation, new financial constants, Paystack secret, or Agora certificate was introduced. Existing development-only simulator/prototype paths were not activated. Backend files, rules, indexes, package manifests/lockfiles, environment files and deployment configuration are unchanged.

No emulator run is needed for this change: no backend implementation, rule, query contract, write schema or financial/security policy changed. The client follow guard narrows when the existing operation may proceed; it does not change authorization. Unit tests do not establish deployed backend or native-device behavior.

## Limitations and deferred work

- Physical testing was **not performed**. Two-phone testing is recommended before release: online Host accepts from every tab and a nested screen; repeat with block/expiry, rapid accept/decline, foreground/background, logout and same-UID relogin; verify call Chat/Gifts do not duplicate RTC ownership; verify message drafts and newest-250 order.
- Background/push/terminated-app reachability remains unavailable. An accept already submitted before background may create an authoritative call even when its late UI navigation is suppressed; existing backend preconnect timeout/recovery must settle it. No new recovery protocol or push provider was added.
- Storage/media, translation, payments/checkout, payouts, referral economics, undecided commercial values and deployment remain deferred. Dormant media paths were guarded, not enabled or physically validated.
- Older-than-250 message pagination remains deferred; CP26 history bounds/order are preserved.
- Host Activity remains bounded per source; discovery remains bounded. No invented pagination or people.
- Inactive follower-count adapter and dormant prototype surfaces remain inactive. Socket import-time resources were corrected without making it a real transport. Live recipient Gift animation remains deferred.
- Native Agora event attribution across rapid channel replacement still requires device verification. JavaScript tests exercise callback/lifetime guards, not the native SDK or OS background scheduling.
- Presence cleanup intentionally does not write through an obsolete session. An old account's last online record may remain until its existing freshness policy expires; no new presence backend was introduced.

## Outcome

CP28 implementation is complete. Final local validation results are recorded below. This is a client lifecycle checkpoint, not a claim of production deployment or physical validation. All changes remain unstaged, with no commit, push or deployment.

## Exact changed/new test files

```text
src/components/__tests__/discoveryFilterModal.test.js
src/components/__tests__/giftTray.test.js
src/components/__tests__/incomingCallLifecycle.test.js
src/context/__tests__/messageActivityUi.test.js
src/context/__tests__/userSessionIsolation.test.js
src/navigation/__tests__/accountNavigation.test.js
src/screens/host/__tests__/hostActivityUi.test.js
src/screens/host/__tests__/hostConnectUi.test.js
src/screens/main/__tests__/callPaymentUi.test.js
src/screens/main/__tests__/consumerLevelVisibility.test.js
src/screens/main/__tests__/discoveryProfileUi.test.js
src/screens/main/__tests__/hostAccountUi.test.js
src/screens/main/__tests__/messageEntitlementUi.test.js
src/screens/main/__tests__/myLevelUi.test.js
src/screens/main/__tests__/privacyIdentityUi.test.js
src/screens/main/__tests__/profileViewTrackingUi.test.js
src/screens/main/__tests__/rewardsUi.test.js
src/screens/main/__tests__/truthfulUi.test.js
src/services/__tests__/callEntry.test.js
src/services/__tests__/clientAuthorityCleanup.test.js
src/services/__tests__/followHelpers.test.js
src/services/__tests__/messageHistory.test.js
src/services/__tests__/rtcService.test.js
src/components/__tests__/quickMatchLifecycle.test.js
src/screens/main/__tests__/screenSessionLifecycle.test.js
src/services/__tests__/sessionListeners.test.js
```

## Final file manifest

The production map and test list above enumerate all 64 JavaScript files (38 production, 26 tests). Documentation consists of this report and `docs/realtime-listener-session-audit-git-status.txt`. Total final scope: **66 files: 59 modified tracked files and seven untracked files**.

The seven new files are:

```text
docs/realtime-listener-session-audit-report.md
docs/realtime-listener-session-audit-git-status.txt
src/components/QuickMatchListener.js
src/components/__tests__/quickMatchLifecycle.test.js
src/hooks/useSessionGuard.js
src/screens/main/__tests__/screenSessionLifecycle.test.js
src/services/__tests__/sessionListeners.test.js
```

The raw final `git status --short` artifact is generated as the final filesystem write, after this report and validation are finished. It includes itself. No file is staged.

## Final validation results

| Check | Result |
|---|---|
| Focused CP28 run | PASS: 25 suites / 275 tests |
| Supplemental cleanup/UserContext run | PASS: 2 suites / 39 tests; overlapping coverage, not an additive total |
| Complete root Jest rerun | PASS: 76 suites / 860 tests, 66.829 seconds |
| Functions Jest | PASS: 17 suites / 402 tests, 16.053 seconds |
| Babel parse | PASS: all 64 changed/new JavaScript files |
| `git diff --check` | PASS, exit 0 |
| Emulator/security integration | Not run: no backend/rules/query/write-contract change |
| Physical/two-phone testing | Not performed; recommended before release |
| Firebase deployment | Not performed; not required for this client-only checkpoint |

Root Jest also discovers the Functions tests; the 860 and 402 totals are separate command results, not additive coverage. Local Node initially encountered a sandbox parent-directory EPERM; the installed local test tools ran successfully with approved execution outside that restriction. No packages were installed. Routine React Native deprecation/log output in the first focused run did not fail tests.

Final branch is `amira-v2`; HEAD and locally recorded `origin/amira-v2` both equal `2a3d70ce819e1e78da41c0bd8214a456fed622c2`. No network fetch was performed. The index is empty. All 59 tracked modifications and seven new files remain unstaged. No commit, push, or deployment.

**GO for review of the completed CP28 client changes.** Native two-phone validation and deferred external dependencies remain explicit release limitations.
