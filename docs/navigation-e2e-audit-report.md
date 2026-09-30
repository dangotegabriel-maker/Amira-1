# CP29 - Navigation and end-to-end flow audit

## Baseline and scope

Branch: `amira-v2`. Starting and final HEAD: `042b59f91ad52053827fbbfcd86ec8deceb9fd94` (`fix: harden realtime session lifecycles`). The initial pre-edit working tree was verified clean. Work resumed after the usage limit with the existing CP29 edits preserved; that expected dirty continuation was not reset or discarded.

Audited **40 distinct registered route names: 34 root-stack routes and 6 distinct tab routes**. Messages and Profile each occur in both role configurations, so there are 8 tab registrations across configurations. Found and fixed **15 confirmed defects**, enumerated below. This is source tracing plus automated component, router, service and domain validation, not a physical-device or live-backend end-to-end test.

## Architecture and authority

`App.js` holds `UserProvider` above `NavigationContainer`, waits for the splash interval and authentication/profile bootstrap, and mounts `RootNavigator`. There is no configured external deep-link or persisted-navigation restoration system. Direct-route testing means internal navigation with missing or malformed params, not a new URL entry system.

RootNavigator blocks loading and profile_error before creating a usable stack. Signed-out routes are separate from the one currently required onboarding step. Completed profiles receive MainTabs and role-filtered stack screens. `isApprovedHost` uses authoritative approval, not gender or an applicant's role label. Pending Creator stays Consumer. There is no role chooser or mode switch. Approval selects a new role-keyed group. The provider enclosing the navigator is keyed by the exact authenticated session; same-UID relogin remounts it and destroys nested navigation, drafts, listeners and screen state.

`IncomingCallListener` and its single QuickMatchListener owner sit above the completed application's screens. Host availability/presence is session-owned, not Connect-focus-owned. Native stack headers or explicit controls provide normal back exits. Call overlays now have stable identities scoped to the active call; call completion resets the stack before the ended call and appends its summary.

Route validation happens before protected screen hooks mount. It validates identifiers and data shape only: it does not authorize messaging, profiles, calls, gifts, VIP or money. Those still require the existing service/backend checks. No backend, Firestore rules, financial contract, dependency or Storage configuration changed.

## Complete registered-route audit

Legend: **C** = completed Consumer (including pending Creator); **H** = completed approved Host; **A** = signed out; **O** = loaded incomplete profile. **R** = session-keyed root remount removes the screen on logout/replacement; **E** = exact-session/target guards additionally reject stale async results; **F** = focus/request cleanup additionally rejects obsolete reads. Every completed-app route supports internal navigation only while its role group is registered. Wrong-role routes are absent, not hidden tabs. No-param static routes consume no route identity and need no invented params. Normal direct navigation pushes above MainTabs, so it has a previous route; this audit does not invent arbitrary persisted one-route states.

