# CP26 - Message history recency and pagination correctness

## Baseline

- Repository: `C:\Users\NiBS-GA\Amira-1`; branch: `amira-v2`.
- HEAD: `7c6c76ca5819c2cbbfdc8b0deef7ff1db5a96abb` (`fix: isolate authentication bootstrap and session state`).
- Working tree was clean before implementation. Local `origin/amira-v2` pointed to the same commit; no remote fetch was performed.
- Scope: client message-history selection, normalization, and subscription callback lifetime. No packages installed.

## Active path and confirmed root cause

`MainTabNavigator` mounts `MessageHomeScreen` for both account roles. The inbox calls `messagingService.subscribeInbox`: participant filter, `lastMessageAt DESC`, normally limited to 100 conversations. Selecting a conversation navigates to `RootNavigator`'s active `ChatDetailScreen`.

ChatDetail derives a deterministic conversation ID and calls `prepareConversation`, which checks the recipient/block relationship and reads whether the conversation exists. Opening does not create a conversation. Once it exists, the focused, foreground screen subscribes to `conversations/{conversationId}/messages`. A separate conversation-document subscription supplies read receipts.

Before CP26, `subscribeMessages` used `orderBy('createdAt', 'asc'), limit(250)`. This selects the oldest 250 messages. With 300 distinct increasing timestamps, messages 1-250 were returned, excluding 251-300. Subsequent newer messages could remain outside that listener's bounded result.

ChatDetail uses a non-inverted FlatList with `data={messages}`, document IDs as keys, and `scrollToEnd` on content-size changes. Each snapshot calls `setMessages(items)`; there is no extra sort, optimistic message insertion, pending-message merge, or history accumulation. The pending-send ref holds a retry request ID and draft, not a fabricated visible message.

## Implementation and ordering

Only `src/services/messagingService.js` changes production behavior:

| Layer | Before | After |
| --- | --- | --- |
| Firestore selection | `createdAt ASC`, limit 250 | `createdAt DESC`, limit 250 |
| Snapshot normalization | Map documents directly | Map documents, then reverse the new array |
| FlatList | Non-inverted, input order | Unchanged |

Initial visible history is now the newest bounded set in oldest-visible to newest-visible order. For messages 1-300, the screen receives 51-300. Arrival of message 301 produces 52-301, with 301 once at the bottom and 51 outside the window. The bound remains 250; older records are not deleted from Firestore.

Equal timestamps retain Firestore's deterministic document-key ordering. The installed SDK's `queryNormalizedOrderBy` appends the key using the final explicit sort direction; reversing the entire descending result yields ascending timestamp/key order. No client timestamp conversion or approximate tie sorting is introduced. The existing requirement that queried records have `createdAt` is unchanged.

## Real-time and session lifetime

The same onSnapshot subscription remains live after initial delivery. Repeated snapshots replace the visible array, so replay/reconnect delivery does not accumulate duplicates. This is a bounded moving window, not a paginated history cache.

The service now captures the Auth user object and checks both that object and an active flag before delivering values or errors. A missing Auth session does not attach a listener. Cleanup marks the subscription inactive before invoking Firestore unsubscribe. This rejects queued callbacks after cleanup, and callbacks after logout/account replacement (including a new session with the same UID) before React cleanup runs. It also prevents those rejected callbacks from invoking ChatDetail's markRead action.

The active screen already returns this cleanup from its effect; conversation changes, unmount, losing focus, or backgrounding clean up the message subscription. Existing CP25 bootstrap/navigation lifecycle remains unchanged. The new UI regression verifies unsubscribe on route change and unmount; service tests separately force old callbacks after cleanup/session replacement. These tests do not claim that unrelated asynchronous screen operations were audited or redesigned.

## Pagination

**Older-than-250 message pagination does not exist and remains deferred.** Neither the active message service nor ChatDetail has an older-history cursor, load-more action, or onEndReached handler. No pagination was added. MessageHome's Calls tab has separate call-history pagination; it is not conversation-message pagination and is unchanged.

## Message types and product locks

- Text and friendship system events are written by `functions/src/socialMessaging.js` to the same message collection. ChatDetail special-cases `friendship_created`; ordinary rows render `item.text`.
- `functions/src/giftService.js` writes `type: 'gift'` with text and gift metadata into that same collection. The new query preserves all fields/types and includes these records normally; GiftTray and authoritative Gift economics are unchanged.
- No active call-event writer into this collection or dedicated call-message renderer was found. Call history remains separate. No call message feature was added.
- The active composer sends text only, and the server send endpoint rejects non-text requests. VIP photo authorization exists separately, but this screen has no photo-send/upload path. No Storage/media or translation feature was enabled.
- Retrieval has no paid/refunded/deleted/type filter. Participant-only Firestore read rules remain unchanged; client message create/update/delete remains denied. Blocking governs preparation/sending and composer availability, not a new history filter. Refund reconciliation changes financial/access records, not this query.
- Free Message/Chat Pass entitlement, the paid 24-hour window, Host/Consumer restrictions, refund rules, Credits, prices, durations, commercial constants, and server-authoritative sends are untouched.

