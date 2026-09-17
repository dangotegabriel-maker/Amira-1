AMIRA V2 - Batch 1.3 implementation report

Checkpoint base: e3351a9c00e3cfe23c9afb4db852a936fffc41ef on amira-v2.
No staging, commit, push, deployment, dependency upgrade, billing activation or Storage activation was performed.

1. Files changed

```text
firestore.indexes.json
firestore.rules
functions/src/__tests__/callPaymentLifecycle.test.js
functions/src/__tests__/callPreflight.test.js
functions/src/__tests__/socialMessaging.test.js
functions/src/callPreflight.js
functions/src/callReviews.js
functions/src/index.js
functions/src/messageEntitlements.js
functions/src/socialMessaging.js
src/components/FreeNowBanner.js
src/context/MessageActivityContext.js
src/context/__tests__/messageActivityUi.test.js
src/hooks/useAndroidKeyboardOverlap.js
src/navigation/MainTabNavigator.js
src/navigation/RootNavigator.js
src/screens/main/CallSummaryScreen.js
src/screens/main/ChatDetailScreen.js
src/screens/main/RewardsScreen.js
src/screens/main/UserProfileScreen.js
src/screens/main/VideoCallScreen.js
src/screens/main/__tests__/callPaymentUi.test.js
src/screens/main/__tests__/messageEntitlementUi.test.js
src/screens/main/__tests__/rewardsUi.test.js
src/services/__tests__/callEntry.test.js
src/services/__tests__/socialMessaging.emulator.cjs
src/services/callNavigationService.js
src/services/callReviewService.js
src/services/chatPassService.js
src/services/messagingService.js
src/utils/__tests__/messageActivity.test.js
src/utils/messageActivity.js
```

This report is also new. App.js and the two existing debug logs are unrelated and were not edited by this batch.

2. Exact Chat Pass data model

The balance remains consumerRewards/{consumerUid}.freeMessages, now interpreted as Chat Passes.
The canonical conversation ID remains the sorted participant UIDs joined with __.
The active window is consumerRewards/{consumerUid}/chatWindows/{conversationId}:
consumerUid, conversationId, otherUid, openedAt, expiresAt, source='chat_pass', sourceTransactionId, windowId, updatedAt.
openedAt and expiresAt are Firestore timestamps generated from trusted Functions time. expiresAt is exactly openedAt + 86,400,000 ms.
Each new window replaces the expired active-window document; the immutable consumption ledger retains its history.

3. Legacy freeMessages handling

No risky balance migration or duplicate balance field was introduced. Existing remaining balances become the same number of Chat Passes.
messageEntitlements.js centralizes chatPassBalance and CHAT_WINDOW_MS. New ledger records specify unit='chat_pass'.
Old ledger entries remain untouched with their original policy versions and historical per-text meaning. Prior spending is not refunded.
Rewards & Tasks now says Chat Passes and explains the 24-hour rule. The seven-day numerical reward schedule is unchanged.

4. Expiry and idempotency

One Firestore transaction reads profiles, blocks, both follow records, the existing request/message, rewards and window before any writes.
An active window costs zero. Opening a window costs one pass, atomically with the text and ledger record.
The message ID is a deterministic hash of the sender and client request ID. The window/ledger identifier hashes the conversation and opening message ID.
Repeated request IDs do not charge again; different concurrent first sends conflict on the same window and rewards document, so transaction retry sees the opened window.
Expired windows require a new pass on the next valid send. Opening, typing, reading and receiving do not consume passes.
Invalid/blocked sends fail before writes. Client-supplied expiry fields are not accepted.

5. Friends-free messaging

The backend validates the two current reciprocal follow documents on every send, using the existing role-aware follow schema.
It does not trust the historical friendships document as proof of a currently active friendship.
Active Friends and approved-host senders cost zero. Ending friendship restores the normal active-window/new-pass rules.
The deterministic one-time friendship reward remains five passes by default; unfollow/refollow does not regrant or claw back rewards.

