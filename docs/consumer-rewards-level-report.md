# Consumer Rewards Cleanup + Amira Level Foundation

Baseline: `amira-v2`, `fa14fc8`. Implementation and local validation completed on 2026-09-18. No commit, push, deployment, production record changes, billing/API activation, or Storage activation was performed.

## 1. Executive summary

Daily Check-In now follows consecutive UTC calendar days, resets after a missed day, and wraps after Day 7. Active Consumer Rewards no longer support Promotional Gifts. Consumers and pending Creator applicants have My Level; approved Hosts do not. The authoritative Level foundation supports exactly Levels 0–10, protected qualifying purchase accounting, derived Level, and configuration-driven one-time milestones. No production thresholds or milestone packages were supplied: real Consumers resolve to Level 0 and see no fabricated numeric progress or milestone claim buttons.

Payment verification, purchasing, VIP, commercial Gifts, Quick Match lifecycle, and other excluded features were not implemented. Creator approval authority and call-recovery implementation remain unchanged. Incoming-call Level display is deferred.

## 2. Exact files changed

Modified source/test files:

- `firestore.rules`
- `functions/src/economyDomain.js`
- `functions/src/consumerRewards.js`
- `functions/src/messageEntitlements.js`
- `functions/src/index.js`
- `functions/src/__tests__/callPaymentLifecycle.test.js`
- `functions/src/__tests__/economyDomain.test.js`
- `src/navigation/RootNavigator.js`
- `src/navigation/__tests__/accountNavigation.test.js`
- `src/screens/main/MyProfileScreen.js`
- `src/screens/main/RewardsScreen.js`
- `src/screens/main/UserProfileScreen.js`
- `src/screens/main/__tests__/messageEntitlementUi.test.js`
- `src/screens/main/__tests__/rewardsUi.test.js`
- `src/services/__tests__/rewardsRules.emulator.cjs`

New source/test files:

- `functions/src/checkInDomain.js`
- `functions/src/levelDomain.js`
- `functions/src/consumerLevels.js`
- `functions/src/__tests__/levelDomain.test.js`
- `functions/src/__tests__/consumerLevels.test.js`
- `src/components/AmiraLevelBadge.js`
- `src/screens/main/MyLevelScreen.js`
- `src/screens/main/__tests__/myLevelUi.test.js`
- `src/screens/main/__tests__/consumerLevelVisibility.test.js`
- `src/services/levelService.js`
- `src/services/__tests__/levelService.test.js`
- `src/services/__tests__/levelRewards.emulator.cjs`

Report artifacts: this file and `docs/consumer-rewards-level-git-status.txt`.

Git also reports `functions/src/__tests__/callRecovery.emulator.cjs` as modified in its worktree status, but it has no content diff and its worktree blob equals HEAD (`c64f55a945b40ff54f602dc1137972f356017a7e`). It is not an implementation change.

## 3. Rewards behavior before versus after

| Area | Before | After |
| --- | --- | --- |
| Check-in advancement | Lifetime claim-count cycle could survive missed days | Consecutive UTC dates determine advancement; a gap resets to Day 1 |
| Check-in repetition | Existing deterministic daily claims | Same idempotent daily claim protection retained |
| Promotional Gift | Supported reward balance/configuration and UI | Removed from active reward normalization, grants, schedule and UI |
| Day 4 | Promotional Gift-only reward | Check-in recorded with no economic reward |
| Day 7 | Valid reward bundle plus invalid Gift component | Valid bundle retained; Gift component removed |
| Level | No authoritative Consumer Level experience | Protected accounting model, canonical calculator, Consumer My Level and milestones |
| Wallet | Existing balance model | Preserved; never treated as qualifying lifetime purchases |

Getting Started and Daily Tasks had no implemented active task catalogue/UI/claim lifecycle to replace in this baseline. Existing generic signup/task reward source contracts remain; no tasks or economic values were invented. Existing authoritative Consumer reward grant protections remain in place.

## 4. Exact Daily Check-In configuration

These are the existing development fallback values after removing only invalid Gift components. They are not new production economics. Existing trusted reward configuration remains usable after non-Gift normalization.

