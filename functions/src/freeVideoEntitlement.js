'use strict';
const E = require('./economyDomain');
const D = require('./callDomain');

// Compatibility adapter. Earned seconds are opt-in through trusted config;
// the verified daily preview remains the default until RTC recovery is validated.
const selectFreeVideoAllowance = ({ dailyEligible, rewards, config }) => {
  const policy = E.economyPolicy(config);
  if (policy.enableLegacyDailyPreview && dailyEligible) return { freeVideoSource: 'daily_preview', freeVideoAllowanceSeconds: D.PREVIEW_SECONDS };
  const seconds = policy.enableEarnedVideoSeconds ? E.normalizeRewards(rewards).freeVideoSeconds : 0;
  return { freeVideoSource: seconds > 0 ? 'consumer_rewards' : 'none', freeVideoAllowanceSeconds: seconds };
};

// Reads first, returns a write closure so callers can finish all transaction
// reads before debiting. Call lock serializes sessions; the consumed counter
// makes repeated synchronization/end requests debit each second at most once.
const prepareFreeVideoConsumption = async ({ tx, db, FieldValue, callRef, call, nowMs }) => {
  if (call.freeVideoSource !== 'consumer_rewards' || call.status !== 'connected') return () => {};
  const consumed = E.nonnegativeInteger(call.freeVideoConsumedSeconds ?? 0);
  const elapsed = Math.min(E.nonnegativeInteger(call.freeVideoAllowanceSeconds),
    Math.max(0, Math.floor((nowMs - call.connectedAtMs) / 1000)));
  const delta = Math.max(0, elapsed - consumed);
  if (!delta) return () => {};
  const rewardRef = db.doc(`consumerRewards/${call.callerId}`), rewardSnap = await tx.get(rewardRef);
  const balance = E.normalizeRewards(rewardSnap.data());
  if (balance.freeVideoSeconds < delta) throw new Error('Free video entitlement balance is inconsistent.');
  return () => {
    tx.update(rewardRef, { freeVideoSeconds: balance.freeVideoSeconds - delta, updatedAt: FieldValue.serverTimestamp() });
    tx.update(callRef, { freeVideoConsumedSeconds: elapsed });
  };
};
module.exports = { selectFreeVideoAllowance, prepareFreeVideoConsumption };
