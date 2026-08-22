export const VIDEO_RATE_BANDS = Object.freeze({
  ENTRY: Object.freeze({ id: 'ENTRY', label: 'Entry', creditsPerMinute: 25 }),
  STANDARD: Object.freeze({ id: 'STANDARD', label: 'Standard', creditsPerMinute: 50 }),
  PREMIUM: Object.freeze({ id: 'PREMIUM', label: 'Premium', creditsPerMinute: 100 }),
});
export const VIDEO_RATE_OPTIONS = Object.values(VIDEO_RATE_BANDS);
export const getVideoRate = (tier = 'STANDARD') => VIDEO_RATE_BANDS[tier] || VIDEO_RATE_BANDS.STANDARD;
