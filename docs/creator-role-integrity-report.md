# Creator Role Integrity + Permanent Host Transition + Host Profile/Earnings

## Executive summary

Implemented locally on `amira-v2`, based on `da07a5d`. Applicants remain Consumers until protected trusted approval; approved accounts permanently receive Host access through normal product behavior. Host Profile hides Consumer-only destinations, Following resolves followed Consumers, and Earnings shows real pending credit-equivalent accounting. No deployment, commit, push, real account changes, Storage/API/billing activation, payment or payout implementation.

## Exact files changed

- `firestore.rules`
- `functions/src/__tests__/callBackend.test.js`
- `functions/src/__tests__/callPaymentLifecycle.test.js`
- `functions/src/__tests__/socialMessaging.test.js`
- `functions/src/callDomain.js`
- `functions/src/callPaymentLifecycle.js`
- `functions/src/callRecovery.js`
- `functions/src/consumerRewards.js`
- `functions/src/index.js`
- `functions/src/messageEntitlements.js`
- `functions/src/socialMessaging.js`
- `src/context/UserContext.js`
- `src/models/__tests__/userModel.test.js`
- `src/models/userModel.js`
- `src/navigation/MainTabNavigator.js`
- `src/navigation/RootNavigator.js`
- `src/screens/host/HostApplicationScreen.js`
- `src/screens/host/HostEarningsScreen.js`
- `src/screens/main/ChatDetailScreen.js`
- `src/screens/main/FollowingScreen.js`
- `src/screens/main/MyProfileScreen.js`
- `src/screens/main/RewardsScreen.js`
- `src/screens/main/__tests__/messageEntitlementUi.test.js`
- `src/screens/main/__tests__/rewardsUi.test.js`
- `src/services/followService.js`
- `src/services/hostApplicationService.js`
- `src/utils/creatorApplication.js`
- `functions/src/accountRole.js`
- `src/navigation/__tests__/accountNavigation.test.js`
- `src/screens/main/__tests__/hostAccountUi.test.js`
- `src/services/__tests__/creatorRoleRules.emulator.cjs`
- `src/services/__tests__/hostApplicationService.test.js`
- `src/services/__tests__/hostEarningsService.test.js`
- `src/services/hostEarningsService.js`

Also added this report and `docs/creator-role-git-status.txt`.

## Role/application before versus after

| State | Before | After |
| --- | --- | --- |
| New ordinary account | Legacy flags could influence normalization | Consumer; rules require Consumer creation with approval false |
| Draft/incomplete | hasApplied could infer Host role | Consumer; resumes draft application |
| Submitted | Submission wrote role host and reset protected pricing | Writes role consumer and pending metadata; never writes approval or pricing |
| Pending/under review | Old host role could block Consumer privileges | Consumer navigation/profile/reward/messaging policy; no Host privileges |
| Approved | Required host role string plus approval | Protected hostStatus.isApproved true determines Host access, including stale Consumer role/fields |
| Legacy verification flags | Could infer approval client-side | Editable is_verified/top-level isApproved cannot confer Host approval; trusted review required |

Submission still requires age 18+, real profile-photo and intro-video URLs, five verification captures and a selected future payout method. Storage-disabled UI testing never fabricates media or submission success. Pending status shows **Application Under Review** with Consumer continuity. Draft and rejected/action-required states remain. Owners cannot reopen/edit submitted, pending or approved applications.

## Trusted approval procedure

No ordinary-user approval callable or Admin Dashboard was added. An authorized Firebase Admin SDK operation remains the approval mechanism after actual manual review. In one transaction:

1. Read the user and owned application before writes; require submitted/pending/under_review. Already approved may be treated as an idempotent no-op.
2. Manually verify identity/age, real media/evidence and existing valid protected development rate. Do not approve missing-media production applications because Storage is disabled, or guess approval from legacy flags.
3. Update user role to host, hostStatus.isApproved true, hasApplied true, verificationStatus approved and initial availability offline, with server updated timestamps.
4. Update application status approved, approvedAt server timestamp and optional trusted reviewer audit metadata. Preserve media, historical Consumer data, wallets, rates and rewards.
5. The profile subscription switches navigation to Host Connect. The owner cannot change approval or switch back through normal client writes/UI.

This was tested only with an isolated emulator fixture. No real approval was performed. Drain active calls before an authorized role transition because navigation reset can unmount an active Consumer call. Manual Admin operations require authorized IAM credentials; no deployment or API activation is needed or attempted by this batch.

## Navigation and Profile

Consumers and all unapproved applicants: **Home | Match | Messages | Profile**.

Approved Hosts: **Connect | Messages | Activity | Profile**, defaulting to Connect. Role-dependent navigation keys remove stale Consumer back routes upon approval. Approved stacks exclude Wallet/Recharge/payment/VIP purchase/Rewards/Who Viewed Me/application editor and legacy Withdrawal/GiftLedger. Host Earnings and Host visitors remain unavailable to applicants. No startup role selector, dual-role toggle or switch-back control.