| Day | Reward |
| --- | --- |
| 1 | 3 Free Messages |
| 2 | 10 seconds Free Video Time |
| 3 | 5 Free Messages |
| 4 | No economic reward; check-in only |
| 5 | 15 seconds Free Video Time |
| 6 | 1 Quick Match entitlement |
| 7 | 3 Free Messages + 10 seconds Free Video Time |

A completed seven-day fallback cycle totals 11 Free Messages, 35 Free Video seconds and 1 Quick Match entitlement. No new reward fills the Day 4 gap. Day 4 UI says “Check-in only” and successful claim says “Check-in complete”. Quick Match remains an entitlement, without its lifecycle being activated.

Calendar boundaries use the existing backend UTC date convention. The server clock decides eligibility, not a client date. Same-day repeats do not grant twice. Yesterday advances the last reward day; a missing day resets; Day 7 followed by the next consecutive eligible date becomes Day 1.

## 5. Promotional Gift removal and retained legacy material

Removed from the active reward type normalization/addition, fallback check-in configuration, supported promotional interaction allocation, Rewards labels/balance tiles, ordinary fixtures and expectations. Milestone configuration rejects Gift rewards. Historical rewards returned to the UI are normalized to supported types.

Deliberately obsolete Gift data appears only in negative tests proving that it cannot grant a supported reward. Previously stored Gift fields/history and trusted legacy configuration may remain in Firestore; merge updates do not destructively delete them. They are ignored and are not displayed, spent, converted, or supported by current Consumer Rewards. Optional future archival is separate from this batch. Existing disconnected commercial `paid_gift` domain support was not expanded into a Gift implementation or settlement flow.

## 6. Amira Level data model

Private account: `consumerLevels/{consumerUid}`. Canonical input: `lifetimeQualifyingPurchasedCredits`, a nonnegative safe integer. Pure future helpers also bind `consumerUid` to the account. There is no required writable cached Level.

Reserved associated receipts: `consumerLevels/{consumerUid}/qualifyingPurchases/{purchaseId}`. Pure helpers prepare `purchaseId`, `consumerUid`, `qualifyingCredits`, `reversedQualifyingCredits` and an idempotent reversal-ID/amount map. No purchase writer or provider integration is installed.

Milestone history: `consumerLevels/{consumerUid}/milestoneClaims/{level}`. Claims contain the bound Consumer UID, Level, exact granted reward, server timestamp and configuration version. A deterministic Level document provides lifetime one-time claim identity.

Trusted policy location: `levelConfig/current`, containing an optional `thresholds` array and `milestones` mapping, with optional version metadata. Clients cannot read or write policy directly. No production policy document was created.

## 7. Canonical derived Level

`functions/src/levelDomain.js` defines exactly 11 Levels and the sole calculator. It reads only the authoritative qualifying lifetime total and validated thresholds. Thresholds must contain exactly 11 strictly ascending nonnegative safe integers, starting at zero. Level is the greatest threshold reached, capped at 10.

Invalid/missing totals safely display Level 0. Trusted purchase mutation helpers reject corrupt stored totals rather than silently overwrite them. Wallet balances, cached user Level fields, rewards, spending and timestamps are not calculator inputs. Test-only threshold fixtures prove all boundaries and reversal-driven reduction.

## 8. Missing production thresholds

Default policy explicitly has `thresholds: null` and no milestones. Missing or invalid thresholds yield Level 0. Test thresholds reside in isolated tests/emulator demo namespaces, not production defaults. UI exposes no purchased-Credit fraction, remaining-Credit quote, percentage, or fabricated unlock. Benefits/progression copy explains that details are being prepared.

## 9. My Level UX

Consumer-only navigation opens My Level with 11 horizontally paged Level cards. The authoritative current Level is selected initially and framed clearly. Cards distinguish current, unlocked and locked Levels. Copy says “Your Amira Level grows with qualifying Credit purchases.” Benefits and progression details are restrained until configured. Spending and inactivity do not lower Level.

Recharge navigates only to the existing `RechargeHub`. It performs no purchase. Loading/error/retry states avoid a fabricated successful Level result. Focus refresh and post-claim refresh fetch authoritative data. No automatic engagement popup was added; milestone alerts require an explicit user claim action, preserving the existing session popup policy.

## 10. Reusable Level badge

