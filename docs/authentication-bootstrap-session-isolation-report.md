# Checkpoint 25: Authentication Bootstrap and Session-State Isolation

## 1. Baseline

- Branch: `amira-v2`.
- HEAD: `6df3db98321fd24e2b89b080e3ed03a3327b08bb`.
- Latest commit: `feat: contain client financial authority and session cleanup`.
- `git status`, `git rev-parse HEAD`, and `git log -1 --oneline` were checked before editing. The starting working tree was clean and Git reported it synchronized with its local `origin/amira-v2` tracking reference.
- Scope is client authentication/profile lifecycle isolation. No Functions, rules, indexes, Firebase configuration, packages, or commercial policies were changed.

## 2. Confirmed pre-change race

The asynchronous Auth observer previously wrote user, Credits, and loading state without a lifecycle ownership check. Its catch path manufactured a sparse profile from the original Auth user. The read-only audit reproduced A starting hydration, Auth becoming null, then A's delayed hydration failure restoring an A-looking user. A profile-read failure also routed as incomplete onboarding despite providing no evidence about DOB, Country, role, or approval.

UID checks in the profile service were insufficient for repeated authentication sessions using the same UID and did not protect the context's catch path or its raw state setters.

## 3. Session ownership design

`UserContext` owns an opaque token for each profile attempt and a lifecycle identity for each Auth callback. Object identity, rather than UID equality, distinguishes successive sessions. Commit checks require both the current attempt token and the current Firebase Auth user object. The same-UID regression test deliberately reuses the Auth user object to prove that token replacement, not object/UID comparison alone, provides isolation.

Every Auth transition replaces the owner and stops the previous listener. Retry replaces the profile-attempt token while retaining the Auth lifecycle identity. The latter lets a pending logout still sign out the same authenticated session if a profile retry occurred during local cleanup. Termination cannot reset or sign out a replacement lifecycle after its cleanup finishes.

Public refresh, balance, retry, and profile-update functions capture their render's owner. A callback retained by an obsolete screen cannot acquire ownership of a later account. Raw `setUser` and `setCoins` are no longer exported.

## 4. Bootstrap/profile status model

One state record holds `user`, `coins`, and `status`:

| Status | Meaning | Presentation |
|---|---|---|
| `auth_loading` | Waiting for the initial Firebase Auth callback | Existing Splash/loading behavior |
| `profile_loading` | Authenticated; authoritative profile resolution pending | Existing Splash/loading behavior |
| `ready` | Current-session authoritative profile resolved | Existing role/onboarding routes |
| `profile_error` | Current-session profile resolution/listener failed or returned no valid owned profile | Retryable profile error, no auth/main/onboarding stack |
| `signed_out` | Auth reported no user or the same session completed sign-out | Existing Login routes |

`loading` is derived from the status. No fallback profile is fabricated. A profile error does not call Firebase sign-out. The error UI says: "We couldn't load your profile. Please try again."

## 5. Retry behavior

`retryProfile` is bound to the current owner. It clears the failed attempt, resolves the current authenticated account again, and installs one listener on success. Old retries, old retry callbacks, and their delayed success/failure cannot change a later attempt's state. RootNavigator exposes one Try again action; success resumes normal routing from the actual profile.

## 6. Listener ownership

Only the current attempt installs and retains a profile listener. Auth changes, retry, profile failure, and provider unmount unsubscribe the previous listener. Success and error callbacks check ownership, including callbacks already queued before unsubscribe. Synchronous subscription failure is also handled without retaining the returned obsolete unsubscribe function. Provider teardown disables subsequent queued Auth callbacks.

Missing or wrong-owner profile results fail truthfully instead of retaining an assumed role. An error from an obsolete listener is ignored; an error from the current listener enters the recoverable profile-error state.

## 7. Refresh/onboarding isolation

- `refreshUser` checks its captured owner before reading and before committing the complete authoritative profile and Credits. Current-session read errors remain observable to callers.
- `fetchUserCoins` checks the same ownership before writing Credit display state. Read failure no longer overwrites an existing authoritative display balance with an invented zero; its existing numeric fallback return remains zero.
- `updateProfile` owns the existing backend profile write and subsequent safe refresh. It suppresses obsolete completion, not legitimate current-session errors.
- Name, Birthday, Gender, and Country setup all use `updateProfile`. Name and Birthday no longer perform raw local profile mutations. Existing fields, validation, and onboarding order remain; no Country/DOB immutability policy was added.
- Edit Profile and Creator Application already call `refreshUser`; their captured refresh functions now gain the context's session guard without unrelated screen changes.

This is local state isolation. A backend write already dispatched is not cancelled or rolled back by a later authentication transition; server authorization continues to govern it.

## 8. CP24 regression protection

The shared termination service, obsolete-key allowlist, discovery-filter cleanup, socket cleanup, and `forceLogout` alias remain. Local cleanup failure still cannot block sign-out of the initiating current lifecycle. Firebase failure rejects without the termination path resetting authenticated UI. Concurrent callers share the existing `terminationPromise.current`; a later attempt can start after settlement.

Explicit successful-logout reset is lifecycle-guarded. If the Auth null callback already reset state, no duplicate reset is needed. If another account has replaced the session, old completion cannot reset it. Settings and My Profile failure alerts remain unchanged. No broad storage clear or Firebase persistence-key deletion was introduced.

