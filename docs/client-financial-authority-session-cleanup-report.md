# Checkpoint 24 — Client Financial Authority Containment + Account-Scoped Session Cleanup

## 1. Baseline

- Branch: `amira-v2`
- Exact starting commit: `405d565145d3bc15b7513579d85aefc2ecd89f28` (`feat: complete authoritative call history`)
- Starting state: clean and synchronized with `origin/amira-v2`
- Scope: remove production-adjacent device-local financial authority and establish one account-session termination boundary. No authoritative backend financial, entitlement, call, Gift, social, rule, index, or commercial behavior was changed.

## 2. Pre-change reachability audit

### WithdrawalScreen and route

`WithdrawalScreen` was imported and registered as an authenticated Consumer stack route. No ordinary product button navigated to it, but route registration kept it inside the production bundle and allowed navigation dispatch to open it. It read a device-local diamond balance and withdrawal history, accepted payout details, subtracted local diamonds, created a local pending request, and displayed “Request Sent” without an authoritative backend record. No current Host earnings or payout system depended on it. The route and file were therefore removed.

### ledgerService

The service owned unscoped AsyncStorage values for local coin balance/transactions, total spend, Gifts, views/upvotes, diamonds, withdrawal history, daily diamonds, and wealth XP. It could simulate purchases, Gift spending, call billing, Host earnings, Gift receipt, and payout requests. Its production-tree importers were only `WithdrawalScreen`, dormant `CallWaitingOverlay`, and unused `GlowAvatar`. No authoritative wallet, GiftTray, Level, VIP, reward, call, paid-message, Quick Match, or earnings service imported it. Those dependants and the service were removed.

### GiftingProvider, GiftingContext, overlay, and giftingService

`App.js` globally mounted `GiftingProvider`. Repository search proved `useGifting` had no caller; `GiftingContext` only rendered `GiftingOverlay`, which only imported the legacy asset helper. The current `GiftTray` imports backend-facing `giftService` directly and does not use the context, overlay, ledger, or AsyncStorage. The global provider and closed legacy chain were removed.

### CallWaitingOverlay

No importer or renderer existed. Its Whisper action called `ledgerService.spendCoins`, which could resurrect a local debit if reused. Because the entire component was obsolete and had no authoritative call dependency, it was removed. Authoritative call waiting, billing, timers, FVT, locks, settlement, and recovery were not edited.

### Logout entry points

Settings and Profile each directly disconnected the legacy socket and called Firebase sign-out. `UserContext.forceLogout` instead called `AsyncStorage.clear()`, Firebase sign-out, and local state reset. No caller of `forceLogout` was found. All three now resolve to the single `UserContext.terminateSession` boundary; `forceLogout` remains a compatibility alias.

### AsyncStorage classification

The fresh source inventory found only:

1. **Firebase/third-party managed:** Firebase Auth persistence through `getReactNativePersistence(AsyncStorage)`. CP24 does not enumerate, name, or delete its keys.
2. **Legacy/obsolete AMIRA-owned financial keys:** the 12 explicit keys in `OBSOLETE_LOCAL_FINANCIAL_KEYS`. They are removed during session termination so values left by older installations cannot cross accounts.
3. **Account-specific in-memory state:** UserContext profile/Credit display state and per-UID discovery filters. These are reset for the terminating UID.
4. **Device-global safe preference:** no active AMIRA-owned persisted preference was found in the current source. Unknown and future keys are preserved because cleanup uses an explicit list rather than broad enumeration.

## 3. Changes made

- `App.js`: removed the unused legacy gifting provider mount.
- `src/navigation/RootNavigator.js`: removed the Consumer withdrawal import and route.
- `src/context/UserContext.js`: introduced the shared termination boundary, explicit app cleanup, per-account filter cleanup, socket cleanup, in-memory reset, and Firebase sign-out; retained `forceLogout` as an alias.
- `src/services/applicationStorageService.js`: added the explicit 12-key obsolete AMIRA financial cleanup contract using `multiRemove`.
- `src/services/discoveryFilterStore.js`: separated the per-UID in-memory filter store so session cleanup can clear one account without a context import cycle.
- `src/hooks/useDiscoveryFilters.js`: retained the same hook API while delegating storage to the clearable per-UID store.
- `src/screens/main/SettingsScreen.js` and `MyProfileScreen.js`: use the same context termination boundary instead of competing sign-out implementations.
- Removed `WithdrawalScreen.js`, `ledgerService.js`, `CallWaitingOverlay.js`, `GlowAvatar.js`, `GiftingContext.js`, `GiftingOverlay.js`, and `giftingService.js` because the reachability audit proved their dependency chains obsolete and directly related to the unsafe local authority.
- Updated navigation and truthful-UI tests and added `clientAuthorityCleanup.test.js`.

## 4. Financial authority proof