Profile styling is preserved. Approved Hosts retain Earnings, Following, Creator Connect, account/safety/help and existing general invitation destination. Credits and Rewards remain hidden; Who Viewed Me and Consumer VIP are now also hidden, with corresponding routes gated. The Consumer shortcut view count is no longer fetched for Hosts. Consumers and applicants retain appropriate Consumer items. Application status refreshes on Profile focus.

## Following correction

Following uses existing getFollowingHosts() for Consumers and getFollowingConsumers(hostUid) for approved Hosts. The latter already reads the real Host-to-Consumer relationship schema. No duplicate model or fake Consumer fallback. Host labels/empty state refer to Consumers and omit Host availability on Consumer cards. Unfollow, message destinations, reciprocal friendship, blocking and live follower counts remain. Existing Consumer demo-host behavior is unchanged where enabled. Follow eligibility uses protected approval even for old pending role strings.

## Earnings: data source, units and future preparation

Before: unrelated **users.earnings.available**, labelled **Available balance** and **GHS**.

After: realtime **hostEarnings/{authenticatedUid}.pendingCreditsEquivalent**. The service always selects the signed-in UID and projects only the supported pending amount. No platform allocation data is returned to the UI. Writes remain backend-only; other Hosts and Consumers cannot read private earnings.

Exact wording:

- **Earnings**
- **Pending Earnings**
- **[amount] credit equivalent**
- **Internal accounting only. Cash conversion and withdrawals are not available.**

Loading/error/retry states do not fabricate balances. A missing record means zero recorded pending earnings; a malformed record shows an error. No GHS/conversion/withdrawable cash, commission, Available/Lifetime values, fake source history, withdrawal action or payout promise. A dedicated pending projection allows later supported fields without implementing future Gifts/Referrals/VIP sources now.

## Legacy economy intentionally retained

WithdrawalScreen, GiftLedgerScreen and ledgerService Diamond balances/withdrawDiamonds/local Gift commission are unchanged and disconnected from authoritative earnings. Approved Host route registrations exclude those legacy screens; Earnings has no withdrawal entry point. Existing Consumer registrations remain; broad deletion is deferred. RoleSelectionScreen remains an unused, unregistered legacy file. Recharge, Paystack and unrelated product/economy activation were not implemented.

## Rules, data and Functions

Added dependency-free functions/src/accountRole.js, shared by client normalization and backend policy. Protected canonical approval alone confers Host privileges. Ordinary creation requires role consumer and approval false. Owners cannot grant Host role or change approval in either direction. They can safely repair an explicitly unapproved old Host role to Consumer. Pending user metadata changes require corresponding submitted application state. Application owner writes are limited to applicant fields in draft/rejected/action-required states; pending/approved and trusted review fields cannot be overwritten.

Reward reads/claims and messaging grants use effective Consumer eligibility. Approved Hosts with historical Consumer role cannot claim Consumer rewards. Approved Host initiation and Friends behavior remain. Call edits are limited to role/approval eligibility predicates in start/accept/paid consent. **Connection accounting, grace, leases, settlement IDs/increments and RTC integration are unchanged.** Public Functions retain names/signatures; no new callable/trigger. Existing private earnings rules now use the shared authoritative approval distinction. Accounting/rate protections remain. No indexes, new collections or bulk schema migration. No public/private user split.

## Tests added and intentional updates

Added application-service, earnings-service, actual navigator and Host Profile/Following/Earnings/application-status UI tests. Added pending messaging/reward/call policy tests and trusted-approval/stale-role compatibility tests. Existing call recovery remains covered.

Old normalization tests now correctly expect pending roles to be Consumer and editable legacy flags to require review. Old pending-Host messaging now expects Consumer Chat Pass exhaustion rather than an ineligible-role permission error; free Host initiation is still denied. The message-header Consumer fixture had protected approval true for every target; corrected Consumer approval to false and approved Host approval to true, preserving its expected Consumer-to-Consumer restriction. One intermediate new service assertion omitted merge options in its expected argument array; the assertion was corrected without implementation changes.

## Exact validation results

- Full root/Functions command: `node node_modules/jest/bin/jest.js --runInBand --roots src functions/src`: **35 suites, 338 tests passed**, 0 snapshots; **23.12 seconds**.
- Standalone `npm test --prefix functions`: **5 suites, 152 tests passed**, 0 snapshots; **9.281 seconds**.
- Final targeted navigator/application UI check: **2 suites, 15 tests passed**, **5.129 seconds**.
- Babel parser over src/functions/src/shared: **177 JavaScript files parsed**.
- `git diff --check`: **passed**.

Node required execution outside the Windows sandbox because sandbox path resolution returns EPERM. No dependency installation or native build. Initial emulator SDK resolution failed at app root; the new script now resolves existing Functions dependencies. Final checks pass.

## Emulator validation

Cached Firestore emulator ran on localhost **8289**, using current rules and separate demo namespaces; no production connections. Verified task-owned emulator was stopped afterward.

