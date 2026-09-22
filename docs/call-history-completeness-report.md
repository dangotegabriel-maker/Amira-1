# Checkpoint 23 — Call History Completeness

## 1. Baseline
Work began on clean branch `amira-v2` at exact HEAD `882fdeb616b9154d879866ea4202fc8cf249d77f` (`fix: make incomplete Amira features truthful`).

## 2. Files changed/new/deleted
Changed: `functions/src/hostActivityDomain.js`, its test, `MessageHomeScreen.js`, its privacy UI test, `HostActivityScreen.js`, and `callHistoryService.js`. New: `src/utils/callHistory.js`, two focused test files, this report, and the status artifact. No files were deleted.

## 3. Current architecture audit
Before this checkpoint, Consumer Messages > Calls queried trusted history but collapsed calls by counterpart and stopped at 200. Host Activity used a trusted callable but its call proof rejected current accounting-version-3 records.

## 4. Authoritative call-history source
Rows come only from server-authored `callHistory/{callId}` records. No local storage, navigation state, socket event, message, or fixture is history authority.

## 5. Consumer history surfaces
The existing Messages > Calls filter is the Consumer surface. No top-level Calls tab or major route was added.

## 6. Host history surfaces
Host Activity > Calls and call entries in Activity > All remain the Host surfaces.

## 7. Host Activity Calls before
The callable required matching `callHistory` and `calls` proof, but accepted only accounting version 2 and therefore omitted current version-3 direct, Quick Match, and sponsored completions.

## 8. Host Activity Calls after
The same strict proof accepts versions 2 and 3. Counterpart, connected duration, and completed-event time remain server verified.

## 9. All-tab integration
All continues to aggregate the five existing event types, with one call event per call ID and unchanged sort/dedup semantics.

## 10. Participant privacy
The client query retains `participantIds array-contains auth.uid`; rules retain `participant(resource.data)`. No permission was broadened.

## 11. Safe identity source
Consumer rows use `getCallParticipantIdentities`; Host Activity uses its existing callable public projection. Neither reads another user's private document client-side.

## 12. Duration source
Displayed duration is persisted `durationSeconds`, accepted only with a persisted `connectedAt` and connected/ended status. Preconnect terminal states never show a duration.

## 13. Duration formatting
The shared formatter produces `0:00`, `0:42`, `3:42`, `12:05`, and hour form such as `1:03:22`.

## 14. Timestamp source
Presentation prefers persisted `endedAt`, falling back to persisted `createdAt` for valid legacy terminal entries. The query remains ordered by authoritative `createdAt` to use the existing participant/time index.

## 15. Relative-time formatting
One formatter supplies `Just now`, minutes, hours, `Yesterday`, days through six, then a device-local concise date.

## 16. Status mapping
Only `rejected + declined` maps to `Declined video call`; only `missed + ring_timeout/no_answer` maps to `Missed video call`. Everything ambiguous is neutral `Video call`.

## 17. Normal call behavior
Direct calls normalize to the same simple row without billing fields.

## 18. Quick Match behavior
Persisted `quick_match` calls normalize identically, and Host Activity now accepts their version-3 finalization proof.

## 19. Sponsored-call behavior
Persisted `sponsored_invite` calls normalize identically, without sponsored-second or economic detail.

## 20. Reconnect behavior
Reconnect remains one authoritative call ID. Client dedupe by call ID prevents duplicate rows across page overlap.

## 21. Declined/ringing/timeout behavior
Persisted declines and proven missed ring timeouts receive conservative labels without duration. Ringing, failed-preconnect, and malformed duration cannot fabricate connected time.

## 22. Ordering
Firestore returns newest `createdAt` first. Normalized rows use completed-event time and call-ID tie breaks; merged pages are deduped and sorted deterministically.

## 23. Previous record bound
The Consumer query used `limit(200)` with no cursor and showed only the latest call per counterpart.

## 24. Pagination architecture
`listPage({cursor,pageSize})` performs participant-filtered cursor pagination with `startAfter` and an opaque final-document cursor.

## 25. Page size
The default is 25 and caller input is clamped to 1–50.

## 26. Cursor behavior
The final Firestore document advances the next query; a short page sets `hasMore=false`.

## 27. Dedupe behavior
Rows dedupe only by authoritative call ID, never name or time.

## 28. Refresh/realtime decision
Consumer history uses explicit paged reads and pull-to-refresh. This avoids a realtime/pagination race; refresh replaces the first page.

## 29. Firestore index impact
No index change was required. The existing `participantIds` array-contains + `createdAt DESC` composite index matches the query; nothing was deployed.

## 30. Loading state
The initial read retains a real activity indicator; older-page loading has a footer indicator.

## 31. Empty state
A successful empty Consumer read says `No video calls yet.` Host Activity retains `No calls yet.`

