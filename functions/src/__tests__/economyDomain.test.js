const E = require('../economyDomain');
const allocation = (grossCreditsSpent, config = {}, transactionType = 'video_call_increment') => E.buildInteractionAllocation({
  grossCreditsSpent, transactionType, consumerUid: 'consumer', hostUid: 'host', sourceId: 'call',
  createdAt: 123, idempotencyKey: 'call_1', policy: E.economyPolicy(config),
});

test.each([0, 1, 5, 17, 100, 99999, Number.MAX_SAFE_INTEGER])('split reconciles exactly for gross=%s', (gross) => {
  const record = allocation(gross);
  expect(record.platformFeeCredits + record.hostShareCreditsEquivalent).toBe(gross);
  expect(Number.isSafeInteger(record.platformFeeCredits)).toBe(true);
  expect(record.payoutEligible).toBe(false);
});
test('trusted configuration overrides the explicitly development-only commission', () => {
  expect(allocation(100)).toMatchObject({ platformFeeCredits: 20, hostShareCreditsEquivalent: 80, commissionPolicyVersion: 'development-v1' });
  expect(allocation(100, { platformCommissionBasisPoints: 1750, version: 'test-policy' })).toMatchObject({ platformFeeCredits: 17, hostShareCreditsEquivalent: 83, commissionPolicyVersion: 'test-policy' });
});
test.each([-1, 1.5, NaN, Infinity])('invalid gross=%s is rejected', (gross) => expect(() => allocation(gross)).toThrow());
test.each([-1, 10001, 0.5])('invalid commission=%s is rejected', (rate) => expect(() => allocation(5, { platformCommissionBasisPoints: rate })).toThrow());
test('promotional gifts have no host/platform monetary allocation by default', () => {
  expect(allocation(0, {}, 'promotional_gift')).toMatchObject({ transactionType: 'promotional_gift', grossCreditsSpent: 0,
    platformFeeCredits: 0, hostShareCreditsEquivalent: 0, payoutEligible: false });
  expect(() => allocation(1, {}, 'promotional_gift')).toThrow('cannot create cash-equivalent earnings');
  expect(allocation(5, {}, 'paid_gift').transactionType).toBe('paid_gift');
});
test('seven-day schedule has deterministic development rewards and preserves all balances', () => {
  const schedule = E.economyPolicy().dailyCheckInSchedule;
  expect(schedule).toHaveLength(7);
  const total = schedule.reduce(E.addRewards, E.normalizeRewards());
  expect(total).toEqual({ freeMessages: 11, freeVideoSeconds: 35, quickMatchCount: 1, promotionalGifts: { generic: 2 } });
});
test('invalid reward values and overflow fail without awarding anything', () => {
  expect(() => E.normalizeRewards({ freeVideoSeconds: -1 })).toThrow();
  expect(() => E.addRewards({ freeMessages: Number.MAX_SAFE_INTEGER }, { freeMessages: 1 })).toThrow();
  expect(() => E.economyPolicy({ dailyCheckInSchedule: [] })).toThrow();
});