## Files changed

1. `src/services/messagingService.js` - descending bounded query, chronological normalization, callback lifetime guard.
2. `src/services/__tests__/messageHistory.test.js` - new production-service regressions (9 cases).
3. `src/screens/main/__tests__/messageEntitlementUi.test.js` - one additional ordering/cleanup regression and FlatList import; existing assertions unchanged.
4. `docs/message-history-recency-correctness-report.md` - this report.
5. `docs/message-history-recency-correctness-git-status.txt` - final status artifact, generated last.

## Regression coverage

The new service tests invoke the real `subscribeMessages` and capture its query constraints and snapshot transformation. The Firestore test double evaluates the actual captured order/limit over 300 records; this is not a separate production normalization helper copied into a test.

- Newest 250 of 300, full ordered expected set, exact IDs/timestamps 51 and 300.
- New live record 301, shifted lower boundary 52, replay, unique IDs and one latest record.
- Equal timestamp boundary and deterministic replay despite shuffled input.
- Empty/short results, preserved fields and system type, no invented rows.
- Conversation replacement/unmount cleanup, queued old values/errors suppressed.
- Logout, different account, and replacement same-UID Auth sessions suppress old callbacks.
- Current errors still propagate; signed-out subscriptions do not attach.
- Real ChatDetail passes chronological data to a non-inverted FlatList and invokes service cleanup on route change/unmount.

This provides client/query-contract coverage using mocked Firestore snapshots, not a claim of a live server/device test.

## Validation

- Focused messaging/opening/entitlement/UI/CP25 session tests: **46/46 passed, 5/5 suites** (`--runInBand --watch=false --testTimeout=15000`).
- Initial focused attempt: **44 passed, 2 UI timeouts** at Jest's default 5 seconds. Both passed unchanged on rerun with a 15-second allowance; no assertion was weakened.
- Functions Jest: **402/402 passed, 17/17 suites**, including existing paid-message/refund/message-authority tests unchanged.
- Root Jest: **765/765 passed, 71/71 suites** (`--runInBand --watch=false --testTimeout=15000`, 239.85 seconds). The root discovery also runs the Functions tests; the separate Functions result above is not an additional unique-test count. The existing identity-unavailable test emitted its expected warning.
- Babel: **3/3 changed/new JS files parsed** using the installed project configuration. An initial PowerShell `node -e` quoting error was corrected by passing the script through stdin.
- JSON: no JSON files changed; no JSON validation required.
- `git diff --check`: passed, including the final report review.
- Node initially could not resolve the workspace under the filesystem sandbox (`EPERM`); test/parse commands ran with approved filesystem access. No dependencies were installed.
- Emulator regression: **NOT PERFORMED**. No rules, Functions, or backend behavior changed, and the existing emulator files contain no bounded-history query regression. Their messaging coverage concerns authority/entitlement rather than this query transformation.

## Source-search proof and scope check

Reviewed active imports in `MainTabNavigator`/`RootNavigator`, all query and render code in the active two messaging screens, `messagingService`, server message writers, and `firestore.rules`.

Searches for `subscribeMessages`, `startAfter`, and `limitToLast` confirm no active older-message paging path. Searches for conversation message writes find text/friendship in `socialMessaging.js` and Gifts in `giftService.js`; call modules do not write conversation messages. The installed Firestore SDK confirms implicit document-key tie direction.

Searched added production lines for `fake`, `demo`, `fallback`, `credit`, `wallet`, `price`, `duration`, `AsyncStorage`, `clear(`, `storage`, `upload`, `translat`, and `role`: no matches. Manual diff review confirms no fake-message fallback, local balance mutation, client-authoritative paid messaging, commercial changes, broad storage clearing, media enabling, translation, or role chooser. No unrelated findings were modified.

## Deployment, physical validation, and deferred work

- Deployment: **NOT PERFORMED**. No Firebase deployment, configuration/billing change, staging, commit, or push.
- Physical validation on Gabriel's devices: **NOT PERFORMED**.
- Deferred: older-than-limit message pagination and device/network reconnect verification. Local cached snapshots remain subject to existing Firestore cache availability; this patch does not claim offline access to records absent from cache.
- All CP26 changes remain unstaged for manual review. The final status artifact is written after implementation, validation, and this report are complete; no repository modifications follow it.