| Route | Intended role | Required params | Entry points | Role guard | Missing-param behavior | Session safety | Finding | Action |
|---|---|---|---|---|---|---|---|---|
| Login | A | None | Signed-out bootstrap | Auth branch | Safe sign-in UI | Auth bootstrap | Correct | Preserve |
| PhoneLogin | A | None | Login / internal compatibility | Auth branch | Truthful unavailable UI | Auth branch removal | Correct | Preserve |
| OTP | A | None now | Internal compatibility | Auth branch | Truthful unavailable UI and Login reset | Auth branch removal | Obsolete verification flow | D02 |
| NameSetup | O | None | Required-step calculation | Only required step registered | Reads current profile | R+E | Correct | Preserve |
| BirthdaySetup | O | None | Required-step calculation | Only required step registered | Reads current profile | R+E | Correct | Preserve |
| GenderSetup | O | None | Required-step calculation | Only required step registered | Reads current profile | R+E | Correct | Preserve |
| CountrySetup | O | None | Required-step calculation | Only required step registered | Reads current profile | R+E | Correct | Preserve |
| MainTabs | C/H | None | Completed-profile bootstrap; summary exit | Complete profile + role group | Selects role's initial tab | R | Correct | Preserve |
| ChatDetail | C/H | Other user's valid userId; optional activeCallId | Messages, profile, Match, Host actions, call | Shared; recipient/backend authorization | Safe unavailable view before hooks | R+E+F | Unsafe identity / call stack reuse | D01,D05 |
| UserProfile | C/H | Other user's valid userId; optional activeCallId | Discovery, chat, social, Host activity | Shared; role-specific profile service | Safe unavailable view before hooks | R+E+F | Invalid identity / call stack reuse | D01,D05 |
| VideoCall | C/H | call.callId or call.id; simulator explicitly gated | Normal entry; incoming; Quick Match; sponsored | Shared; server call membership | Safe unavailable view; no RTC mount | R+E | Missing call / obsolete overlays | D01,D05,D06 |
| Wallet | C | None | Profile -> Credit history | Consumer registration | Server wallet/history read | R+E | Unreachable history | D07 |
| MyLevel | C | None | Consumer Profile | Consumer registration + screen/service | Current Consumer read | R+E/F | Correct | Preserve |
| Rewards | C | None | Consumer Profile; message entitlement alert | Consumer registration + service | Current Consumer tasks | R+E | Correct | Preserve |
| VIPStore | C | None | VipInfo -> View VIP status | Consumer registration | Server status/plans; error/retry | R+E+F | Unreachable / failure inferred FREE | D08,D15 |
| Settings | C/H | None | Profile | Shared | Safe settings UI | R; guarded termination | Correct | Preserve |
| EditProfile | C/H | None | Profile | Shared | Reads current profile | R+E | Country freely editable | D12 |
| RechargeHub | C | None | Profile; insufficient-credit messages/gifts/calls | Consumer registration | Server balance; checkout unavailable | R+E | Correct | Preserve |
| PaymentMethod | C | None | Internal compatibility; no live checkout CTA | Consumer registration | Truthful unavailable view | R; static | Correct deferred route | Preserve |
| Payment | C | None | Internal compatibility; no live checkout CTA | Consumer registration | Truthful unavailable view | R; static | Correct deferred route | Preserve |
| StoryViewer | C/H | Optional array of public HTTPS image/video stories | Home / Host profile | Shared; existing public discovery projection | Empty view if absent; unavailable if malformed | R | Unsafe array / retained index | D01,D13 |
| Moments | C/H | None | Internal compatibility | Shared | Truthful unavailable view | R; static | No visible back control | D14 |
| Leaderboard | C/H | None | Internal compatibility | Shared | Gift rankings unavailable | R; static | Correct deferred route | Preserve |
| GiftLedger | C | Optional sent/received type | Internal compatibility | Consumer registration | Generic unavailable Gift History | R; static | Destructured absent params | D01 |
| CallSummary | C/H | Finite nonnegative duration; optional valid callId/targetUserId | Ended call | Shared; review/follow server checks | Safe unavailable view | R+E+F | Missing params crashed; overlay exit | D01,D06 |
| HelpSupport | C/H | None | Profile | Shared | Static unavailable destinations | R; static | Three no-op actions | D09 |
| HostApplication | C | None | Consumer Profile | Complete Consumer only | Hydrates authoritative draft; error/retry | R+E | Onboarding bypass, race, load failure | D03,D10,D11 |
| FollowingList | C/H | None | Profile | Shared; role-aware social service | Loads current user's following | R+F | Correct | Preserve |
| HostEarnings | H | None | Host Profile | Host registration + service | Authoritative earnings | R+E/F | Correct | Preserve |
| HostVisitors | H | None | Internal compatibility; Activity Visitors is tab flow | Host registration; Host activity | Loads Visitors activity | R+F | Correct | Preserve |
| WhoViewedMe | C | None | Profile | Consumer registration + server VIP projection | Current aggregate or gated identities | R+F | Correct | Preserve |
| VipInfo | C | None | Profile; locked Who Viewed Me | Consumer registration | Static benefits + status link | R; static | No onward status route | D08 |
| InviteEarn | C/H | None | Profile | Shared | Referral rewards unavailable | R; static | Correct deferred route | Preserve |
| BlockedUsers | C/H | None | Profile / Settings | Shared; own block service | Current block list | R+F | Correct | Preserve |
| Home (tab) | C | None | Consumer initial tab | Consumer tabs only | Discovery loading/empty/error states | R+E/F | Correct | Preserve |
| Match (tab) | C | None | Consumer tabs | Consumer tabs only | Discovery and Quick Match states | R+E/F | Correct navigation; availability distinction below | Preserve |
| Messages (tab) | C/H | None | Both role tab sets | Shared; own conversations | Empty/error list | R+E/F | Correct | Preserve |
| Profile (tab) | C/H | None | Both role tab sets | Explicit role-specific actions | Current user | R+E/F | Missing history link | D07 |
| Connect (tab) | H | None | Host initial tab; Host Profile CTA | Host tabs only | Host discovery/availability | R+E/F | Correct | Preserve |
| Activity (tab) | H | None | Host tabs | Host tabs only | All/Visitors/Likes/Followers/Gifts/Calls | R+F | Correct | Preserve |

