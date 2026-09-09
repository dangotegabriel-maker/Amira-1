'use strict';
const E = require('./economyDomain');
const { utcDateKey } = require('./callDomain');

const createConsumerRewards = ({ db, FieldValue, HttpsError }) => {
  const requireConsumer = (profile) => {
    if (profile?.role !== 'consumer') throw new HttpsError('permission-denied', 'Rewards are available to consumer accounts only.');
  };
  const getState = (uid, claim = false) => db.runTransaction(async (tx) => {
    // Recomputed for each transaction attempt; request/device dates are ignored.
    const now = Date.now(), dateKey = utcDateKey(new Date(now));
    const rewardRef = db.doc(`consumerRewards/${uid}`), claimRef = db.doc(`consumerRewards/${uid}/claims/${dateKey}`);
    const [user, rewards, history, config] = await Promise.all([
      tx.get(db.doc(`users/${uid}`)), tx.get(rewardRef), tx.get(claimRef), tx.get(db.doc('economyConfig/current')),
    ]);
    requireConsumer(user.data());
    const policy = E.economyPolicy(config.data());
    const previous = rewards.data() || {}, totalClaims = E.nonnegativeInteger(previous.checkIn?.totalClaims ?? 0);
    const day = totalClaims % 7 + 1;
    const response = { balances: E.normalizeRewards(previous), checkIn: previous.checkIn || { totalClaims: 0, lastClaimDate: null },
      dateKey, serverNowMs: now, nextDay: day, alreadyClaimed: history.exists,
      schedule: policy.dailyCheckInSchedule, developmentDefaults: policy.developmentRewardDefaults,
      earnedVideoEnabled: policy.enableEarnedVideoSeconds, reward: history.data()?.reward ?? null };
    if (!claim || history.exists) return response;
    const reward = policy.dailyCheckInSchedule[day - 1], balances = E.addRewards(previous, reward);
    const checkIn = { totalClaims: E.nonnegativeInteger(totalClaims + 1), lastClaimDate: dateKey, lastRewardDay: day };
    tx.set(rewardRef, { ...balances, checkIn, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.create(claimRef, { consumerUid: uid, dateKey, rewardDay: day, reward, scheduleVersion: policy.version,
      createdAt: FieldValue.serverTimestamp(), idempotencyKey: `daily_check_in:${uid}:${dateKey}` });
    return { ...response, balances, checkIn, reward, alreadyClaimed: false, claimed: true, nextDay: (day % 7) + 1 };
  });
  return { dashboard: (uid) => getState(uid), claim: (uid) => getState(uid, true) };
};
module.exports = { createConsumerRewards };
