# CP31 - Error recovery, offline and network failure audit

## 1. Baseline

Repository: `C:\Users\NiBS-GA\Amira-1`. Verified before editing:

- Branch: `amira-v2`.
- HEAD: `8dcd9e4451e10b79e24d9df8b6a538f5da5ae4dd` (`8dcd9e4`).
- `git status --short`: empty, clean working tree.

No reset, stash, staging, commit, push, Firebase deployment, billing change, Storage activation, navigation redesign or economics change. The media environment gate remains unchanged. No secrets were read for this audit.

## 2. Scope and method

Repository source audit plus focused failure-injection tests. Searched production screens, components, context and services for loading/busy/sending, pending/processing/submitting/uploading, disabled actions, catches, listener errors, awaited continuations and recovery paths. The loading/action search matched 189 occurrences across 38 of 67 screen/component files. Traced financial mutations to their existing callable/transaction implementations and compared CP24-CP30 reports with current code.

This is source and mocked-runtime evidence, not a network laboratory or device certification. The table groups meaningful flows; dormant/unavailable features are not counted as functioning product paths. No new outbox, connectivity framework, backend schema or API contract was introduced.

## 3. Files and flows inspected

Paths below are relative to `src/` unless prefixed with `functions/`. Screens refer to `screens/main`, `screens/host`, or `screens/onboarding` as appropriate.