The production source tree has no `ledgerService`, local withdrawal route, local Gift context, Whisper debit, local purchase simulation, local Gift credit, diamond credit, withdrawal mutation, or wealth-XP ledger. Repository searches outside tests return no matches for `AsyncStorage.clear`, `Withdrawal`, `GiftingProvider`, `GiftingContext`, `ledgerService`, `spendCoins`, `withdrawDiamonds`, `buyCoins`, `creditDiamonds`, `recordReceivedGift`, or `billCallMinute`.

Current financial-looking screens continue to read authoritative profile/callable data. Current Gift sends still go through `GiftTray` and backend-facing `giftService`. CP24 did not edit wallet provenance, purchased-only Gift eligibility, Gift pricing/economics, Host earnings, Level, VIP, rewards, FVT, Quick Match, paid messaging, sponsored calls, or call accounting.

## 5. Session cleanup contract

All real logout actions call `terminateSession` from `UserContext`. It captures the current UID; independently attempts legacy socket cleanup, that UID's in-memory discovery-filter cleanup, and explicit obsolete AMIRA financial-key cleanup; then calls Firebase Auth sign-out. Local cleanup failures are logged but cannot prevent or turn a successful Firebase sign-out into a failed logout. UserContext identity/Credit display state is reset only after Firebase confirms sign-out. A Firebase sign-out failure rejects the boundary, leaves the authenticated UI state intact, and is converted by Settings/Profile into a restrained “still signed in” alert. Concurrent calls share one in-flight termination promise; after it settles, a later retry can start normally.

`AsyncStorage.clear()` is gone. Cleanup neither calls `getAllKeys` nor uses a broad prefix. It never names or removes a Firebase key. Unknown keys and any legitimate device-global storage therefore remain untouched.

## 6. Account-switch isolation

After termination, account A's UserContext identity and displayed balance are reset, account A's in-memory discovery filters are removed, and all known legacy unscoped financial values are removed. A focused test proves clearing account A's filters does not expose them to account B and does not delete account B's independently keyed session value.

This checkpoint does not claim physical account-switch validation, deletion of unknown third-party storage, or a repository-wide persistence redesign. No active persisted AMIRA user cache beyond the obsolete ledger keys was found.

## 7. Gift regression proof

Static dependency proof shows `GiftTray` imports `services/giftService` and no legacy context, ledger, or AsyncStorage API. The focused GiftTray suite passed all four one-tap, unavailable, live-call-context, success, and insufficient-purchased-Credit tests. Root and Functions Gift tests also passed. Gift authority and behavior were unchanged.

## 8. Call and billing regression protection

No current call service, Function, screen, domain, rule, or billing implementation was changed. The removed CallWaiting overlay had no importer and used only the removed local ledger. Root call tests, Functions tests, and emulator call transaction/recovery assertions passed.

## 9. Tests added or changed

- Added `src/services/__tests__/clientAuthorityCleanup.test.js`: 12 tests covering removed authority files/routes/provider, GiftTray dependency, explicit storage cleanup, Firebase/device-key preservation, per-account filter isolation, the shared logout boundary, termination success/failure semantics, and runtime UserProvider single-flight behavior with a later attempt after settlement.
- Updated `src/navigation/__tests__/accountNavigation.test.js` to remove the deleted screen mock and explicitly prove Consumers have no Withdrawal route.
- Updated `src/screens/main/__tests__/truthfulUi.test.js`: 14 tests in the final suite, including Settings shared-boundary success/failure handling and My Profile rejection handling with the exact failure alert, no independent sign-out/disconnect path, and no navigation transition.

## 10. Validation results

The results below are historical validation before the final manual-review cleanup. The final focused result is recorded in Section 16; the full root, Functions, emulator, and GiftTray suites were not rerun for that cleanup.

- Focused CP24/navigation/truthful UI: **3 suites / 26 tests passed**.
- Focused authoritative GiftTray: **1 suite / 4 tests passed**.
- Focused total: **4 suites / 30 tests passed**.
- Full root Jest: **69 suites / 720 tests passed**.
- Standalone Functions Jest: **17 suites / 402 tests passed**.
- Firestore emulator: **19/19 scripts completed their assertions** — 16 on localhost 8289 and 3 on localhost 8189. An initial runner lacked `functions/node_modules`; after correction, one combined run encountered the known emulator `Transaction is invalid or closed` race in paid messaging. A fresh isolated rerun passed paid messaging and all remaining scripts. Firebase CLI printed `Script exited successfully (code 0)` for both final batches but returned a wrapper exit code of 1 while stopping the Windows emulator after SIGINT; individual pass markers were complete.
- JavaScript/JSX/CJS Babel parse: **263 files passed**.
- Tracked JSON parse: **8 files passed**.
- `git diff --check`: **passed**; only Git line-ending conversion warnings were printed.
- Initial grouped focused run: one GiftTray test exceeded Jest's five-second timeout while the other 29 tests passed. The unchanged GiftTray suite passed independently **4/4**, and later passed inside the full root suite.