## 32. Error state
Initial errors remain distinct from empty and offer a working first-page Retry. An older-page failure preserves loaded rows, keeps the existing cursor/end-state truth, and shows a footer error with `Retry older calls`; that action retries the same cursor without reloading page one. A successful next-page retry clears the footer error, while pull-to-refresh clears stale pagination errors and truthfully replaces pagination state from a new first page.

## 33. Malformed legacy record behavior
Invalid participant shape/call ID records are omitted; missing time or duration cannot crash or fabricate data.

## 34. Blocked-user history behavior
History remains visible, safe projected identity is used, and interaction is disabled according to the existing callable capability.

## 35. Deleted/disabled identity behavior
Unresolved identity falls back to `Amira user`; no raw private profile recovery occurs.

## 36. Row actions
The established conversation action remains only when the authoritative identity capability says `canInteract=true`. Host profile/message/invite actions retain their existing capability checks.

## 37. Financial-data exclusion
The normalized presentation model omits billed Credits, rates, ledgers, wallets, FVT breakdowns, VIP payments, and earnings.

## 38. No call-side effects
History reads and formatting create no calls, locks, reservations, invites, notifications, gifts, or accounting writes.

## 39. Consumer navigation regression
Consumer navigation remains Home | Match | Messages | Profile.

## 40. Host navigation regression
Host navigation remains Connect | Messages | Activity | Profile.

## 41. CP22 regression
Truthful UI and navigation tests passed; Moments, Invite & Earn, Settings, Block List, translation, and socket cleanup remain intact.

## 42. Social regression
Follow, friends, likes, blocks, and profile views were unchanged; relevant unit/emulator suites passed.

## 43. Messaging regression
Messaging entitlement and refund implementation was unchanged; full tests and emulator integration passed.

## 44. Gift regression
Gift eligibility, catalogue authority, idempotency, earnings, message events, and live-call behavior were unchanged; regressions passed.

## 45. VIP/Level/Rewards regression
No authority, threshold, claim, amount, or entitlement changed; unit and emulator regressions passed.

## 46. Call lifecycle regression
Agora, identity, ring timeout, locks, FVT, automatic continuation, billing, reconnect, sponsored, Quick Match, live Gifts, and settlement were unchanged; lifecycle tests passed.

## 47. Duration test results
Focused tests passed for legitimate zero, 42, 222, 725, hour-plus, missing/invalid, and non-connected duration behavior.

## 48. Timestamp test results
Focused deterministic tests passed for minutes, hours, yesterday, days, old dates, missing values, and Firestore-style timestamps.

## 49. Pagination test results
First/next page, participant filter, order, cursor advancement, page cap, end state, signed-out behavior, merge dedupe, initial retry, same-cursor older-page retry, successful error clearing, and refresh reset are covered; focused tests passed.

## 50. Privacy test results
The unchanged privacy emulator proves an unrelated user cannot request call identity and participant rules remain enforced. All privacy checks passed.

## 51. Host Activity test results
Host UI plus domain proof tests passed, including version-3 direct/Quick Match/sponsored records and fail-closed invalid records.

## 52. Consumer history test results
Consumer UI tests passed for authoritative hydration, distinct initial error/retry, visible footer failure with existing rows preserved, same-cursor next-page retry, successful footer clearing, refresh reset, blocked interaction, truthful rows, and empty behavior.

## 53. Root Jest totals
Full root Jest passed **68 suites / 712 tests**.

## 54. Functions Jest totals
Standalone Functions Jest passed **17 suites / 402 tests**.

## 55. Emulator totals
All **19/19** scripts passed: 16 on localhost 8289 and 3 on 8189. Expected denial and transaction-retry logs were negative/concurrency evidence.

## 56. Static parse totals
All **270** repository JS/JSX/CJS source files from the final file set parsed with Babel (271 during validation including the deleted temporary validator).

## 57. JSON parse totals
All **8** repository JSON files passed `JSON.parse`.

## 58. Git diff check
`git diff --check` passed.

## 59. Physical validation status
No physical-device validation was performed or claimed.

## 60. Deployment status
Nothing was deployed; Firebase billing and production services were not changed.

## 61. Remaining limitations
Host Activity remains intentionally bounded to 50 source records per event type and is not paginated in this checkpoint. Device rendering still awaits later physical review.

## 62. Remaining pagination/index blockers
Consumer call history is cursor paginated with the existing index. Paginating the mixed Host Activity All feed would require a separate multi-source cursor contract and remains out of scope.

## 63. Confirmation no economics invented
No rate, split, reward, threshold, discount, payout, referral value, or financial presentation was added.

## 64. Confirmation no security weakening
Rules are unchanged, participant filtering remains, and safe callable projections remain the identity boundary.

## 65. Confirmation no production mutation
Only repository files and localhost demo-project emulators were used; production data was not mutated.

## 66. Confirmation no deployment
No Firebase or application deployment was attempted.

## 67. Confirmation no staging
The Git index is empty; nothing was staged.

## 68. Confirmation no commit
No commit was created; HEAD remains the required baseline.

## 69. Confirmation no push
Nothing was pushed.