| Area | Inspected entry points and implementation | Recovery finding |
|---|---|---|
| Auth/session | `LoginScreen`, `context/UserContext`, `services/firebaseService`, `services/sessionTerminationService`, `services/applicationStorageService`, `navigation/RootNavigator`, `hooks/useSessionGuard`, `hooks/useActionLock` | Authentication and profile readiness are distinct. Profile errors fail closed and offer retry. Exact session tokens and the keyed root invalidate same-UID replacement. Login intents are serialized. Corrected misleading credential errors and confirmed onboarding-save/refresh conflation. Quick Login remains development-only; issued Auth requests are not cancellable by UI guards. |
| Onboarding | Name, Birthday, Gender, Country setup handlers and `UserContext.updateProfile` | Validation precedes save; synchronous action lanes protect duplicate presses. Confirmed writes now recover through profile loading when the subsequent refresh fails; no local profile authority is invented. |
| Profile | `EditProfileScreen`, `UserProfileScreen`, `MyProfileScreen`; `hostProfileService`, `publicIdentityService`, profile-view callers | Exact target/session continuation guards; profile failure does not fabricate a profile. Edit Profile now distinguishes saved metadata from failed refresh. Auth display-name and Firestore changes remain separate operations. Reopen/refocus is the recovery path for some profile reads. |
| Messaging/entitlement | `ChatDetailScreen`, `MessageHomeScreen`, `context/MessageActivityContext`; `messagingService`, `followService`, `chatPassService`; `functions/src/socialMessaging.js` | Same logical message ID retained for unchanged-text retries. Paid unlock and Free Message/Chat Pass consumption stay atomic on the server. Read acknowledgement is best effort. Added visible inbox, notice, message and conversation subscription recovery. |
| Gifts | `components/GiftTray`, profile/chat/call consumers, `giftService`; `functions/src/giftService.js` | Only acknowledged send invokes success. Same-Gift retry retains its request ID within the mounted owner. Purchased-Credit and inactive-call rejection remain explicit. Catalog failure is unavailable, with reopen to retry. No local debit or earning grant. |
| Calls/native | `VideoCallScreen`, `CallSummaryScreen`, `IncomingCallListener`, `IncomingCallCard`; `callNavigationService`, `callService`, `rtcService`, `callUiState`; `functions/src/callRecovery.js`, relevant connection/settlement references | End is retryable; authoritative result drives summary. Native join does not itself create authoritative connected state. Found and fixed retained RTC evidence after uncertain end. Incoming listener remains root-owned; failure offers retry. |
| Quick Match | `MatchScreen`, `QuickMatchListener`, `QuickMatchOfferCard`, `quickMatchService`; `functions/src/quickMatchService.js` | Stable start key, serialized polling, foreground checks, offer deadline and authoritative reservation/refund remain. Poll/cancel failures are now visible. No second request ID generated for an uncertain start retry. |
| Sponsored calls | `SponsoredCallInviteBanner`, outgoing profile/chat/activity handlers, `sponsoredInviteService`; `functions/src/sponsoredInviteService.js` | Pending-pair protection, accepted-call replay and changed-terms response remain authoritative. Added visible pending-read error/retry and session-owned response lock. Pending UI is a focus/retry read, not a new real-time listener. |
| Rewards/Level | `RewardsScreen`, `MyLevelScreen`; `rewardsService`, `levelService`; claim transaction references in `functions/src/consumerRewards.js`, `consumerLevels.js` | Existing deterministic claims and CP30 confirmed-success/failed-refresh separation retained. No fabricated balance. Dashboard/listener read failures have retry. |
| VIP/payment | `VIPStoreScreen`, `VipInfoScreen`, `RechargeHubScreen`, `WalletScreen`, `PaymentScreen`, `PaymentMethodScreen`; `vipService` | Failed VIP status read displays unavailable and retry, not FREE. Purchasing/checkout remains unavailable. Read failures are not evidence of zero Credits. |
| Social | `UserProfileScreen`, `FollowingScreen`, `BlockedUsersScreen`, `CallSummaryScreen`; `followService`, `blockService`, profile-view service, server social/review references | Follow/unfollow, Like/unlike, hide and block are desired-state mutations, with synchronous action lanes and guarded continuations. Friends synchronization remains server-derived. Blocked lists have explicit retry; Following and some relationship listeners recover by refocus. |
| Views/Host activity | `WhoViewedMeScreen`, `HostActivityScreen`, `HostVisitorsScreen`, `HostDashboardScreen`, `HostEarningsScreen`; `hostActivityService`, `hostConnectService`, `hostEarningsService`, `profileViewService` | Views/activity distinguish failed loads from empty results and offer retry. Activity covers Visitors, Likes, Followers, Gifts and Calls. Host availability reconciles after mutation failure; busy state is server-owned. Earnings listener failure does not fabricate zero earnings. Version/focus guards plus keyed session root protect read screens. |
| Reporting/safety | `ReportUserModal`, profile/chat report callbacks, in-call report/block-and-end; `reportService` | Stable create-only report identity prevents duplicate documents, but cannot recover a receipt by reading. Failure is not success. Block and call-end are independent authoritative steps; report/block controls remain available during unconfirmed call end. |
| Creator/media | `HostApplicationScreen`, `hostApplicationService`, `mediaService`, `applicationStorageService`; Creator tests | Inspected draft load/save, all seven steps, main/gallery/video/verification uploads, removal, payout selection and Submit. Added server-only editable hydration/reconciliation, confirmed-photo partial-success handling and session-owned lock. Media gate unchanged. |
| Discovery | `HomeScreen`, `MatchScreen`, `FollowingScreen`, discovery/filter hooks and callers | For You/New/Following have truthful failed-load states; request versions reject obsolete tab/filter completions. No offline seed data added. Normal Match and Quick Match remain distinct. |
| Notifications/notices | `MessageActivityContext`, `MessageHomeScreen`, `noticeService` | App-wide message activity retains its existing retry/ownership. Notice mark-read errors remain visible. Added independent notice loading/error/re-subscription. |
| Unavailable/dormant paths | Root route inventory, existing truthful UI and authority regression suites; GiftLedger, payment and VIP information screens | No fake uploads, financial history, checkout or new route activation. Legacy unregistered onboarding/media prototypes remain outside active product scope. |

## 4. Defects found and exact fixes