## 9. Files and tests added/changed

Production files:

- `src/context/UserContext.js`: ownership, unified status, guarded APIs, listener cleanup, retry, and guarded termination completion.
- `src/navigation/RootNavigator.js`: truthful profile-error presentation and retry before route selection.
- `src/screens/onboarding/NameSetupScreen.js`.
- `src/screens/onboarding/BirthdaySetupScreen.js`.
- `src/screens/onboarding/GenderSetupScreen.js`.
- `src/screens/onboarding/CountrySetupScreen.js`.

Tests:

- Added `src/context/__tests__/userSessionIsolation.test.js`: **24 runtime tests** mounting UserProvider with controlled Auth callbacks, deferred hydration/read/write promises, and retained listener callbacks. Covers delayed success/failure after logout, A-to-B transitions, same UID/new session, listener teardown, current failure, successful/stale retry, duplicate retry prevention, current/missing listener failure, stale refresh/Credit reads, current errors, real Name/Birthday integration, successful onboarding refresh, Firebase logout failure, single-flight/new-account reset protection, and retry during pending logout cleanup.
- Updated `src/navigation/__tests__/accountNavigation.test.js`: **4 additional tests, 12 total**. Covers profile-error routing/retry, both loading states, and signed-out versus loaded-incomplete-profile routing. Existing exact-tab and approved/pending role tests remain.
- Updated `src/services/__tests__/clientAuthorityCleanup.test.js`: adapted two static reset assertions to the unified state record; **12 existing tests**, including runtime single-flight and termination failure semantics, remain.
- Existing `truthfulUi.test.js` (**13**) and `userModel.test.js` (**14**) are included unchanged in the focused run.

Documentation: this report and `docs/authentication-bootstrap-session-isolation-git-status.txt`.

## 10. Validation results

- Focused CP25/CP24/navigation/profile-model: **5 suites / 75 tests passed**.
- Full root Jest: **70 suites / 755 tests passed** (306.069 seconds). The existing discovery/profile UI suite was slow but passed; no root-suite failure occurred.
- Standalone Functions Jest: **17 suites / 402 tests passed**.
- Firestore emulator: **19/19 existing scripts passed with exit code 0**: 16 against localhost 8289 and 3 against localhost 8189. Used the already-cached Firestore emulator JAR, unchanged repository rules, and isolated demo namespaces. No package install, Firebase configuration edit, or deployment was required.
- The emulator logged a transaction-lock timeout during the concurrent Amira ID exercise; that script completed **58 checks** successfully. No script failed. The previously documented paid-messaging `Transaction is invalid or closed` failure did not recur; paid messaging passed **32 checks**. No isolated failure rerun was necessary.
- Both task-owned emulator processes were stopped after testing. Their deliberate Ctrl+C shutdown returned process exit code 1 with `server shut down`; the regression runners themselves completed with exit code 0 and all 19 script pass markers.
- Babel: **267 tracked JS/JSX/CJS files plus 1 new test file passed**.
- Tracked JSON: **8 files passed**.
- `git diff --check`: passed; Git printed line-ending conversion warnings only.

The initial sandboxed Node launch failed with path-resolution `EPERM`; validation was rerun with execution permission. The first focused run had one Name onboarding UI test exceed Jest's five-second timeout. The unchanged test passed when rerun with a 15-second per-test allowance. Final Jest commands use `--runInBand --testTimeout=15000`; root commands also use `--watchman=false --modulePathIgnorePatterns='<rootDir>/.kilo'` to exclude the unrelated nested worktree without changing configuration.

## 11. Source-search proof

- No Auth-derived sparse fallback (`authUser.displayName`, email, or photoURL) remains in UserContext.
- No raw shared profile/Credit setters remain exposed by UserContext or used by the four active profile-setup screens.
- No production `AsyncStorage.clear()` invocation was found.
- No RoleSelection route or fake/demo profile fallback was added to the changed production files.
- Production changes are limited to context lifecycle, bootstrap presentation, and the four setup screens. No commercial/configuration files or constants were introduced or changed.
- Consumer tabs remain Home / Match / Messages / Profile; Host tabs remain Connect / Messages / Activity / Profile. Existing navigation tests verify pending Creator and approved Host routing.

## 12. Deployment truth

Deployment: **NOT PERFORMED**.

No production data was read or mutated. Emulator writes used isolated local demo projects only. Firebase billing, Storage, configuration, rules, indexes, and Functions were not changed. Nothing was staged, committed, or pushed.

## 13. Physical-validation truth

Physical validation: **NOT PERFORMED**.

Recommended follow-up: cold start, slow/offline profile resolution, retry, logout failure, and account switching on a device. Two phones are optional for this client lifecycle checkpoint. Automated deferred-promise tests are the primary proof of the race fix.

## 14. Deferred items

The 250-message query, incoming-call placement, presence heartbeat, Country/DOB immutability policy, Help/Support, push, translation, Storage/media/Stories, payouts, referrals, commercial configuration, pagination, dead-code removal, and deployment remain outside CP25. No unrelated audit finding was implemented.

The final Git-status artifact is refreshed only after implementation, validation, and this report are complete. All CP25 changes remain unstaged for manual review.
