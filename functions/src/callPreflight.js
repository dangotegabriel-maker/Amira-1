'use strict';
const { incrementCredits } = require('./callDomain');
const { selectFreeVideoAllowance } = require('./freeVideoEntitlement');

const callPreflight = ({ caller, rate, dailyEligible, rewards, config }) => {
  const allowance = selectFreeVideoAllowance({ dailyEligible, rewards, config });
  const minimumCredits = incrementCredits(rate);
  return { ...allowance, minimumCredits,
    allowed: allowance.freeVideoAllowanceSeconds > 0 || (caller?.wallet?.creditBalance || 0) >= minimumCredits };
};
module.exports = { callPreflight };