1. **Inbox and notices disguised subscription failure as empty data.** `MessageHomeScreen` now has independent loading/error/retry state. Errors remain visible above previously received rows. Empty-copy is suppressed while updates are unavailable. Inbox loading no longer waits for optional presence enrichment. Effect-local ownership rejects queued callbacks after retry/unmount/session replacement.
2. **Chat listener failures silently stopped loading.** `ChatDetailScreen` now presents message/conversation errors and a Retry updates action. It reattaches subscriptions and retries preparation/identity/access reads. Existing messages and unsent text are preserved. Effect-local active flags protect same-session replacement subscriptions.
3. **Sponsored invitation read failure disappeared.** The banner now shows an explicit read failure and retry. Its response lock belongs to the current guard, so an obsolete completion cannot release a replacement owner's lane.
4. **Quick Match poll errors were swallowed and cancellation error text was never rendered.** Errors now remain visible while the authoritative request stays active; the existing serialized poll retries. Cancellation retries the same request. Start uncertainty retains its stable key. Lock/busy/navigation bookkeeping resets by exact session owner.
5. **A confirmed Creator photo draft followed by failed profile mirroring still showed the previous photo and an upload-failed alert.** The acknowledged draft photo is now selected immediately. A mirror failure reports application-photo success with unconfirmed profile synchronization. Both files are retained because the profile may still reference the old file.
6. **After an uncertain Creator media metadata write, another action could reuse stale local media arrays.** Media-write failure now blocks editing through existing draft-load recovery. Retry reloads from the server (`getApplication({requireServer:true})`), with no cache fallback in this editing path. Uploaded media is retained. Ordinary read consumers keep the default read behavior. No backend contract changed.
7. **Creator lock and draft presentation could survive a replacement owner in a reused component.** The action lock is scoped to the session guard; replacement clears busy/draft presentation before new hydration. The keyed root remains the primary session boundary.
8. **Edit Profile treated a successful photo/profile write plus failed refresh as a failed save.** Nested refresh handling now reports saved state with refresh unavailable. Actual write rejection still cannot report success.
9. **Onboarding profile writes conflated acknowledged save with follow-up hydration failure.** `UserContext.updateProfile` now routes the latter through the existing profile-error/retry lifecycle. It does not resubmit the write or merge an authoritative profile from client input.
10. **Network login failure accused the supplied credentials.** Only explicit invalid-credential/user/password codes use that explanation; other failures offer a connection/retry message.
11. **Failed end acknowledgement retained RTC connection evidence after leaving the channel.** `VideoCallScreen` clears evidence/local rendering on departure and ignores late RTC events for that departed session. Releasing the end lock no longer restarts connected heartbeats. End retry and server call snapshots remain available; no final charge is inferred locally.

## 5. Production files changed

- `src/components/SponsoredCallInviteBanner.js`
- `src/context/UserContext.js`
- `src/screens/host/HostApplicationScreen.js`
- `src/screens/main/ChatDetailScreen.js`
- `src/screens/main/EditProfileScreen.js`
- `src/screens/main/MatchScreen.js`
- `src/screens/main/MessageHomeScreen.js`
- `src/screens/main/VideoCallScreen.js`
- `src/screens/onboarding/LoginScreen.js`
- `src/services/hostApplicationService.js`

Ten production files. No Functions, rules, indexes, package/dependency files, economic configuration or navigation topology changed.

## 6. Authority and recovery classification

| Classification | Evidence | UI/retry behavior |
|---|---|---|
| A - confirmed success | Callable/transaction/write acknowledged completion | Show success from returned state. A later dashboard/profile refresh failure is reported separately or routed to profile recovery. |
| B - confirmed failure | Explicit permission, validation, insufficient purchased Credits, inactive call or entitlement rejection | Show rejection; do not grant/debit locally. Release the current owner's action when the request settles. |
| C - unconfirmed | Timeout, unavailable response, lost acknowledgement, uncertain draft write | No success inference and no financial compensation. Retain supported request identities; reconcile or retry. Creator editing requires a server read before further metadata changes. |
| D - local pre-dispatch | Picker cancel, permission denial, local validation/native dependency failure | Cancellation is quiet; denial is actionable. No server success. Finally/owner guards release current UI for retry. |

A stale UI guard suppresses client continuation. It cannot undo a request already dispatched. Server-ledger authority for purchased Credits, rewards, Level, VIP, Gifts, earnings, messaging entitlement, call accounting, sponsored calls and Quick Match remains unchanged.