## End-to-end journeys A-S

### A-B. Startup, authentication and onboarding

Cold start waits for Firebase auth and authoritative profile bootstrap. A failed profile read shows retry rather than choosing Consumer, Host or onboarding. Login routes disappear once authenticated. Required profile steps remain Name, Birthday, Gender and Country according to existing `getRequiredProfileStep`; one step is registered at a time, and completion refreshes authoritative state. No new onboarding requirement was added. The extra HostApplication registration during incomplete onboarding was removed (D03). Phone login is already disabled at the auth boundary; direct OTP now gives the same truth instead of the obsolete verification/write UI (D02).

CP25/28 tests cover stale profile resolutions/rejections, exact-session capability invalidation, same UID with reused Auth object, stale onboarding writes, and nested logout. The new navigation test observes actual subtree mount/unmount effects on session-key replacement; it is not a snapshot test. Successful auth/profile transitions select the appropriate root instead of imperatively navigating back into obsolete auth screens.

### C. Consumer main app

Tabs are exactly Home, Match, Messages, Profile. Home's Host cards/profile actions use approved Host discovery and current identity. For You/New filtering and filter state persist while switching the existing discovery views until cleared. Story reading uses the existing public-media projection; there is no story creation or newly introduced VIP story pipeline. Match Next/profile/message/normal call routes retain current recipient identity and existing availability gates. Normal calls from Home card, Host profile, Match and chat all use `startVideoCall` and its disclosure/preflight/request chain. Consumer cannot register HostEarnings, HostVisitors, Connect or Activity. No extra Wallet or Creator tab was added.

### D. Host main app

Tabs are exactly Connect, Messages, Activity, Profile. Approved Host status, not an application or gender, selects this tree. Connect availability is not torn down merely by switching tabs. Consumer discovery/profile routes remain Host-specific. Activity has All, Visitors, Likes, Followers, Gifts and Calls; its rows use backend-projected `canOpenProfile`/`canInteract` for profile, message and sponsored invitation actions. Earnings remains a Host route. Consumer purchases, own Level/Rewards, Consumer viewer identities and Creator application are absent from the Host root. There is no role switch to Home/Match. The app-wide incoming and Quick Match listeners remain under the authenticated root.

### E. Messaging

Messages list -> ChatDetail -> recipient profile -> existing conversation is keyed by valid recipient identity. Missing, malformed or self identity fails before conversation construction/listeners (D01). Recipient identity is fetched through the existing service rather than trusted from display params; absent/blocked recipients fail truthfully and backend checks remain authoritative. Ordinary repeated navigation reuses a conversation; in-call chat/profile navigation uses activeCallId so it cannot truncate the call (D05).