`AmiraLevelBadge` provides compact accessible Level text and a distinct color palette for Levels 0–10, with a larger framed option for My Level. Invalid display values are bounded safely. It uses no VIP terminology or VIP component. It can be reused for future approved placements.

## 11. Consumer Profile changes

My Level is a small addition to the existing Consumer rewards section beside Rewards & Tasks. Existing Profile destinations and layout are preserved. Pending applicants retain Consumer routes and rewards; approved Hosts have neither Consumer My Level nor Consumer Rewards access. Wallet amounts are not used to calculate the entry or screen.

## 12. Host visibility of Consumer Level

Approved Hosts viewing a real Consumer full profile request `getConsumerAmiraLevel` and show its derived badge. The endpoint returns only `{level}`, not purchase totals/history. It permits self access or an approved Host, requires a Consumer target and respects blocking in both directions. Cached/demo balance data does not supply a Level. Failures omit the badge rather than invent a value.

No Level is added to small Host Connect Consumer cards or conversation headers. Both exclusions have UI regression assertions. Hosts themselves have no Consumer Level experience.

## 13. Incoming-call display

Deferred. No changes were made to incoming-call, billing, recovery or RTC architecture to accommodate a badge. The reusable component and restricted public Level endpoint provide a foundation for a later clean integration.

## 14. Milestone architecture

Authenticated `getMyAmiraLevel` returns derived Level, configuration status and only configured milestone rewards, with claimed/eligible state. Unconfigured milestones expose no action.

`claimAmiraLevelMilestone` accepts only a Level integer 1–10; the UID comes from authentication. One transaction checks Consumer role, policy, qualifying account, previous claim and reward balances, then grants and creates the deterministic claim. Free Message grants additionally use the existing deterministic message transaction ledger with source `level_milestone`. Repeated/concurrent claims grant once. Higher Level, refunds and later regained eligibility do not permit replay.

Only existing Free Message, Free Video seconds and Quick Match entitlement types are supported. Bonus Credits are deferred because the existing wallet does not safely distinguish purchased from bonus Credits. Unsupported Gift/Bonus reward configuration is rejected. No approved production milestones or rewards were invented; no automatic milestone grant exists. Already granted milestones are not clawed back by the pure refund contract.

## 15. Security and rules

Clients cannot write Level accounts, qualifying purchase receipts, milestone claims, or policy. Own Consumer access to private account/history is read-only; approved Hosts cannot read that private history. User creation/update rules also protect known cached Level/qualifying-total fields. These fields are not calculator authority even if written by a trusted administrator.

New callables require authentication and protected account-role classification. Claims cannot redirect to another UID or self-assert a higher Level. Pending applicants remain Consumers; `hostStatus.isApproved` remains the approval authority from the baseline. Daily Check-In retains backend daily identity and transactional grants. No index changes, broad user privacy migration, role authority changes, or weakening of call/social/messaging/earnings rules was introduced. Emulator validation includes an ordinary permitted profile update, proving the new field protection does not block normal edits.

## 16. Future verified-purchase contract

`recordVerifiedPurchase(account, existingReceipt, input)` is pure preparation, not a callable, verifier or payment function. Future trusted settlement must first verify the provider server-side and bind the stable provider purchase identity, Consumer UID and qualifying purchased-Credit amount. The internal `verified: true` precondition is not client proof of payment and must never become an accepted client assertion.

The helper rejects invalid amounts, identity mismatches, corrupt totals and overflow. An identical existing receipt is idempotent. A new verified receipt increases only the qualifying lifetime amount. Future settlement must atomically persist receipt, lifetime total and the verified purchased wallet credit according to approved future wallet rules, then derive Level/eligibility using the shared policy. Bonus/promotional/reward portions must be excluded. No client transaction-like data or current wallet balance may backfill this total. No provider secrets were copied into new code.

## 17. Future refund/chargeback contract

`reverseVerifiedPurchase(account, associatedReceipt, input)` requires a future trusted verified reversal, bound Consumer UID, stable reversal identity and qualifying amount from that receipt. It limits the amount to the purchase's unreversed qualifying amount and the stored aggregate. Repeating the same reversal/amount is idempotent; reusing its identity with another amount fails. Partial reversals are supported by the receipt reversal map.