## 7. Listener recovery findings

- Profile listener errors invalidate ready state and use existing bootstrap retry. Exact authenticated-session identity includes same-UID replacement.
- Inbox/notices/chat now distinguish failed subscriptions from successful empty results and support controlled re-subscription. Old subscriptions are cleaned before replacement; late callbacks are ignored.
- Ordinary SDK reconnect remains SDK-owned; no aggressive reconnect loop was added.
- Incoming calls and Host Quick Match retain one root owner. Foreground/background cleanup and existing user-triggered retry remain intact. Quick Match polling stays serialized at its existing interval.
- Host earnings/rewards and app-wide message activity already expose failure/retry. Some optional profile relationships/reputation and Following reads rely on refocus/reopen, not a new retry button.
- Firestore cached snapshots are still historical cached data, not a guarantee of current server state. There is no app-wide connectivity/freshness indicator in this checkpoint. Explicit listener-error recovery does not prove every prolonged-offline cache case.

## 8. Retry and idempotency findings

Preserved CP30: Gift sender/request identity and payload validation; message identity and atomic entitlement; create-only report ID; Quick Match request and accepted-call identity; deterministic call increment ledger and terminal replay; sponsored pending-pair/accepted-call protection; deterministic daily/task/Level claims and call reviews; relationship desired-state operations.

Some IDs are memory-only. Process death, a new device, changed message text, selecting a different Gift, or a new intent can leave the prior intent uncertain. No exactly-once cross-device guarantee or durable outbox is claimed. Sponsored send uses pending-pair protection; it is not a durable receipt for an arbitrarily late new send.

## 9. Call recovery findings

Native join/permissions/credentials failures do not grant connected authority. One-active-call locks, connection leases, epochs/sequences, settlement identities and recovery transactions remain backend-owned. Leaving RTC alone is not call-end acknowledgement. A lost end response leaves a visible, retryable End Call with no fabricated summary. CP31 prevents detached RTC evidence from renewing connection heartbeats. The regression injects a late native event and advances heartbeat timers after a rejected end.

Periodic settlement failures still retry at the existing interval and never debit a client wallet. Server leases/reconciliation govern unresolved calls and release locks only according to backend state. There is no newly added cross-process call-resume UI or durable start receipt. Normal start still relies on authoritative active-call locks rather than a persistent client request key. Call listener failure offers a safe End Call path rather than silently treating a local snapshot as final.

The 10-second paid increment, sponsored 30-second segment, FVT and automatic paid continuation rules are unchanged. Native disconnect/reconnect, OS suspension and singleton SDK event timing still require device testing.

## 10. Creator/media recovery findings

Storage remains unavailable. `EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS=true` remains the explicit future gate; it was set only inside existing mocked tests, never in project configuration. No real upload was performed.

Picker cancellation makes no write; denial releases the action. Upload success followed by uncertain draft write retains the new object and requires server reconciliation. Replacement deletes old media only after acknowledged metadata replacement (and, for main photo, acknowledged profile mirroring). Removal deletes only after acknowledged metadata removal. Cleanup remains best effort and cannot turn metadata success into a failed action. Mirror uncertainty retains both files. Submission status remains authoritative; refresh failure does not retract a confirmed Submit.

Orphan retention is intentional under uncertainty; no automatic garbage collector or compensating delete was introduced. Cached draft fallback cannot unlock editing after a failed server reconciliation.

## 11. Tests added/updated

Nine test files:

- `src/context/__tests__/userSessionIsolation.test.js`: confirmed onboarding save + failed refresh enters recovery; retry reads without repeating write.
- `src/screens/host/__tests__/creatorActionIntegrity.test.js`: uncertain draft blocks editing, profile-mirror failure preserves acknowledged photo, cancellation and denial recover; retained submit single-flight/stale tests.
- `src/screens/main/__tests__/callPaymentUi.test.js`: late RTC event and timer ticks cannot renew connection evidence after uncertain end; retained end-retry/summary/safety tests.
- `src/screens/main/__tests__/discoveryProfileUi.test.js`: sponsored read retry, uncertain Quick Match cancellation retaining request; retained stable-start identity/poll/session tests.
- `src/screens/main/__tests__/messageEntitlementUi.test.js`: failed listener preserves history, replaces subscription, rejects obsolete callback; retained lost-send-ID/session tests.
- `src/screens/main/__tests__/privacyIdentityUi.test.js`: inbox and notice error versus empty, cleanup, replacement callback suppression and successful retry.
- `src/screens/main/__tests__/screenSessionLifecycle.test.js`: confirmed profile save remains saved when refresh fails.
- `src/screens/onboarding/__tests__/actionIntegrity.test.js`: network failure copy and retry; retained validation/double-action/session tests.
- `src/services/__tests__/hostApplicationService.test.js`: server-required reconciliation rejects offline instead of falling back to cache.

Deferred promises and fake timers are used where they exercise ownership/uncertainty. Existing full-suite regressions cover logout/account/same-UID replacement, unmount, same-frame actions, stable IDs, backend authority, claims, listener lifecycles and native permission failures.

## 12. Validation results

| Check | Result |
|---|---|
| Full root Jest: `node node_modules/jest/bin/jest.js --runInBand --silent` | **82 suites, 956 tests passed**, 138.814 seconds |
| Separate Functions Jest from `functions/`: `node ../node_modules/jest/bin/jest.js --runInBand --silent` | **17 suites, 402 tests passed**, 28.217 seconds |
| Babel transform of changed JS | **19 files passed** |
| `git diff --check` | Passed, including final artifacts |
| Physical/network/device execution | Not performed |

The root suite also discovers Functions tests; the separate Functions run is required validation, not an additional set of unique tests. Thirteen tests were added beyond the baseline 943; existing tests were updated where behavior intentionally changed.

Focused pass 1: 7 suites, 103 tests. Focused pass 2 after onboarding/server-read additions: 3 suites, 45 tests. These runs overlap and are not additive unique-test counts. An initial focused run exposed a missing async `act` wait in the new inbox test; the test was corrected and rerun successfully. Initial un-escalated Node invocation failed with Windows `EPERM` resolving the user directory. Node checks subsequently ran with approved sandbox escalation.

Babel transformed all 19 changed JavaScript files with installed `babel-preset-expo`, `configFile:false`, `babelrc:false`. `git diff --check` also passed after the report and status manifest were generated.

Emulators are not run: no backend, Firestore/Storage rules, schema or callable contracts changed. The new server-required read uses the existing authorized application document; it is a client read-source choice.

## 13. Deferred limitations

- No durable outbox or cross-process exactly-once guarantee; memory-only request IDs remain as allowed by CP30.
- Create-only report rules prevent duplicate reports but cannot recover a lost receipt. A denied replay is not proof of success.
- There is no universal application-owned deadline/cancellation for every SDK/native promise. In particular, queued Firestore writes can remain pending offline. A never-settling operation may retain its busy lane until SDK completion or session/screen replacement. This checkpoint does not release those lanes and allow competing writes while an earlier request is still unresolved. Prolonged-offline busy behavior remains a release-validation risk, not a passed guarantee.
- No global online/offline banner or server-freshness label for all cached reads. Server-only Creator editing is deliberately stricter than optional/read-only cached presentation.
- Some read/listener retries require refocus/reopen. Sponsored invitations refresh on focus/manual retry; this is not a continuous invitation listener.
- Normal call start has no persistent client request identity/resume UI; authoritative locks, expiry and reconciliation remain the recovery boundary.
- Native channel event ordering, permission dialogs and background transitions are unproven on devices here. No physical-device tests or real cloud/network fault injection were performed.
- Media can leave intentionally retained orphan objects after uncertainty or failed cleanup. Storage availability and an approved cleanup policy are prerequisites for production media operation.
- Separate Auth/profile and Creator draft/profile writes are not distributed transactions. Confirmed partial success is now truthful in the changed paths, but cannot be made atomic by a UI guard.

## 14. Later physical test matrix - NOT PERFORMED

