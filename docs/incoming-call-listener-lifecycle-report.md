# CP27 - Incoming-call listener lifecycle

## Baseline and scope

Verified before editing: branch `amira-v2`, HEAD/latest commit `5ababa9b8274fe6c89e695b75abcdd8288e9752e` (`fix: load recent message history correctly`), clean working tree. Local `origin/amira-v2` resolves to the same commit; no fetch or claim of a live remote comparison. No packages installed.

The audit issue was CONFIRMED. Only foreground incoming-call ownership and its session/UI safety changed. No Functions, shared contracts, rules, indexes, Firebase configuration, commercial constants, or billing code changed.

## Active pre-change path and root cause

`App.js` mounts `UserProvider` outside `NavigationContainer`. `AppContent` waits for profile loading and splash completion, then renders `RootNavigator`. The root selects authentication, profile completion, or the authenticated stack; `MainTabNavigator` selects permanent approved-Host tabs using `hostStatus.isApproved === true`.

`HostDashboardScreen` (Host Connect) was the only production caller of `callService.subscribeIncoming`. Its effect required approved Host, UID, focused Connect screen, and online availability. Availability came from `getHostAvailability` through `hostConnectService`, with busy status from the live profile taking precedence. The effect returned Firestore unsubscribe. Blur, offline/busy status, UID/eligibility changes, and unmount removed it. Navigating to Messages, Activity, Profile, or a nested stack screen therefore stopped incoming-call reception. Consumers and pending applicants did not attach it.

The unchanged exact Firestore query is `calls`, `participantIds array-contains uid`, `receiverId == uid`, `status == ringing`, ordered by `createdAt desc`, `limit(1)`. Rules authorize participant reads; this is not Realtime Database or a push channel. `startVideoCall` creates the ringing call through authenticated Functions, with roughly 30-second expiry, block checks, Host eligibility/availability checks and participant active-call locks. Existing sponsored/Quick Match entry flows remain separate.

There was no call-state provider. `IncomingCallCard` was an absolute overlay inside Connect. The ordinary tab architecture normally mounted one Connect instance, but ownership was screen-scoped rather than centrally guaranteed. Its listener callback had no session token or queued-callback guard. Unsubscribe alone did not prove that queued snapshots were harmless after logout, A-to-B replacement, or same-UID replacement. Card identity reads had an effect-alive guard and UID ownership; in-flight acceptance did not guard navigation against replacement authentication.

Before CP27 the incoming effect did not observe AppState. A focused mounted Connect might keep a Firestore subscription during backgrounding until the runtime/network suspended; that was not reliable background call reception. Source/configuration inspection found no native call push path, CallKit, Android ConnectionService, wake handler, or terminated-app delivery for this path.

## Ownership after CP27 and eligibility

`RootNavigator` mounts exactly one `IncomingCallListener` around `Stack.Navigator`, inside the existing safe-area/message-activity wrappers. It owns the subscription, candidate filtering, block preflight, dedupe, error/retry presentation and a native transparent Modal containing the existing card. The Modal makes the card available above native nested screens without adding a global call context or changing call origins.

Attach requires complete authoritative profile, `hostStatus.isApproved === true`, live profile `hostStatus.availability === online`, foreground AppState, UID, and a current UserProvider authenticated session. Role strings/application statuses do not grant access. Consumers and pending/unapproved Creators attach zero listeners. Offline/busy Hosts attach zero listeners. A profile subscription updates eligibility independently of Connect focus. On return online after a call, existing server updates cause reception to resume.

Removal occurs on background/inactive transition, loss of eligibility, logout/profile bootstrap or failure, session replacement, retry, and owner unmount. Route/tab focus is not a dependency. Each effect invalidates its generation before unsubscribing.

| Host location | Foreground, approved, online behavior |
| --- | --- |
| Connect | Root listener and existing incoming card in Modal |
| Messages | Same listener; incoming card over Messages |
| Activity | Same listener; incoming card over Activity |
| Profile | Same listener; incoming card over Profile |
| ChatDetail, UserProfile, Settings, HostEarnings and other authenticated nested screens | Same root owner and Modal; no focus-dependent teardown |
| Active video call / busy Host | No new incoming listener; server one-active-call checks remain authoritative |
| Login/profile completion/profile error | No eligible incoming listener |

