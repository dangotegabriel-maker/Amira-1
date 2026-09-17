# Amira: Authoritative Call Recovery + Connected-Time Accounting

Implemented locally on `amira-v2`. No deployment, commit, push, Paystack changes, pricing changes, or physical-validation claim. Existing dirty work was preserved.

## Changes and files

Reported RTC disconnect checkpoints a backend connection segment and pauses eligible free/paid usage. Both participants must provide fresh evidence in the recovery epoch to reopen the same call. Sequence numbers and epochs reject stale/duplicate events. Backend timestamps determine usage; clients submit no durations. Reconnect grace is 10 seconds. Existing Continue Paid consent and 10-second increments remain.

Exact implementation/test files changed by this batch (some already had unrelated changes):

- `firestore.rules`
- `firestore.indexes.json` (added users role/availability composite only; existing changes preserved)
- `functions/src/index.js`
- `functions/src/callDomain.js`
- `functions/src/callPaymentLifecycle.js`
- `functions/src/callRecovery.js` (new)
- `functions/src/connectionAccounting.js` (new)
- `functions/src/callRecoveryConfig.js` (new)
- `functions/src/__tests__/callPaymentLifecycle.test.js`
- `functions/src/__tests__/callRecovery.emulator.cjs` (new)
- `shared/callRecoveryConfig.js` (new; client re-export of packaged Functions configuration)
- `src/config/callConfig.js`
- `src/screens/main/VideoCallScreen.js`
- `src/services/callService.js`
- `src/services/rtcService.js`
- `src/services/callUiState.js`
- `src/services/__tests__/callPaymentService.test.js`
- `src/services/__tests__/callUiState.test.js`
- `src/services/__tests__/callRecoveryRules.emulator.cjs` (new)

Report artifacts: this file and `docs/call-recovery-git-status.txt`.

## Firestore model and Functions

New calls use `accountingVersion: 2`, `lifecycleRevision`, `connectingDeadlineMs`, and `accountedConnectedMs`. Their `connection` map stores state, epoch, participant sequence/state/server last-seen timestamps, segmentStartedAtMs, connectedMs/freeMs/paidMs, leaseUntilMs and reconnectDeadlineMs. Totals checkpoint connected segments; disconnected gaps never enter recorded segments. `expiresAtMs` follows the current recovery deadline; matching locks carry the same expiry. Free consumption remains in existing backend reward balances and allowance fields. Deterministic existing credit ledger and history IDs remain.

Added authenticated callable `reportVideoCallConnection({callId,state,sequence,epoch})`. Participation, status, transitions, sequences, epochs and payload keys are checked. Existing public Functions are retained. Start recovers stale participants' locks before atomic acquisition. Accept bounds connecting to 45 seconds. Initial connection requires both recent acknowledgements. Sync/confirm/settle/end use the shared transactional v2 lifecycle. Ending settles outstanding funded complete increments, preserves previously settled increments, writes one history document, releases only owned locks and restores pre-call Online/Offline availability. Decline and legacy end also preserve replacement locks. Calls without connected duration terminate as failed/missed rather than completed 0:00 calls.

`reconcileExpiredVideoCalls` runs each minute. It handles requesting/ringing expiry, connecting timeout, reconnect timeout, connected free/paid/payment-decision lease expiry and payment-decision expiry. It pages all locks (including old locks without expiry), validates referenced calls transactionally, and pages Busy hosts to restore orphan availability. Healthy calls remain active. New starts can trigger recovery immediately, without waiting for the schedule. Connecting timeout is 45 seconds; participant heartbeat interval is 3 seconds; bilateral lease is 12 seconds; reconnect grace is 10 seconds. Legacy connected sessions use conservative stale-presence retirement (120 seconds) rather than inventing segment history.

## Rules and indexes

Ordinary owner profile updates must preserve `hostProfile.videoRateCredits` and `rateTier`, including nested replacement/removal. New ordinary profiles can only initialize existing default 25/ENTRY values. Trusted admin/backend updates remain possible. Consumers cannot choose another host's rate. Backend snapshots the protected host rate at creation and keeps that snapshot after subsequent trusted rate changes. Direct client writes to call accounting, locks, credit transactions, host earnings and platform revenue remain denied.

Existing calls status/expiry index is reused. Added users `role ASC, hostStatus.availability ASC` index for Busy recovery pagination. No user privacy restructure.

## Tests and exact results

- `node node_modules/jest/bin/jest.js --runInBand --roots src functions/src`: **31 suites, 290 tests passed**, 0 snapshots, 18.234 seconds.
- After the final immediate local media-pause edit: `node node_modules/jest/bin/jest.js --runInBand src/screens/main/__tests__/callPaymentUi.test.js src/services/__tests__/callUiState.test.js`: **2 suites, 26 tests passed**, 7.385 seconds.
- `node src/services/__tests__/callRecoveryRules.emulator.cjs`: **24 security checks passed**, isolated demo namespace, localhost 8289. Permission-denied logs are expected assertions.
- `node functions/src/__tests__/callRecovery.emulator.cjs`: **9 assertions passed** using real Firestore concurrent transactions for settlement/end/reconciliation/reconnect/duplicate end. Two increments, one history record, correct wallet, released locks, restored availability.
- Babel parser through PowerShell stdin: **170 JavaScript files parsed** (src, functions/src, shared). Final media-pause expression also compiled in UI tests.
- `git diff --check`: **passed**; Git printed the preexisting App.js LF/CRLF warning.