6. Keyboard diagnosis and fix

Both AndroidManifest adjustResize and app.json resize were already configured. Android ChatDetail had no JS fallback if native resize failed; the iOS KeyboardAvoidingView path was separate.
The exact OEM/device/build cause cannot be established without the two phones. It is not claimed as physically diagnosed or fixed yet.
useAndroidKeyboardOverlap measures the OUTER chat viewport against keyboard screenY. It applies only max(0, viewportBottom - keyboardTop) padding.
A correctly resized viewport yields zero compensation. The outer viewport is unaffected by the inner padding, avoiding cumulative compensation.
Keyboard dismissal clears the fallback, and layout changes remeasure it. The existing iOS behavior, minimum bottom safe-area padding, draft, scrolling and receipts remain.
RootNavigator supplies a SafeAreaProvider for the new app-level banner without editing App.js.

7. Chat call action

Only a consumer chatting with the matching approved-host profile sees Video. Block state hides it.
It invokes startVideoCall from callNavigationService, also used by discovery/profile call actions.
The older FreeNowBanner entry now fetches the real profile and uses that same flow instead of navigating directly to an unprepared VideoCall screen.
VideoCall rejects missing call IDs before subscribing or starting RTC. The existing incoming-call card and RTC implementation were not rewritten.

8. Gift entry

The same valid consumer-to-approved-host context shows Gift. It displays 'Gifts are coming soon'.
No gift transaction, balance debit, host credit, catalog duplication or fake success was introduced.

9. Call Summary relationship state

Call Summary subscribes to followService.subscribeRelationship while focused and displays Follow, Following or Friends.
Only an eligible, unblocked, not-yet-followed relationship permits Follow. Existing Following/Friends controls do not unfollow accidentally.
It no longer sets a fake local follow flag. Call IDs are passed from VideoCall to the summary for review eligibility.

10. Pre-call eligibility

startVideoCall's trusted transaction now reads rewards/config as well as the existing preview entitlement, participant locks, roles, blocks and host availability.
callPreflight selects the existing daily/earned allowance policy and checks paid affordability before writing a call or locks.
If neither free allowance nor the first paid increment is available, it returns insufficient_call_credits before client navigation, permission requests, camera or Agora startup.
The client offers the existing RechargeHub route. No fake payment occurs.

11. Minimum paid affordability

Uses the existing backend callDomain.incrementCredits(rate): ceil(rate * 10 / 60).
At 25 Credits/min, five Credits funds the first increment. A full minute is not required.
This is an eligibility check, not a debit or reservation. Paid-only entry retains explicit paid confirmation; connected free calls retain Continue Paid / End.
The existing connected-time accounting, payment deadlines, ledger settlement and rounding were not changed.

12. Foreground banner architecture

MessageActivityProvider wraps the root navigator, so the banner can appear outside Messages without editing App.js.
One inbox query observes conversation summaries, plus two block-list queries (own blocks and incoming blocks).
The first server snapshot establishes a quiet baseline, including when a cached snapshot arrives first. Per-conversation timestamps dedupe updates.
Only active-app, new ordinary incoming text outside the focused conversation can show a banner. Own/system messages are suppressed.
Both block directions are filtered live; tapping rechecks the relationship before navigation. The banner dismisses automatically or when the app backgrounds.
No OS push infrastructure was installed. When several conversations update in one snapshot, the latest eligible conversation supplies the banner.

13. Unread badge

The shared provider sums persisted unreadCounts for valid, unblocked conversations; its inbox query is not capped at the existing Messages screen's 100-row limit.
Messages displays no badge at zero, exact 1-99, and 99+ at 100 or more.
Existing markRead remains authoritative and is now observed only while ChatDetail is focused and the app is active.
New friendship system events preserve unread counts instead of incrementing them. Ordinary messages retain existing receipt/unread behavior.
Compatibility note: already-persisted Batch 1.2 unread counts can contain a historical friendship-event increment until that chat is read; no destructive historical counter reset was performed.