Entitlement order remains Friends, active 24-hour access, Free Message/Chat Pass availability, then existing paid 24-hour access and insufficient-credit Recharge paths. Host sending remains free without giving the Consumer a free reply. No economics changed. The newest 250 messages are still delivered chronologically. Existing tests cover draft preservation during temporary blur, draft reset on recipient/account replacement, logical send identity on retry, stale send completion, focus/AppState listeners and unread cleanup. No photo-message or translation success was added.

### F. Normal video call and summary

The common entry path shows disclosed terms, performs canonical prepare/request, and navigates only while its originating session/target remains current. It now locks rapid taps during disclosure and request; cancel permits retry (D04). Server authority still controls Consumer-to-approved-Host eligibility, blocks, online status, one active call, affordability and RTC membership. An ID-only authoritative incoming/Quick Match result can enter VideoCall and load its call snapshot; absence of any call ID cannot mount RTC (D01).

Call chat and profile overlays retain the call screen (D05). End/remote-end navigation removes the call and overlays before adding CallSummary or returning to the originating route (D06). A repeated completion for a call key already absent cannot replace unrelated current navigation. Summary's explicit exit resets to MainTabs, whose role selects Home or Connect; native back cannot return to the ended call. Server-connected billing, 10-second increments, actual-connected FVT, no debt, one active call and the existing 30-second ring timeout are unchanged.

### G. Quick Match

Consumer request/poll/cancel and Host app-wide offer accept/reject retain exact-session guards, single-shot navigation, expiration handling and normal incoming-call precedence. Listener ownership stays outside Connect. Backend tests retain the 20-connected-second intro, then FVT, then paid continuation; technical preconnect does not consume connected entitlements. Blocks and authoritative eligibility remain enforced.

**Existing product distinction:** ordinary Match discovery prioritizes online Hosts and can show offline fallback; Quick Match backend `eligibleHost` requires an approved **online** Host and selects up to the existing sequential-offer limit. The request's offline-fallback wording is broader than the existing Quick Match contract. CP29 does not silently change Host availability/acceptance eligibility or claim offline Quick Match was verified. Expanding Quick Match to offline Hosts would be a separate backend/product change, not a navigation fix.

### H. Sponsored calls

Host invitation actions from supported Connect/activity/profile/chat surfaces remain server-backed and disclosed. Consumer acceptance enters the same guarded call lifecycle. Sponsored allocation remains 30 connected seconds, then FVT, then paid continuation. Invitation idempotency, expiry/block checks and stale-session handling stay in existing services/backend/listeners. No synthetic accepted call or new financial policy was introduced.

### I. Gifts

Existing GiftTray entry from an approved Host profile and connected live call (plus the existing chat Host action) retains valid recipient/source/call context. Host-to-Consumer gift actions remain excluded. Tray locking/idempotent transaction identity prevents duplicate logical sends; insufficient purchased Credits offers Recharge. Existing component/domain tests cover denied/failed/successful sends and stale-session handling. Only purchased Credits fund gifts; there are no promotional gifts or client ledger writes. GiftLedger remains an explicitly unavailable compatibility view, now safe without params.

### J-M. VIP, Credits, Level and Rewards

Profile -> VipInfo now reaches VIPStore status (D08). Server status/plan read failure now shows retry, not an inferred FREE membership (D15). FREE/VIP, fixed 3/7/30-day model, no active renewal or auto-renew, and backend VIP authorization remain unchanged. Checkout remains unavailable: no prices or discounts were invented. Consumer photo sharing still needs VIP authorization and usable Storage; it is not enabled by navigation.

Profile exposes Recharge and the existing authoritative wallet/transaction history (D07). Wallet and Recharge read backend state, and the insufficient-credit paths use the registered Consumer Recharge route. No fake credits, local ledger authority or Wallet tab was introduced. PaymentMethod and Payment remain compatibility unavailable views. Wallet does not start a payment; users return to Profile's Recharge CTA.

Consumer Profile -> MyLevel and Rewards remain Consumer-only. Level uses lifetime purchased qualification, does not fall when spending, excludes bonus/reward/promo qualification, and has no invented thresholds, discounts or free VIP. Host sees Consumer Level only in the established permitted contexts. Rewards preserve missed-day reset for the 7-day check-in, one major popup per session and no promotional gifts. Existing UI/domain tests remain in the full suites.