Future backend settlement must atomically persist the changed receipt/qualifying total alongside approved wallet reversal rules. It must not invent reversal amounts from wallet balances or unrelated purchases. A reduced aggregate can lower derived Level when thresholds are configured. Claimed milestone identities remain recorded so regaining the Level cannot grant them again. Provider reversal verification, wallet deficit policy and reward clawback policy are not implemented here.

## 18. Tests added and updated

New domain tests cover 11 Levels, missing/invalid policy, all exact/below/above threshold boundaries, capped Level 10, corrupt totals, irrelevant balances/fields, pure purchase identity/idempotency and bounded partial refund idempotency. Transaction tests cover configured eligibility, concurrent one-time claims, replay after higher Level/refund, entitlement grants independent of Level, role/UID restrictions and public visibility/blocking.

Check-in tests cover first day, consecutive progression, UTC boundaries, Day 7 wrap, one/multiple missed days, same-day duplicates, fake client dates, pending versus approved roles and obsolete Gift configuration rejection. UI tests render real screens/navigation for Level pages/default selection, Profile eligibility, Recharge navigation, no fake progress, configured user-triggered milestone claims, full-profile badges and prohibited placements. Service tests verify safe callable payloads.

Existing check-in tests intentionally changed from the old missed-day-preserves-progress policy to consecutive-day behavior. Old Gift-validity expectations were changed to Gift rejection, and fallback totals reflect removal of invalid components. No regression assertion was relaxed to permit a security or call failure.

## 19. Exact test totals/results

| Validation | Final result |
| --- | --- |
| `node node_modules/jest/bin/jest.js --runInBand --roots src functions/src` | 40 suites, 394 tests passed; 0 snapshots; 23.096 seconds |
| `npm test --prefix functions` | 7 suites, 194 tests passed; 0 snapshots; 11.334 seconds |
| Babel parsing of application/shared/Functions JS/CJS | 189 files parsed successfully |
| `git diff --check` | Passed |

The standalone Functions run overlaps the full Jest run; do not add these totals as unique tests. Baseline full suite was 35 suites/338 tests; this batch adds 5 suites/56 tests. Cold React Native transforms initially exceeded a default UI timeout; the new UI suite uses the existing project's 30-second convention. Callable wrappers were made asynchronous consistently to preserve expected rejection semantics; final runs passed.

## 20. Emulator validation

All operations used localhost Firestore on port 8289 and isolated `demo-*` projects. No production connections occurred.

- `node src/services/__tests__/levelRewards.emulator.cjs`: 53 checks passed. Real transactions prove concurrent milestone/check-in idempotency, exactly one claim/message ledger grant, unchanged wallet/qualifying accounting during rewards, configured/unconfigured behavior, public badge privacy/blocking, UTC reset/wrap, role eligibility, and direct-write denial. Ordinary profile edits remain allowed.
- `node src/services/__tests__/creatorRoleRules.emulator.cjs`: 40 checks passed.
- `node functions/src/__tests__/callRecovery.emulator.cjs`: 9 real transaction race assertions passed.
- Existing social messaging emulator: 69 backend integration/security checks passed.
- Existing rewards rules emulator: 32 security checks passed.
- Existing follow rules emulator: passed; the script does not print a numeric total.

The existing social/rewards/follow scripts hardcode port 8189 and static demo IDs. They were run through an in-memory Node Module wrapper replacing 8189 with 8289 and suffixing demo project IDs with a unique timestamp. Their source logic/assertions were preserved. The task-owned emulator was stopped after validation.

## 21. Existing regressions

Full Jest and emulator runs passed Creator role integrity, Consumer Rewards, message entitlements, social/follow, call eligibility, accounting and authoritative recovery. Recovery's settlement/end/reconcile/reconnect/duplicate-end races passed against real transactions. Approval/earnings protections passed the 40-check role suite. Follow tests covered both directions, ownership/schema denials, blocking, recipient queries, counts and unfollow. No remaining unrelated failure was observed in these final runs.

## 22. Migrations and backfills

No mandatory migration or Level backfill is required. Missing Level accounts safely resolve to zero. Do not derive qualifying totals from wallets, client history or demo balances. Future verified purchases can create accounts through trusted settlement.