Node inside the Windows sandbox initially failed with EPERM resolving the user directory. Test commands were rerun outside the sandbox. A redundant emulator start failed because the task's emulator was already listening; tests used that existing task-owned server successfully. The verified port-8289 task emulator was stopped afterward.

Added/updated tests cover zero ringing/connecting consumption, free disconnect freeze and same allowance after reconnect, failed reconnect usage, paid partial increments across segments, duplicate and concurrent settlement/end/reconcile, one-participant crash, connecting abandonment, valid/stale/orphan/replacement locks and Busy recovery, shared grace, unauthorized/arbitrary timing events, trusted rate snapshots, direct rate protection and client event payload/countdown behavior. Existing healthy fixtures now send heartbeats when advancing simulated time; old abandonment expectations now use lease-limited accounting instead of scheduler-delay wall time.

## Migration, compatibility and remaining risks

No mandatory bulk schema backfill: v2 fields are created for new calls; existing sessions retain a legacy path. Before deploying, review existing protected host rates through a trusted admin source: rules prevent future owner edits but cannot prove historical values were never tampered with. Do not silently reset approved development rates.

Deploy updated Functions, rules/indexes and native client together, with active calls drained and indexes ready. Older clients cannot renew a v2 connection lease and would time out new calls. Existing Agora token/channel/UID architecture remains, but the new callback/heartbeat behavior requires physical verification. Continue Paid and foreground/background call policy remain.

Connection evidence is authenticated participant SDK reporting, not independently verified Agora provider telemetry. Reported disconnections stop recorded usage immediately at the server event. An abrupt loss that prevents reporting is detected by the bounded lease; SDK detection latency, network latency and already checkpointed/settled usage cannot be retroactively proven or reversed. This batch does not establish zero physical-world overcount for an unreported crash. The crash cutoff discards an unconfirmed tail where possible, preserving already consumed/settled counters. Coordinated physical testing is required before deployment.

Heartbeats increase callable/Firestore traffic (each participant every 3 seconds). A slow/broken backend connection may conservatively end an otherwise working RTC call after the lease. Scheduler release is typically within one minute after expiry, not a guaranteed exact execution time; attempting the next call triggers immediate stale recovery. The scheduled scan pages all active locks/Busy hosts and will need scale/cost review as usage grows. No native build or two-phone test was performed here.

## Beginner two-phone validation checklist

Use a development build on Phone A (Consumer) and Phone B (approved Host). Have the developer prepare accounts with known free time/credits and trusted rates. Do not test recharge or change reward/pricing configuration through the app. Install/deploy this batch to the test environment only when separately authorized. Record balances and history before each scenario. Keep both apps on the call screen where possible; the existing background policy can itself end a call.

1. **Normal call:** Set B Online. A calls B; B accepts. Confirm both see/hear each other. Stay connected briefly, then end from either phone. Check one history entry, matching duration and B Online again.
2. **Brief interruption:** Start a call with free time remaining. Use the phone's quick settings to disable Wi-Fi/mobile data on one phone for about 4 seconds, then restore it. Confirm reconnecting, muted/paused media, the same call returning, and no fresh free allowance. If opening settings backgrounds and ends the app, repeat using quick settings that keep it active.
3. **Long interruption:** Repeat, leaving data off for at least 12 seconds. Restore data. Confirm the original call ends; it must not revive. Check one history entry and no charge/free consumption for the recorded reconnect gap.
4. **Kill Consumer:** Start another call, then force-stop/swipe away A's app. On B, observe automatic end/recovery. Wait roughly 1 minute after the lease if necessary, reopen A, and check history/balances.
5. **Kill Host:** Repeat killing B instead. Reopen B; check availability recovers from Busy to its prior Online state. An ordinary background transition may end immediately under the existing policy; that is also valid, but does not replace testing an abrupt crash.
6. **Next call:** After each failed reconnect/kill, attempt a fresh A-to-B call. Confirm no permanent already-in-call/Busy block. The next attempt should recover genuinely stale state; a healthy existing call must still block a second call.
7. **Free balance:** Record remaining free seconds before each interruption. Compare only connected time before/after it, allowing display rounding and event latency. Reconnect must continue the old balance. The 4-second network gap must not become a new allowance or a recorded disconnected segment charge. Capture any discrepancy for developer investigation.
8. **Paid balance:** Use the existing Continue Paid button. Record credits/rate; connect for about 7 seconds, interrupt about 4 seconds, reconnect, then connect another 3 seconds and end. Verify one completed 10-second connected increment, no increment caused by the interruption, and no duplicate charge when reopening/ending again. Compare backend connected segments to stopwatch timing; flag unreported-loss latency discrepancies.
9. **History:** For every scenario, compare both phones: one record for the same call, no duplicates after reopening or late end, and no completed 0:00 record for a never-connected attempt. Existing declined/missed records remain allowed.
10. **Availability:** Verify B returns Online if it started Online. Confirm A can call B afterward; switching B Offline should still prevent new incoming calls. No third phone is needed.

Physical validation remains pending. Preserve the known working baseline until these checks pass.

## Git status

Full final short status is saved in `docs/call-recovery-git-status.txt`. The workspace was already dirty; unrelated tracked modifications/untracked files in that snapshot are not all from this batch. No files were staged, committed, pushed, or deployed.