### N-O. Who Viewed Me and social

Who Viewed Me asks the server for count/reveal data: FREE receives a locked count presentation; VIP can receive permitted identities and navigate to Host profiles. Direct navigation to the screen does not grant VIP identity access. Following list/profile/back and Blocked Users/unblock/back remain current-account flows. Mutual follow establishes Friends; no friend-request system was added. Backend social/messaging/call/gift/Quick Match/invitation/discovery checks remain the authority for bilateral blocks; a syntactically valid route ID does not bypass them. Public story URLs already returned by discovery are not a new authorization mechanism.

### P. Creator application

Order remains exactly About You -> Your Profile -> Photos -> Intro Video -> Verification -> Payout Setup -> Review & Submit. Saved fields hydrate when reopening; the existing wizard starts at About You rather than persisting a step index. Load failure now blocks editing and offers retry (D11). Continue/upload/submit share a synchronous ref lock; Back cannot race a pending save, and double Continue cannot skip a step (D10). Exact-session checks remain between asynchronous actions.

Development preview may continue past unavailable media steps, but required media still disables final submission and the application service transaction independently validates the requirements. Storage remains unavailable; **a new application cannot truthfully be completed without real required photo/video/verification evidence**. No placeholder media, upload success, Storage enablement or media-policy bypass was added. Pending/submitted displays under-review and returns to Consumer; submission never grants approved Host status. Approval remains authoritative.

### Q. Profile/settings/account

Consumer Profile retains Amira ID, Credits/Recharge/history, VIP, viewer count/identities, Following, Invite & Earn, Settings and Creator application. Host Profile retains Host earnings and Connect access without Consumer purchase/role-switch UI. No Consumer interests were added. Country is now read-only and omitted from EditProfile writes (D12); DOB remains uneditable there. This is a UI/product correction, not a claim that Firestore rules were changed to prohibit every possible country write.

Settings and Profile use shared session termination; nested logout destroys the authenticated navigation subtree. Retained old logout callbacks cannot terminate a replacement authenticated session according to CP25/28 tests. Help's three unfinished destinations now say unavailable rather than presenting no-op actions (D09). Existing unavailable settings, referrals, translation and payment flows remain truthful.

### R-S. Direct routes and back/replace/reset

All registered routes are listed above, including dormant compatibility routes. Critical params are validated before hooks, while no-param informational screens remain usable. Native router tests exercise reuse/truncation, in-call chat/profile round trips, ending below overlays, duplicate completion, and return to an existing conversation. Auth/onboarding route groups and exact-session remounting prevent old-account stacks. No global navigation rewrite or new deep-link system was introduced. Story collection replacement resets its index (D13); empty/invalid story exits are safe. Moments now exposes the native header/back control (D14).

## Confirmed defects and regression evidence

Evidence refers to the starting baseline plus focused source tracing; fixes remain in the working tree. Test names below identify behavioral checks unless explicitly described as a configuration assertion.

