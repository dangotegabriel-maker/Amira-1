'use strict';

// CONFIGURABLE DEVELOPMENT DEFAULTS, NOT APPROVED BUSINESS VALUES.
// Trusted economyConfig/current overrides these without client price authority.
const DEVELOPMENT_ECONOMY = Object.freeze({
  version: 'development-v1', platformCommissionBasisPoints: 2000,
  enableEarnedVideoSeconds: false, enableLegacyDailyPreview: true,
});
const DEVELOPMENT_REWARD_SCHEDULE = Object.freeze([
  { freeMessages: 3 }, { freeVideoSeconds: 10 }, { freeMessages: 5 },
  { promotionalGifts: { generic: 1 } }, { freeVideoSeconds: 15 },
  { quickMatchCount: 1 },
  { freeMessages: 3, freeVideoSeconds: 10, promotionalGifts: { generic: 1 } },
]);
const nonnegativeInteger = (value) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid economy amount.');
  return value;
};
const normalizeRewards = (value = {}) => ({
  freeMessages: nonnegativeInteger(value.freeMessages ?? 0),
  freeVideoSeconds: nonnegativeInteger(value.freeVideoSeconds ?? 0),
  quickMatchCount: nonnegativeInteger(value.quickMatchCount ?? 0),
  promotionalGifts: { generic: nonnegativeInteger(value.promotionalGifts?.generic ?? 0) },
});
const addRewards = (balance, award) => {
  const a = normalizeRewards(balance), b = normalizeRewards(award);
  return normalizeRewards({ freeMessages: a.freeMessages + b.freeMessages,
    freeVideoSeconds: a.freeVideoSeconds + b.freeVideoSeconds,
    quickMatchCount: a.quickMatchCount + b.quickMatchCount,
    promotionalGifts: { generic: a.promotionalGifts.generic + b.promotionalGifts.generic } });
};
const economyPolicy = (config = {}) => {
  const policy = { ...DEVELOPMENT_ECONOMY, ...config };
  nonnegativeInteger(policy.platformCommissionBasisPoints);
  if (policy.platformCommissionBasisPoints > 10000 || typeof policy.version !== 'string' || !policy.version
      || typeof policy.enableEarnedVideoSeconds !== 'boolean' || typeof policy.enableLegacyDailyPreview !== 'boolean') {
    throw new Error('Invalid trusted economy configuration.');
  }
  const schedule = config.dailyCheckInSchedule ?? DEVELOPMENT_REWARD_SCHEDULE;
  if (!Array.isArray(schedule) || schedule.length !== 7) throw new Error('Daily Check-In requires seven configured rewards.');
  return { ...policy, dailyCheckInSchedule: schedule.map(normalizeRewards),
    developmentRewardDefaults: config.dailyCheckInSchedule === undefined };
};

const buildInteractionAllocation = ({ grossCreditsSpent, transactionType, consumerUid, hostUid,
  sourceId, createdAt, idempotencyKey, policy = economyPolicy() }) => {
  nonnegativeInteger(grossCreditsSpent);
  if (!['video_call_increment', 'paid_gift', 'promotional_gift'].includes(transactionType)) throw new Error('Invalid transaction type.');
  if (!consumerUid || !hostUid || consumerUid === hostUid || !sourceId || !idempotencyKey) throw new Error('Invalid allocation identity.');
  if (transactionType === 'promotional_gift' && grossCreditsSpent !== 0) throw new Error('Promotional gifts cannot create cash-equivalent earnings.');
  const { platformCommissionBasisPoints, version } = economyPolicy(policy);
  // Integer arithmetic: floor the platform fee; the host receives the remainder.
  // BigInt avoids floating-point drift. These are accounting equivalents, not payout currency.
  const platformFeeCredits = Number(BigInt(grossCreditsSpent) * BigInt(platformCommissionBasisPoints) / 10000n);
  return { grossCreditsSpent, platformFeeCredits,
    hostShareCreditsEquivalent: grossCreditsSpent - platformFeeCredits,
    transactionType, consumerUid, hostUid, sourceId, createdAt, idempotencyKey,
    commissionPolicyVersion: version, platformCommissionBasisPoints,
    accountingUnit: 'credits_equivalent', payoutEligible: false };
};

module.exports = { DEVELOPMENT_ECONOMY, DEVELOPMENT_REWARD_SCHEDULE, nonnegativeInteger,
  normalizeRewards, addRewards, economyPolicy, buildInteractionAllocation };