## Session isolation and duplicate prevention

UserProvider exposes only a stable `authenticatedSession` capability with `isCurrent()`, derived from CP25's existing owner token and exact Firebase Auth user object. It changes on each resolved authentication session, including reuse of the same UID or Auth object. Firebase Auth remains authoritative. Old sessions become invalid immediately at token replacement, before React effect cleanup; unmount also invalidates the provider token.

The listener validates both session currency and its effect lifetime before snapshot/error work and after asynchronous block checks. Candidate versions discard superseded asynchronous checks. Render gating prevents an old session's card/error from appearing in a new session. Card identity completions and accept/decline actions/responses check currency; a ref lock prevents repeated presses before a render. Owner-unmount response guards prevent stale navigation even while UserProvider remains mounted.

Response currency deliberately outlives an online-to-busy subscription teardown: an accepted call/profile snapshot can arrive before the callable response, and that legitimate current-session response must still navigate. Logout/replacement/unmount still suppress it. A late decline only dismisses its own call ID, never a newer call.

Repeated candidate IDs do not refetch identity or repeat presentation. Dismissed IDs persist across retry and foreground resubscription for the current session until expiry; they are discarded with the session. Expired entries are pruned. No copied competing listener remains in Host Connect. The service now forwards Firestore errors to the owner, which clears the card and provides a retry action; obsolete errors do nothing.

## Identity, blocking, expiry, response and RTC flow

Caller identity remains `publicIdentityService.calls` -> authenticated `getCallParticipantIdentities`. The backend verifies call participation and returns the existing small public projection; no private user-profile fallback, invented name/photo, or demo incoming data was added. The card honors `canInteract === false` from that projection.

Before presentation the owner reads the existing two-direction block relationship and fails closed on read errors. Acceptance rechecks blocks, session currency and expiry before the existing `respondToVideoCall` callable. A block introduced after presentation is enforced again by the server transaction; no client check replaces server authorization. A newly added block is not continuously subscribed by this owner, so the card may remain visible until identity resolution, a call update, timeout or an attempted acceptance, but cannot bypass backend block enforcement.

Empty/cancelled/non-ringing snapshots clear presentation. Expired calls are filtered before and after block resolution. The existing expiry timer dismisses the card at the stored deadline plus its existing 250ms margin; button handlers refuse expired requests. The approximately 30-second server ring period is unchanged.

Accept/Decline retain the authenticated `respondToVideoCall` backend flow. Acceptance retains server block/eligibility/lock checks and Busy transition. Acceptance navigates to the registered root `VideoCall` with the server result and authorized identity. `VideoCallScreen` subscribes to the call document; at connecting/connected/reconnecting it requests permissions and calls `getVideoCallRtcCredentials`, then `rtcService.joinSession`. Agora token/certificate authority remains on the server. Connected-time billing, 10-second increments, FVT, no-debt behavior, sponsored 30 seconds, Quick Match 20 seconds, Gifts and call controls/reporting remain unchanged.

## Host Connect impact and background truth

Removed only incoming state, service/card imports, listener effect and local incoming-card rendering. Availability controls, Today, Consumer discovery, Following, Stories/Add Story placeholder, and existing Quick Match offer polling remain. A root native Modal takes precedence over an underlying Quick Match card while an incoming call is displayed. Quick Match offer polling is still Connect-focused; CP27 does not claim app-wide offer reception or change Quick Match economics.

Foreground reception is now app-wide for eligible Hosts. Background/inactive explicitly detaches and hides the card; becoming active reattaches and may discover a still-ringing unexpired call. Calls expired while away do not become actionable. There is NO native push delivery, CallKit, Android ConnectionService, background wake, or terminated-app incoming-call support added or claimed.

## Files changed