| ID | Evidence and user impact | Root cause | Exact fix | Regression test |
|---|---|---|---|---|
| D01 | Chat missing identity could remain loading; self identity could throw in conversation ID construction. CallSummary/GiftLedger destructured missing route params; VideoCall required absent call data; StoryViewer assumed an array; UserProfile accepted malformed IDs. Direct internal navigation could crash, spin or run invalid reads. | Screen hooks consumed unvalidated critical params. | New routeSafety pre-mount wrapper on six screens; safe fallback; GiftLedger generic absent-param view; StoryViewer empty default. IDs use existing server-compatible syntax; valid call-ID-only results remain accepted. | `routeSafety.test.js` invalid-param matrix and obsolete exit; `messageEntitlementUi.test.js` invalid/self chat starts no conversation work. |
| D02 | OTP exposed verification inputs and obsolete auth/profile/wallet write flow even though native phone verification was unavailable. | Legacy route remained a working-looking dead end. | Truthful unavailable OTP view with reset to Login. | `truthfulUi.test.js`: OTP direct entry without params and sign-in exit. |
| D03 | Incomplete-profile stack also registered HostApplication. | Creator application was reachable during required onboarding. | Remove only that registration; retain completed Consumer entry. | `accountNavigation.test.js`: incomplete profile has only required step; existing stale onboarding tests. |
| D04 | Repeated normal-call presses could create several disclosures and prepare/request chains. | No synchronous entry lock across awaiting disclosure/request. | Per-navigation WeakMap entry lock, guard-aware invalidation, release on completion/cancel. | `callEntry.test.js`: rapid taps, cancel/retry; existing stale disclosure/request tests. |
| D05 | StackRouter.navigate reuses an older same-name route and truncates intervening routes. Call -> Chat could pop the call; Chat -> Profile could do the same when the call originated at that profile. | Route identity ignored active-call context. | ChatDetail/UserProfile getId combines target with activeCallId; call context propagates through call chat and profile/message. | Real StackRouter tests in `routeSafety.test.js`; `callPaymentUi.test.js` call chat params; `messageEntitlementUi.test.js` profile context propagation. |
| D06 | Replacing VideoCall by key while Chat/Profile was above it left the overlay covering the summary; later back could expose obsolete call state. | replace affected only the source route, not its overlays. | leaveCallRoute resets preserved prefix plus summary, or prefix alone; ignores already-removed call key. | `routeSafety.test.js`: completion beneath overlays, repeated completion, back; `callPaymentUi.test.js`: summary MainTabs exit and existing call termination tests. |
| D07 | Wallet/history screen was registered but Profile offered only Recharge. | No legitimate Consumer history entry point. | Add Consumer Credit history row -> Wallet. | `truthfulUi.test.js`: Profile history CTA. |
| D08 | Profile -> VipInfo stopped at copy although VIPStore status already existed. | No onward navigation from VIP information. | Add View VIP status -> VIPStore. | `truthfulUi.test.js`: VIP status CTA; role-route exclusion tests. |
| D09 | FAQ, Live Support and Safety Guide looked tappable but each action was empty. | No-op placeholders presented as available actions. | Disabled informational rows with Not available yet labels. | `truthfulUi.test.js`: each row disabled and no navigation. |
| D10 | Double Continue could advance multiple wizard steps; Back during an awaiting save could change the step being completed. | React busy state was not a synchronous lock, and Back ignored pending work. | Ref lock on next/upload/submit; busy/lock guard on previous-step action. | `screenSessionLifecycle.test.js`: duplicate handler invocation, deferred save/Back, all seven preview steps and blocked final media submission. |
| D11 | Failed application hydration was swallowed, leaving editable blank state. | getApplication catch ignored the error. | Explicit failed-load state; retry authoritative hydration before editing. | `screenSessionLifecycle.test.js`: rejected hydration, no Continue, retry restores saved bio. |
| D12 | EditProfile opened a country selector and wrote countryCode/countryName/phoneCode. | General profile editing exposed a locked onboarding attribute. | Read-only country; remove selector and country fields from save payload. | `screenSessionLifecycle.test.js`: read-only control; save excludes country and DOB. |
| D13 | Replacing StoryViewer's collection after advancing retained its previous index, potentially showing the wrong story or an empty view. | Local index not reset when route collection changed. | Reset index on collection change; safe back/MainTabs fallback. | `routeSafety.test.js`: advance story, replace collection, verify first new story, empty-state exit. |
| D14 | Moments was headerless and contained no own back control. | Static unavailable screen inherited headerShown:false. | Enable native header/back for this route. | `accountNavigation.test.js`: native header registration assertion; static truthful UI test. Native device gesture/header interaction remains untested. |
| D15 | VIPStore catch set state to FREE on a network/status/plan error. A VIP could see the nonmember view without a successful read. | Read failure was converted to membership data. | Error/retry state, clear pending status/plans during reload, no inferred membership. | `screenSessionLifecycle.test.js`: failed read never shows nonmember view; retry displays authoritative active VIP. |

