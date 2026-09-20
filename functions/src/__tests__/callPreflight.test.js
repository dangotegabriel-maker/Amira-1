const { callPreflight } = require('../callPreflight');
const base = { caller: { wallet: { creditBalance: 0 } }, rate: 25, dailyEligible: false };
test('daily preview starts with zero Credits', () => expect(callPreflight({ ...base, dailyEligible: true }).allowed).toBe(true));
test('first distributed 10-second increment is four Credits and not the full minute', () => {
  expect(callPreflight({ ...base, caller: { wallet: { creditBalance: 4 } } })).toMatchObject({ allowed: true, minimumCredits: 4 });
  expect(callPreflight({ ...base, caller: { wallet: { creditBalance: 3 } } }).allowed).toBe(false);
});
test('earned video remains disabled by default', () => expect(callPreflight({ ...base, rewards: { freeVideoSeconds: 100 } }).allowed).toBe(false));
test('explicit trusted activation can authorize earned seconds', () => expect(callPreflight({ ...base, rewards: { freeVideoSeconds: 100 }, config: { enableEarnedVideoSeconds: true } }).allowed).toBe(true));
