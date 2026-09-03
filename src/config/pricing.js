export const VIDEO_RATE_BANDS = Object.freeze({
  ENTRY: Object.freeze({ id: 'ENTRY', label: 'Entry', creditsPerMinute: 25 }),
  STANDARD: Object.freeze({ id: 'STANDARD', label: 'Standard', creditsPerMinute: 50 }),
  PREMIUM: Object.freeze({ id: 'PREMIUM', label: 'Premium', creditsPerMinute: 100 }),
});
export const VIDEO_RATE_OPTIONS = Object.values(VIDEO_RATE_BANDS);
export const getVideoRate = (tier = 'STANDARD') => VIDEO_RATE_BANDS[tier] || VIDEO_RATE_BANDS.STANDARD;

export const HOST_TIERS = Object.freeze({
  ENTRY: Object.freeze({ ...VIDEO_RATE_BANDS.ENTRY, initialTier: true, promotionAuthority: 'backend' }),
  STANDARD: Object.freeze({ ...VIDEO_RATE_BANDS.STANDARD, initialTier: false, promotionAuthority: 'backend' }),
  PREMIUM: Object.freeze({ ...VIDEO_RATE_BANDS.PREMIUM, initialTier: false, promotionAuthority: 'backend' }),
});

export const INITIAL_HOST_TIER = HOST_TIERS.ENTRY;
export const HOST_PROMOTION_SIGNALS = Object.freeze([
  'completedPaidCalls', 'validRatingCount', 'averageRating',
  'accountStanding', 'seriousReportRate', 'activityReliability',
]);