- `src/components/IncomingCallListener.js` (new): production root listener owner and Modal.
- `src/components/IncomingCallCard.js`: session/action guards, response lock, block/expiry checks and identity capability handling.
- `src/context/UserContext.js`: expose the existing CP25 session capability.
- `src/navigation/RootNavigator.js`: one owner above the stack.
- `src/screens/host/HostDashboardScreen.js`: remove moved incoming ownership.
- `src/services/callService.js`: optional incoming error callback.
- `src/components/__tests__/incomingCallLifecycle.test.js` (new): real UserProvider + owner + card regression tests.
- `src/services/__tests__/incomingCallService.test.js` (new): actual service query/adapter/error contract.
- `src/navigation/__tests__/accountNavigation.test.js`: isolate unrelated owner in existing route tests.
- This report (new).
- `docs/incoming-call-listener-lifecycle-git-status.txt` (new, generated last).

## Tests and validation

| Validation | Final result |
| --- | --- |
| Focused production owner/card and service suites | 2 suites, **27/27 tests passed** (26 lifecycle + 1 service) |
| Earlier focused lifecycle, CP25, privacy, Connect and navigation run | 6 suites, **77/77 tests passed** before the final five added lifecycle regressions; all are also included in the final root run |
| Complete root Jest | **73/73 suites, 792/792 tests passed**, 0 snapshots |
| Functions Jest in `functions/` | **17/17 suites, 402/402 tests passed**, 0 snapshots |
| Host Connect localhost emulator | **68 checks passed** |
| Call recovery security localhost emulator | **40 checks passed** |
| Real Firestore transaction race emulator | **11 assertions passed** |
| Babel using repository configuration | **9/9 changed/new JS files parsed** |
| `git diff --check` | Passed |
| JSON | Not applicable: no JSON changes |

Root Jest includes the Functions test files, so 792 and 402 are overlapping totals, not additive unique test counts. Existing call acceptance/rejection, lifecycle, billing, FVT, sponsored, Quick Match, RTC, and CP25 session-isolation suites passed. Focused tests ran before broader validation. A final focused rerun verified late-decline isolation; the complete root run also included that final test.

Commands: installed `node node_modules/jest/bin/jest.js --runInBand` at root and in `functions/`; focused runs selected the named test files. No dependency installation. Windows initially blocked Node dependency-path traversal under the sandbox; the installed runners succeeded with approved expanded read access. A Babel inline command initially lost quotes in PowerShell; the equivalent stdin script parsed all nine files successfully.

Emulator scripts: `src/services/__tests__/hostConnect.emulator.cjs`, `src/services/__tests__/callRecoveryRules.emulator.cjs`, and `functions/src/__tests__/callRecovery.emulator.cjs`. Used the already-cached Firestore 1.19.8 JAR, unchanged repository rules, localhost port 8289, and isolated `demo-amira-*` namespaces. All three printed their passing totals; the runner exited 0. Expected permission-denied messages were successful negative security assertions. The task-owned emulator was stopped after validation. No production services were exercised.

Initial focused development run exposed a test-handler issue (returning a deliberately unresolved action promise to `act`), a wrong test-node event lookup, and a cold-run 5-second timeout. Fixed the harness, retained assertions, and reran successfully. The final lifecycle tests exercise production ownership with real UserProvider and IncomingCallCard; Firebase, navigation and platform events are controlled adapters, not physical devices. Tab/nested route survival is tested by changing the child under the production owner; root placement and removal of screen ownership are also checked, while existing navigation tests validate routes. Native Modal layering and real-device Agora behavior require physical validation.

Safety review covered changed production additions for client Credit mutation, client billing authority, Agora secrets, fake calls/identity, role chooser, broad AsyncStorage clearing, enabling Storage/translation, and commercial/duration changes: none introduced. Pre-existing simulator branches in the unchanged portion of callService were not modified. JSON validation: not applicable (zero changed JSON files).

## Deployment, physical validation and deferred items

Deployment: **NOT PERFORMED**. Physical testing: **NOT PERFORMED**. No stage, commit, push, package installation, Firebase billing/configuration changes, or production data mutation. All CP27 changes are left unstaged for manual review.

Deferred: physical iOS/Android foreground tab/nested-screen reception, Modal presentation, real network/reconnect and Agora acceptance checks; native push/background/terminated-app systems; app-wide Quick Match offer ownership; continuous block-change UI dismissal. Broader unrelated listener/session audits are outside CP27.

The final git-status artifact is generated only after code, tests, validation and this report are complete. No repository changes follow it.