- `node src/services/__tests__/creatorRoleRules.emulator.cjs`: **40 checks passed**: owner self-approval/Host creation denied, permanent approval protection, safe pending role repair, Consumer rewards, atomic Consumer submission, application immutability, private/backend-only earnings, trusted Admin approval transaction, existing follow schemas and protected rates.
- Existing socialMessaging.emulator.cjs: **69 backend integration/security checks passed**.
- Existing rewardsRules.emulator.cjs: **32 security checks passed**.
- Existing followRules.emulator.cjs: **passed** both directions, denied role/ownership/schema cases, blocking, recipient-only query, live count and unfollow.
- `node functions/src/__tests__/callRecovery.emulator.cjs`: **9 real transaction-race assertions passed** for settle/end/reconcile/reconnect/duplicate end.

Existing 8189 scripts were run without editing their files through an in-memory Node Module wrapper: read source, replace port 8189 with 8289, suffix demo project IDs with unique role-regression timestamps, set module filename/lookup paths to the original file, then compile. This preserves relative imports and isolates fixture reset/write operations. Exact wrapper commands are recorded in the session tool log.

## Migrations and accounts needing manual correction

No bulk rewrite or mandatory earnings backfill. Existing authoritative pending accrual is displayed directly. Do not convert/merge local Diamonds or users.earnings into it.

Bootstrap narrowly repairs role host only when canonical hostStatus.isApproved is explicitly false. Approved flags are never changed. Ambiguous legacy Hosts missing canonical approval have neither role nor hostStatus rewritten by this repair; manual review is required before Host access.

Review these account classes before release:

1. Historical approved Hosts with only legacy verification flags: verify actual approval, then set protected canonical approval and role host through Admin SDK. Never approve all flagged documents blindly.
2. Canonically approved Hosts stored as role consumer/missing: access already resolves Host, but trusted role host correction is needed for existing raw-role discovery/reconciliation queries.
3. Pending accounts stored as role host: Consumer access already works; explicit-false records receive narrow sign-in repair. If unrelated protected legacy migration fields make that update fail, use a trusted role-only correction. Raw-role discovery may omit the account until repaired.
4. Application approved but canonical user approval false: review inconsistency and complete only genuinely authorized approval atomically; application status alone grants no Host privilege.

Preserve wallets, history, relationships and rewards. Never demote a canonically approved Host or manufacture earnings/approval history.

## Two-phone physical validation checklist

**Physical validation remains pending.** Billing is unavailable: do not deploy, activate Storage/APIs or alter billing to run this list. Use authorized existing development/emulator fixtures where possible; otherwise defer device validation. Phone A is a Consumer/applicant; Phone B is an already approved Host. A trusted developer prepares fixtures; normal clients must not self-set approval.

1. Sign in A as an ordinary new account; complete ordinary profile. Verify Home/Match/Messages/Profile, no role chooser or mode switch.
2. Save a text Creator draft; return to Profile and verify Continue Application plus unchanged Consumer tabs/rewards/credits. Missing media must prevent successful submission while Storage is disabled.
3. With a developer-prepared submitted/pending test record, restart A. Verify Consumer tabs and Application Under Review. Application status view must not offer editing/submission while pending.
4. Confirm A cannot open Connect/Activity/Host Earnings/Host availability/rate tools. Without Consumer Chat Pass/Friends eligibility, sending must not gain free Host initiation. Existing real Friends should still message as before.
5. B boots to Connect. Verify real Consumer For You/Following discovery, follow/unfollow, live follower count and Online/Offline controls. No Stories or visitors added to Connect.
6. B Profile shows Earnings and Following but no Credits/Recharge/Rewards/Who Viewed Me/Consumer VIP/switch-back. Following must show real Consumers B follows.
7. A Consumer Following shows approved Hosts A follows. Existing blocking must still prevent forbidden new interactions; full relationship cleanup is not expected here.
8. B Earnings displays Pending Earnings, credit equivalent and withdrawals-unavailable note. Compare with authorized developer inspection of hostEarnings. No GHS, fake history, conversion, cash withdrawal or platform commission.
9. When authorized backend test infrastructure is available, make an ordinary paid A-to-B call with existing Continue Paid. Check pending earnings update after legitimate settlement and preserve the 10-second same-call reconnect/accounting behavior. Do not deploy or activate payments to make this possible now.
10. In an authorized test/emulator fixture, developer approves A atomically after review. Confirm Host Connect/Messages/Activity/Profile replaces Consumer navigation with no Consumer back route/mode choice; historical Consumer records remain stored.
11. Restart/sign out/in the approved fixture; Host experience remains. Earnings always belongs to the signed-in account. Emulator tests, rather than UI alone, establish self-approval/private-record denials.

## Remaining risks

No device/native-build test or deployment. Navigation reset on approval can interrupt an active call: drain calls before manual transitions. Inconsistent raw-role development records need the trusted corrections above. Old deployed rules/clients retain old behavior until a separately authorized coordinated update; deployment is prohibited while billing is unavailable. Historical approval cannot be inferred safely from editable flags. Broad users-document visibility, legacy local economy and unused routes remain deferred. Reviewers must inspect actual media/identity rather than trust application fields.

## Git status

Baseline was clean at da07a5d. Full final short status is saved in docs/creator-role-git-status.txt. All implementation/report changes remain unstaged/uncommitted. No commit, push or deploy.