## 11. Repository-search proof

Production search after implementation found no matches for the removed withdrawal route, gifting provider/context, ledger service, local debit/credit/purchase/withdrawal methods, or `AsyncStorage.clear()`. Matches remain only in focused tests and this report as assertions/history. `firebaseService.js` still imports AsyncStorage solely for Firebase Auth persistence; that use is authoritative third-party-managed persistence and is intentionally retained.

## 12. Deployment truth

- No Firebase, Functions, Firestore rules, index, or application deployment occurred.
- No production data was read or mutated.
- No file was staged.
- No commit was created.
- Nothing was pushed.

## 13. Physical validation truth

Physical-device validation: **NOT PERFORMED**.

## 14. Deferred items

- Real payout implementation, economics, settlement, and compliance
- Host Activity mixed pagination and all other bounded-list pagination
- Push provider, permissions, delivery, and preferences
- Referral authority and economics
- Storage/media
- Translation
- Undecided commercial values
- Broad prototype/dead-code cleanup unrelated to the removed financial authority

## 15. Follow-up: session termination failure semantics

Manual review found a valid failure-mode defect in the first CP24 implementation. It reset visible user state before Firebase sign-out and rethrew obsolete-storage cleanup errors after a successful Firebase logout. Because Settings and Profile invoked the promise directly from Alert callbacks, either rejection could be unhandled.

The smallest correction adds `sessionTerminationService.runSessionTermination` and keeps `UserContext.terminateSession` as the single shared boundary:

1. Local disconnect, filter, and obsolete-storage cleanup each run independently; synchronous or asynchronous failure is logged and does not block Firebase sign-out.
2. Local cleanup failure plus Firebase success resolves successfully and resets in-memory state.
3. Firebase failure rejects with the Firebase error and does not call the explicit state reset, whether local cleanup succeeded or failed.
4. Settings and Profile catch that authoritative failure and state that the account remains signed in; they do not navigate or claim success.
5. Missing/partially cleared UID is safe: filter cleanup is a no-op, obsolete global prototype keys are still explicitly removed, and Firebase sign-out is still attempted.
6. A `useRef` single-flight guard makes near-simultaneous calls return the same promise and prevents competing sign-out attempts.
7. The existing socket `disconnect()` is synchronous and currently does not throw under ordinary state, but the boundary now contains a future synchronous failure. Discovery-filter listener execution can theoretically throw; that is contained independently as well.

Follow-up focused validation: **3 suites / 31 tests passed** (`clientAuthorityCleanup`, `truthfulUi`, and `accountNavigation`). New assertions cover normal success, local cleanup failure with successful sign-out, Firebase failure after successful cleanup, combined local/Firebase failure, synchronous disconnect/filter failures, reset ordering, shared-boundary retention, and visible Settings failure handling. No `AsyncStorage.clear()` or Firebase-managed-key deletion was introduced.

## 16. Final manual-review cleanup validation

The final cleanup was verified on 2026-09-27 against baseline `405d565145d3bc15b7513579d85aefc2ecd89f28`. At the start of this verification, the working tree already contained the corrected My Profile message, both requested runtime tests, and the final Section 9 descriptions. These were retained without duplicate tests or production changes.

- **FINAL CP24 focused result: 3 suites / 33 tests passed**: `clientAuthorityCleanup.test.js` **12**, `truthfulUi.test.js` **14**, and `accountNavigation.test.js` **7**.
- My Profile's rejection test invokes the shared termination mock through the logout confirmation, verifies the exact `Unable to log out` / `Your account is still signed in. Please try again.` alert, checks that navigation methods were not called, and excludes independent Firebase sign-out/socket-disconnect source paths.
- The UserProvider runtime test holds Firebase sign-out pending, proves two calls return the same promise with one sign-out and cleanup operation, verifies both resolve successfully, then proves a later call starts a distinct successful operation.
- Babel validation passed for `MyProfileScreen.js`, `clientAuthorityCleanup.test.js`, and `truthfulUi.test.js` (**3 files**).
- `git diff --check`: **passed** (line-ending conversion warnings only).
- Source searches found no joined-word logout typo in `src` or `App.js`, and no production `AsyncStorage.clear()` or active legacy withdrawal/gifting/ledger references (test files excluded from the production search).
- Node initially encountered sandbox path-resolution `EPERM`; the authorized validation rerun passed. Jest warned about a duplicate package name in an existing `.kilo` worktree, but all focused tests passed with exit code 0.
- No production behavior was changed during this verification, and no single-flight extraction was needed. The full root suite was not rerun.
- Physical validation: **NOT PERFORMED**. Deployment: **NOT PERFORMED**. No production mutation occurred. Nothing was staged, committed, or pushed.
- The Git status artifact was refreshed last to capture the complete final unstaged working tree.
