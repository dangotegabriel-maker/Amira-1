import { BILLING_INCREMENT_SECONDS } from '../config/callConfig';

export const quoteIncrement = (ratePerMinute, seconds = BILLING_INCREMENT_SECONDS) => {
  if (!Number.isInteger(ratePerMinute) || ratePerMinute < 0 || !Number.isInteger(seconds) || seconds < 0) throw new Error('Invalid call rate.');
  return Math.ceil((ratePerMinute * seconds) / 60);
};
export const quotePaidDuration = (ratePerMinute, paidSeconds) => {
  if (!Number.isInteger(paidSeconds) || paidSeconds < 0) throw new Error('Invalid paid duration.');
  if (paidSeconds === 0) return 0;
  return quoteIncrement(ratePerMinute) * Math.ceil(paidSeconds / BILLING_INCREMENT_SECONDS);
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
