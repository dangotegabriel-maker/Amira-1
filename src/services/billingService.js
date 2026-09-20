import { BILLING_INCREMENT_SECONDS } from '../config/callConfig';

export const quoteIncrementAt = (ratePerMinute, index = 1) => {
  if (!Number.isSafeInteger(ratePerMinute) || ratePerMinute < 0 || !Number.isSafeInteger(index) || index < 1) throw new Error('Invalid call rate.');
  return Math.floor(ratePerMinute * index / 6) - Math.floor(ratePerMinute * (index - 1) / 6);
};
export const quoteIncrement = (ratePerMinute) => quoteIncrementAt(ratePerMinute, 1);
export const quotePaidDuration = (ratePerMinute, paidSeconds) => {
  if (!Number.isInteger(paidSeconds) || paidSeconds < 0) throw new Error('Invalid paid duration.');
  if (paidSeconds === 0) return 0;
  return Math.floor(ratePerMinute * Math.ceil(paidSeconds / BILLING_INCREMENT_SECONDS) / 6);
};
export const canContinuePaidCall = ({ balance, ratePerMinute }) => Number.isInteger(balance)
  && balance >= quoteIncrement(ratePerMinute);
export const quoteChargeForState = ({ status, ratePerMinute, paidSeconds }) => status === 'connected'
  ? quotePaidDuration(ratePerMinute, paidSeconds) : 0;

const serverRequired = () => { throw new Error('Trusted billing backend required; the client cannot mutate call credits.'); };
export const billingService = Object.freeze({
  quoteCall: (ratePerMinute) => ({ ratePerMinute, incrementSeconds: BILLING_INCREMENT_SECONDS, incrementCredits: quoteIncrement(ratePerMinute) }),
  checkCallEligibility: canContinuePaidCall,
  startPaidSession: serverRequired,
  settleIncrement: serverRequired,
  endSession: serverRequired,
});
