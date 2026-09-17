const { callPreflight } = require('../callPreflight');
const base = { caller: { wallet: { creditBalance: 0 } }, rate: 25, dailyEligible: false };
test('daily preview starts with zero Credits', () => expect(callPreflight({ ...base, dailyEligible: true }).allowed).toBe(true));
test('first rounded 10-second increment is five Credits, not 25', () => {
  expect(callPreflight({ ...base, caller: { wallet: { creditBalance: 5 } } })).toMatchObject({ allowed: true, minimumCredits: 5 });
  expect(callPreflight({ ...base, caller: { wallet: { creditBalance: 4 } } }).allowed).toBe(false);
});
test('earned video remains disabled by default', () => expect(callPreflight({ ...base, rewards: { freeVideoSeconds: 100 } }).allowed).toBe(false));
test('explicit trusted activation can authorize earned seconds', () => expect(callPreflight({ ...base, rewards: { freeVideoSeconds: 100 }, config: { enableEarnedVideoSeconds: true } }).allowed).toBe(true));