## Already-correct areas and deferred limitations

Preserved: exact Consumer/Host tabs; pending Consumer routing; authoritative profile retry; required-step routing; same-UID exact-session invalidation; app-wide incoming/Quick Match ownership and precedence; presence isolation; unread/message listener isolation; newest-250 chronology; draft focus behavior; RTC/timer/AppState cleanup; guarded financial reads and logout; server financial/social authority. Existing tests for these run with the new regressions.

Deferred product/infrastructure limitations are not converted into fake completed flows: Storage/media uploads, Consumer photo messaging, Story creation, Moment uploads, translation provider, payment/recharge/VIP checkout, referrals, gift rankings/history compatibility surfaces and Help destinations remain unavailable. Creator final submission cannot be completed with absent real evidence. Public story reading remains supported where existing authoritative discovery supplies it. Quick Match offline-fallback wording versus existing online-only eligibility is explicitly recorded above. No physical Android/iOS devices, native build, live payment, live RTC call, live Firebase account flow or deployment was exercised.

## Changed files

Production: **16 files** (routeSafety is new).

- `src/navigation/RootNavigator.js`
- `src/navigation/routeSafety.js`
- `src/screens/host/HostApplicationScreen.js`
- `src/screens/main/CallSummaryScreen.js`
- `src/screens/main/ChatDetailScreen.js`
- `src/screens/main/EditProfileScreen.js`
- `src/screens/main/GiftLedgerScreen.js`
- `src/screens/main/HelpSupportScreen.js`
- `src/screens/main/MyProfileScreen.js`
- `src/screens/main/StoryViewerScreen.js`
- `src/screens/main/UserProfileScreen.js`
- `src/screens/main/VIPStoreScreen.js`
- `src/screens/main/VideoCallScreen.js`
- `src/screens/main/VipInfoScreen.js`
- `src/screens/onboarding/OTPScreen.js`
- `src/services/callNavigationService.js`

Tests: **7 files** (routeSafety.test.js is new).

- `src/navigation/__tests__/accountNavigation.test.js`
- `src/navigation/__tests__/routeSafety.test.js`
- `src/screens/main/__tests__/callPaymentUi.test.js`
- `src/screens/main/__tests__/messageEntitlementUi.test.js`
- `src/screens/main/__tests__/screenSessionLifecycle.test.js`
- `src/screens/main/__tests__/truthfulUi.test.js`
- `src/services/__tests__/callEntry.test.js`

Documentation: `docs/navigation-e2e-audit-report.md` and `docs/navigation-e2e-audit-git-status.txt`. Total final unstaged/untracked files: **25**.

## Validation

All commands ran against the local installed dependencies. Node/Jest/Babel required the approved sandbox escape for workspace-parent path resolution on Windows. No dependency installation or external service write was performed.

1. Initial focused CP29 run: 5 suites / 71 tests passed. Initial Creator/financial lifecycle run: 1 suite / 11 tests passed.
2. Expanded focused CP29 and required lifecycle regressions: **16 suites / 215 tests passed**, 0 snapshots (34.261 s):

```powershell
node node_modules/jest/bin/jest.js --runInBand --silent src/navigation src/context/__tests__/userSessionIsolation.test.js src/context/__tests__/messageActivityUi.test.js src/services/__tests__/sessionListeners.test.js src/services/__tests__/callEntry.test.js src/services/__tests__/messageHistory.test.js src/services/__tests__/messagingOpen.test.js src/services/__tests__/hostApplicationService.test.js src/screens/main/__tests__/messageEntitlementUi.test.js src/screens/main/__tests__/callPaymentUi.test.js src/screens/main/__tests__/screenSessionLifecycle.test.js src/screens/main/__tests__/truthfulUi.test.js src/components/__tests__/quickMatchLifecycle.test.js src/components/__tests__/incomingCallLifecycle.test.js src/utils/__tests__/creatorApplication.test.js
```