14. Reviews and reputation

callReviews/{hash('call_review', callId, reviewerUid)} stores callId, reviewerUid, hostUid, rating, safe predefined tags, createdAt and eligibilityVersion.
Only the caller of an ended, actually connected call with positive duration can submit; recipient must be an approved host and the pair unblocked.
First submission is immutable. Same-rating retry returns idempotently without adding to aggregates; a changed rating is rejected.
hostReputation/{hostUid} stores reviewCount, ratingSum, averageRating, tagCounts and updatedAt. A transaction writes review and aggregate together.
Public UI listens to the aggregate and shows average/count or 'No call reviews yet'. Private call/payment details and free text are not published.
Allowed tags are Friendly, Good conversation and Respectful; the current UI submits stars only.
Old Call Summary ratings were local placeholders, so there was no persisted rating collection to migrate.
Existing completed-call history and the new trusted review identity support later server-side audience segments; no outreach or messages are triggered by reviews.

15. Rules changes

Clients cannot write chat windows, call reviews or host reputation. Window reads belong to the balance owner; public aggregate reads require authentication; review reads belong to the reviewer.
Existing rewards/ledger, friendship, profile-view, wallet, earnings and call protections remain.
A narrowly scoped collection-group block read permits only documents whose blockedUid is the signed-in user, enabling live incoming-block filtering. It adds no write permission.

16. Index change

Added the blocked.blockedUid single-field COLLECTION_GROUP ascending index. Existing indexes remain.
No window or review query requires a new compound index because those reads use deterministic document paths.

17. Functions added/changed

Added callable getChatAccess, getCallReviewStatus and submitCallReview.
Changed sendTextMessage behavior through createSocialMessaging, and startVideoCall through callPreflight.
The existing syncFriendship/trigger still grants once; its system event no longer adds unread counts.
Daily Check-In uses the adapted ledger helper without changing its reward quantities or claim idempotency.
No deployment occurred.

18. Development defaults

Chat windows: exactly 24 hours. Day 1: three Chat Passes. Friendship reward: five Chat Passes once.
Policy default: chat-passes-development-v2. Signup grant activation remains off. VIP unlimited messaging has no enabled tier by default.
Daily preview retains its existing policy. Earned Free Video Time remains disabled by default; only existing trusted config can enable it.
Credit-purchase pass bonuses, real gifts, push notifications and outreach remain unimplemented.

19. Validation

Complete root Jest: 31 suites, 269 tests passed.
Complete Functions Jest: 5 suites, 125 tests passed (these backend tests are also included in the root run; totals are not additive).
Social messaging emulator integration/security: 69 checks passed, including concurrent window creation, expiry renewal, protected windows/reviews, live role/block rules and review aggregation retries.
Rewards/economy emulator security: 32 checks passed.
Existing followRules.emulator.cjs passed its role, ownership, schema, blocking, recipient-query, live-count and unfollow checks.
Babel: all 21 changed client JavaScript files compiled. Index JSON parsed.
Android Expo export passed with 3,018 modules using the installed toolchain; output is in the system TEMP directory, not the repository. No APK/device installation was performed.
git diff --check passed. No dependency/tool upgrades were made.

20. Two-phone physical checklist