Use test accounts and approved test balances. Laptop observes logs/authoritative records without editing balances; Phone1 and Phone2 perform the interactions. Capture request/call IDs and before/after server records. Re-enable connectivity before reconciliation. All entries below are planned, not executed.

| Scenario | Laptop | Test Phone1 | Test Phone2 | Required observation |
|---|---|---|---|---|
| Wi-Fi/mobile loss during text send | Compare message ID and entitlement/paid ledger | Send unchanged text, disable Wi-Fi/data around dispatch, restore and retry | Observe recipient history | One logical message/charge for same ID; no false success; listener error/retry distinct from empty |
| Gift interruption | Inspect Gift request/transaction and purchased wallet | Send profile/chat/in-call Gift; interrupt response; retry same Gift | Observe Host Gift/earnings | One transaction for retained key; no local balance subtraction; no unacknowledged success |
| Call creation then loss | Inspect active locks, status and expiry | Start disclosed call then lose network | Accept or let expire | No fabricated connection or second active call; backend lock recovery |
| End under unstable network | Record call ID, increments and terminal replay | End while response is dropped; restore and retry End | Observe peer ending/recovery | No summary until acknowledgement, no detached connected heartbeats, final ledger authoritative |
| Agora disconnect/reconnect | Compare lease/epoch/sequence and duration | Disable network briefly, restore within grace | Stay connected then repeat as disrupted peer | Native state and server connection reconcile; no duplicate join/billing or cross-call callback |
| Quick Match interruption | Record request/reservation/call IDs | Start, interrupt, restore; separately cancel with lost response | Host accept/decline around deadline | Same retry identity, visible uncertainty, no duplicate reservation/call/refund |
| Sponsored invitation interruption | Inspect pair/invite/call; vary approved terms in controlled fixture if available | Consumer read retry; accept after interruption/terms refresh | Host sends, then changes availability | Read failure visible; current terms reviewed; accepted replay uses existing call |
| Logout pending operation | Observe authoritative completion versus UI cleanup | Logout while send/report/save pending | Observe counterpart | No old alert/navigation/account data after logout; dispatched write may still commit |
| Account replacement | Observe listener/operation ownership | Replace account A with B while pending | Act as A counterpart | No A callbacks/state entering B; B actions are not unlocked by A finally |
| Same-account relogin | Record separate authentication session | Logout/relogin same UID while reads/actions pending | Observe counterpart | Old exact-session continuation suppressed; replacement subscriptions own UI |
| Background/foreground | Count listeners/polls/timers; inspect call settlement | Background from inbox, Match and active call; return repeatedly | Keep peer active | No duplicate root listener/timer; existing call-background policy retained; safe recovery |
| Android permission/cancel | Observe absence of metadata writes | Deny camera/library/microphone, cancel picker, then retry | Check peer call state where applicable | Recoverable UI, cancellation quiet, no fake upload or connected state |
| Creator media once Storage is available | Inspect object paths and server draft/profile | Interrupt upload, draft acknowledgement and profile mirror separately; reload | Separate review account if authorized | Referenced media retained; server reconciliation before edits; old cleanup only after acknowledgement |
| Confirmed claim + refresh outage | Compare deterministic claim/ledger | Claim daily/task/Level while blocking follow-up reads | Not required | Confirmed reward remains success; no repeated grant from retry |
| Listener first-load/error/reconnect | Record authoritative collection state | Open inbox/notices/chat offline, restore, retry and change session | Send a new message | Failure/cache behavior distinguishable; fresh subscription receives updates; obsolete callbacks harmless |

## 15. Production readiness and final Git state

CP31 improves truthful recovery for the demonstrated defects and retains server financial authority. It is not a production-readiness certification. The prolonged-pending-write, cached-freshness, process-death and physical-native limitations above remain material. Payments and media stay unavailable until their separately authorized infrastructure/workflows are ready.

Final change count: **10 production JavaScript files + 9 test JavaScript files + 2 audit artifacts = 21 files**. HEAD and branch remain the verified baseline; the index is empty. All changes are unstaged. Final path-level status is recorded in `docs/error-recovery-audit-git-status.txt`. No commit, push or deployment was performed.