3. Final VIP failure/retry addition plus financial/Creator lifecycle recheck: **1 suite / 12 tests passed**, 0 snapshots (9.547 s):

```powershell
node node_modules/jest/bin/jest.js --runInBand --silent src/screens/main/__tests__/screenSessionLifecycle.test.js
```

4. Full root Jest: **77 suites / 898 tests passed**, 0 snapshots (200.681 s), including the final VIP regression. The root configuration also discovers Functions tests; the separate Functions run below is intentional and is not an additional 402 unique tests.

```powershell
# C:\Users\NiBS-GA\Amira-1
node node_modules/jest/bin/jest.js --runInBand --silent
```

5. Functions Jest: **17 suites / 402 tests passed**, 0 snapshots (30.499 s).

```powershell
# C:\Users\NiBS-GA\Amira-1\functions
node node_modules/jest/bin/jest.js --runInBand --silent
```

6. Babel: **23 changed/new JavaScript files transformed successfully** with the installed Expo preset. Tracked changes and untracked JS files were both included. Exact validation script piped to `node`:

```javascript
const cp = require('child_process'), fs = require('fs'), babel = require('@babel/core');
const files = [...new Set(['diff --name-only', 'ls-files --others --exclude-standard']
  .flatMap(command => cp.execSync('git -c core.safecrlf=false ' + command, { encoding: 'utf8' })
    .trim().split(/\r?\n/)))].filter(file => file.endsWith('.js'));
for (const filename of files) babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, babelrc: false, configFile: false, presets: ['babel-preset-expo']
});
console.log(`Babel transformed ${files.length} changed/new JavaScript files successfully.`);
```

7. `git -c core.safecrlf=false diff --check`: **passed**, exit 0, no findings. `git diff --cached --name-only`: empty; no staged files. Branch/HEAD unchanged.
8. Emulator/security rerun: **not necessary**. No backend/rules/contracts changed, and the changed behaviors are React navigation, screen state, input validation and client duplicate-entry locking. No existing emulator test directly exercises those behaviors. Backend domain regression tests passed; this is not a claim of a new emulator run.
9. Physical-device validation: **not performed**. Native header/gesture behavior, live RTC/network transitions and unavailable infrastructure require later device/live-environment validation.


## Security and delivery

No Firebase deployment, Storage enablement, billing assumption change, financial-economics change, new role grant or weakened authority boundary. Paystack secrets and Agora certificates remain server-only; no secret/config content was added to this report. Quick Login/simulator remain development-gated. Production changes are limited to confirmed navigation, route-input and truthful-state defects. No files staged; no commit, push or deployment. All CP29 changes are left unstaged for manual review.

## Final git status --short

```text
 M src/navigation/RootNavigator.js
 M src/navigation/__tests__/accountNavigation.test.js
 M src/screens/host/HostApplicationScreen.js
 M src/screens/main/CallSummaryScreen.js
 M src/screens/main/ChatDetailScreen.js
 M src/screens/main/EditProfileScreen.js
 M src/screens/main/GiftLedgerScreen.js
 M src/screens/main/HelpSupportScreen.js
 M src/screens/main/MyProfileScreen.js
 M src/screens/main/StoryViewerScreen.js
 M src/screens/main/UserProfileScreen.js
 M src/screens/main/VIPStoreScreen.js
 M src/screens/main/VideoCallScreen.js
 M src/screens/main/VipInfoScreen.js
 M src/screens/main/__tests__/callPaymentUi.test.js
 M src/screens/main/__tests__/messageEntitlementUi.test.js
 M src/screens/main/__tests__/screenSessionLifecycle.test.js
 M src/screens/main/__tests__/truthfulUi.test.js
 M src/screens/onboarding/OTPScreen.js
 M src/services/__tests__/callEntry.test.js
 M src/services/callNavigationService.js
?? docs/navigation-e2e-audit-git-status.txt
?? docs/navigation-e2e-audit-report.md
?? src/navigation/__tests__/routeSafety.test.js
?? src/navigation/routeSafety.js
```