- On BOTH Android phones: open/close the keyboard repeatedly, type multiple lines, scroll, dismiss and reopen; composer must remain visible without a double jump. Check bottom navigation gestures and read receipts.
- Give a non-friend consumer three passes via the existing trusted development reward setup. Send to Host A: balance becomes two and status shows a 24-hour unlock.
- Send several more texts to A: balance remains two; host replies and reads cost nothing.
- Send to Host B: balance becomes one. Expiry/new-pass/zero-pass renewal is also covered by automation; if manually advancing expiry, use only trusted emulator/admin fixture data.
- Become Friends: both directions show Friends; consumer texts cost no passes. Unfollow and confirm window/pass rules resume without another friendship reward.
- In consumer-to-approved-host chat, verify Video opens the normal checked flow. Verify host-to-consumer and consumer-to-consumer chats have no paid-host Video or Gift action.
- Tap Gift: coming-soon message only; no financial changes.
- After a completed mutual-friend call, Call Summary shows Friends.
- With daily preview exhausted, earned time disabled and fewer than five Credits at a 25/min rate, try a new call: Get Credits must appear BEFORE camera permission/preview/Agora; no ringing call should be created.
- With valid daily preview and no Credits, connect a normal call; countdown starts only after connection.
- Let free time expire: Continue Paid / End remain explicit. No silent charging; five Credits is sufficient for the first 10-second paid increment, and End remains usable.
- While phone A is elsewhere in the active app, send an ordinary message from B: one foreground banner appears. Own/system messages, startup history and the currently open conversation must not produce banners.
- Tap the banner: it opens the correct chat. Repeat with a block in either direction: no banner/badge exposure for the blocked pair.
- Verify Messages badge increases with unread messages and decreases/clears on reading. 99+ behavior is covered by automated tests.
- Complete a real call, submit stars, and open the host profile on the other phone: average/count update. Retrying must not add another review.
- A missed/rejected/unconnected call must not show an eligible rating flow or change reputation; backend denial is also tested.

21. Known limitations/deferred items

Physical keyboard/OEM diagnosis and two-phone RTC validation remain required. Android JS export is not a native/device test.
The new Functions/rules/index must be loaded in the development emulator for testing and deployed only under separate authorization for production; nothing was deployed here.
Paid affordability is checked at call creation, not reserved; the existing later payment confirmation still rechecks funds.
Chat access copy refreshes on focus, relationship changes, sends and expiry; the backend remains authoritative if balance changes elsewhere between those events.
Historical system-event unread increments can remain until read, as noted above. No production counter migration was performed.
Large inboxes use one unbounded summary listener for an exact total; a trusted aggregate may be appropriate at larger scale.
No review free-text moderation, public review feed, gifts settlement, push infrastructure, mass messaging, or outreach automation was added.

22. Working-tree status

```text
 M App.js
 M firestore.indexes.json
 M firestore.rules
 M functions/src/__tests__/callPaymentLifecycle.test.js
 M functions/src/__tests__/socialMessaging.test.js
 M functions/src/index.js
 M functions/src/messageEntitlements.js
 M functions/src/socialMessaging.js
 M src/components/FreeNowBanner.js
 M src/navigation/MainTabNavigator.js
 M src/navigation/RootNavigator.js
 M src/screens/main/CallSummaryScreen.js
 M src/screens/main/ChatDetailScreen.js
 M src/screens/main/MyProfileScreen.js
 M src/screens/main/RewardsScreen.js
 M src/screens/main/UserProfileScreen.js
 M src/screens/main/VideoCallScreen.js
 M src/screens/main/__tests__/callPaymentUi.test.js
 M src/screens/main/__tests__/messageEntitlementUi.test.js
 M src/screens/main/__tests__/rewardsUi.test.js
 M src/services/__tests__/socialMessaging.emulator.cjs
 M src/services/callNavigationService.js
 M src/services/messagingService.js
?? docs/BATCH_1_3_REPORT.md
?? firebase-debug.log
?? firestore-debug.log
?? functions/src/__tests__/callPreflight.test.js
?? functions/src/callPreflight.js
?? functions/src/callReviews.js
?? src/context/MessageActivityContext.js
?? src/context/__tests__/messageActivityUi.test.js
?? src/hooks/useAndroidKeyboardOverlap.js
?? src/services/__tests__/callEntry.test.js
?? src/services/callReviewService.js
?? src/services/chatPassService.js
?? src/utils/__tests__/messageActivity.test.js
?? src/utils/messageActivity.js
```

23. Diff check / checkpoint state

git diff --check: clean. Index is empty. No staging, commit, push or deployment performed.