Existing check-in records are interpreted at the next claim using stored UTC dates. A missed day resets immediately; legacy records without a stored reward day use the old count only when the dates prove consecutive eligibility. Invalid/future dates reset safely. Existing valid entitlements are preserved. Optional archival of dormant Gift data/configuration must not convert it into money, Credits or new entitlements.

## 23. Future physical validation checklist

Physical device validation remains pending. Do not deploy, activate billing/Storage, or change production records merely to perform it. Use authorized local development/emulator fixtures where practical; configured threshold/reward fixtures must remain isolated tests and never represent successful real purchases.

1. On Consumer and pending-applicant sessions, open Profile → My Level and Rewards; verify existing destinations remain available. On an approved Host, verify both Consumer destinations are absent and direct claims fail.
2. Swipe all 11 Level pages. With no policy, confirm Level 0 is initially selected, future pages locked, benefits prepared, no numeric progress/percent/remaining purchase amount and no claim action.
3. Change a development wallet balance and spend Credits; refresh My Level and verify no Level change. Verify reward entitlements and inactivity similarly do not supply progression.
4. Tap Recharge and verify only the existing destination opens, without a fabricated purchase success.
5. On an approved Host device, open a real Consumer full profile and verify an authoritative Level 0 badge; verify no badge on small Connect cards or conversation headers. Verify failed/blocked requests show no invented result. Incoming-call display remains deferred.
6. With server-side isolated UTC clock fixtures, verify consecutive days 1–7, next-day wrap, a missed day resetting to 1, UTC midnight eligibility and same-day concurrent repeats granting once. Changing a client clock must not advance entitlement.
7. Verify Day 4 records a check-in without an economic reward and Day 7 retains only the valid bundle. Check every Rewards balance/label for absence of Promotional Gifts.
8. In an isolated configured milestone fixture, verify below-threshold denial, explicit one-time claim, repeat/higher-Level/refund/regain replay denial and exact ledger/balance deltas. Verify no automatic Level popup or extra session engagement popup.
9. Verify pure refund fixtures lower only the associated qualifying total and can lower derived Level; do not present this as a real provider refund integration.
10. Recheck messaging/free-video consumption and established call/recovery behavior using existing authorized development setup. Do not enable paid services or automatically continue a free call into paid time for this checklist.

## 24. Remaining limitations and explicit answers

There is no real verified purchase flow or approved production policy; all ordinary Consumers remain Level 0. The current wallet does not safely distinguish purchased versus bonus balances, so Bonus Credit milestone support is deferred and all current balances are ignored for Level. Free-video activation and Quick Match lifecycle retain their pre-existing restrictions. Incoming-call badges and physical/native-device validation are pending.

Snapshots refresh on focus and after a claim rather than subscribing to future purchase/refund events. A full-profile badge may become stale until refresh; displayed values never become accounting authority. Future provider integrations must enforce server verification, safe receipt document identities, atomic persistence, reversal policy and trusted config governance. The pure helpers are not that security boundary. Invalid unsupported trusted milestone configuration fails instead of granting silently. No refund clawback policy for already granted rewards is supplied.

| Required question | Answer |
| --- | --- |
| Can any current wallet balance increase Amira Level? | No. |
| Can Bonus Credits increase Amira Level? | No. |
| Can spending Credits reduce Amira Level? | No. |
| Can inactivity reduce Amira Level? | No; there is no inactivity expiry. |
| Can a verified future refund reduce Amira Level? | Yes, by reversing the associated qualifying amount under future trusted settlement, when thresholds are configured. |
| Can a client directly write their Level? | No. |
| Can a Host claim Consumer Level rewards? | No. |
| Are Promotional Gifts remaining in active Consumer Rewards? | No. Dormant persisted legacy data is ignored. |
| Were production Level thresholds invented? | No. |
| Was payment functionality implemented? | No; only pure future integration contracts were prepared. |

## 25. Git status

All batch changes remain unstaged/uncommitted on `amira-v2`. No push or deployment was performed. Exact final short status is captured in [consumer-rewards-level-git-status.txt](consumer-rewards-level-git-status.txt), including new report artifacts. The content-identical call-recovery emulator status flag described in section 2 is retained transparently; call-recovery source architecture was not changed. No unrelated feature was added.
