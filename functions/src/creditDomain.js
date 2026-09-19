'use strict';

const VERSION = 1;
const CURRENCY = 'GHS';

const integer = (value, name, { positive = false } = {}) => {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) {
    throw new Error(`${name} must be a ${positive ? 'positive' : 'nonnegative'} safe integer.`);
  }
  return value;
};

const text = (value, name) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
};

const strictObject = (value, keys, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some((key) => !keys.includes(key))) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
};

const packageCatalog = (input = {}) => Object.freeze(Object.fromEntries(Object.entries(input).map(([id, value]) => {
  text(id, 'Package ID');
  strictObject(value, ['credits', 'amountMinor', 'currency', 'label'], 'Package');
  const currency = String(value.currency || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Package currency is invalid.');
  return [id, Object.freeze({ id, credits: integer(value.credits, 'Credits', { positive: true }),
    amountMinor: integer(value.amountMinor, 'Amount', { positive: true }), currency,
    label: typeof value.label === 'string' ? value.label.slice(0, 80) : '' })];
})));

const readWallet = (raw, ownerUid, compatibilityTotal) => {
  text(ownerUid, 'Owner UID');
  const actual = integer(compatibilityTotal, 'Compatibility balance');
  let state;
  if (!raw) state = { ownerUid, purchasedCredits: 0, bonusCredits: 0, legacyCredits: actual,
    unallocatedSpentCredits: 0, totalBalance: actual, accountingVersion: VERSION };
  else {
    if (raw.ownerUid !== ownerUid || raw.accountingVersion !== VERSION) throw new Error('Invalid authoritative wallet.');
    state = { ownerUid, purchasedCredits: integer(raw.purchasedCredits, 'Purchased Credits'),
      bonusCredits: integer(raw.bonusCredits, 'Bonus Credits'), legacyCredits: integer(raw.legacyCredits, 'Legacy Credits'),
      unallocatedSpentCredits: integer(raw.unallocatedSpentCredits, 'Unallocated spending'),
      totalBalance: integer(raw.totalBalance, 'Wallet total'), accountingVersion: VERSION };
    const computed = state.purchasedCredits + state.bonusCredits + state.legacyCredits - state.unallocatedSpentCredits;
    if (!Number.isSafeInteger(computed) || computed < 0 || computed !== state.totalBalance) throw new Error('Authoritative wallet invariant failed.');
    if (actual < state.totalBalance) state.unallocatedSpentCredits += state.totalBalance - actual;
    else if (actual > state.totalBalance) state.legacyCredits += actual - state.totalBalance;
    state.totalBalance = actual;
  }
  const computed = state.purchasedCredits + state.bonusCredits + state.legacyCredits - state.unallocatedSpentCredits;
  if (computed !== actual || state.unallocatedSpentCredits > state.purchasedCredits + state.bonusCredits + state.legacyCredits) {
    throw new Error('Compatibility reconciliation failed.');
  }
  return state;
};

const grant = (wallet, bucket, credits) => {
  integer(credits, 'Credits', { positive: true });
  if (!['purchased', 'bonus'].includes(bucket)) throw new Error('Credit bucket is invalid.');
  const next = { ...wallet };
  next[bucket === 'purchased' ? 'purchasedCredits' : 'bonusCredits'] += credits;
  next.totalBalance += credits;
  return readWallet(next, next.ownerUid, next.totalBalance);
};

// Spendable clawback is intentionally deferred: a genuine reversal removes
// purchase provenance and moves the unchanged spendable amount to legacy.
const reversePurchased = (wallet, credits) => {
  integer(credits, 'Credits', { positive: true });
  if (wallet.purchasedCredits < credits) throw new Error('Purchased Credits cannot be reversed below zero.');
  return readWallet({ ...wallet, purchasedCredits: wallet.purchasedCredits - credits,
    legacyCredits: wallet.legacyCredits + credits }, wallet.ownerUid, wallet.totalBalance);
};

// Generic product spending deliberately records no bucket order. Its inverse
// is exact and may only restore spending previously recorded this way.
const debitUnallocated = (wallet, credits) => {
  integer(credits, 'Credits', { positive: true });
  if (wallet.totalBalance < credits) throw new Error('Insufficient Credits.');
  return readWallet({ ...wallet, unallocatedSpentCredits: wallet.unallocatedSpentCredits + credits,
    totalBalance: wallet.totalBalance - credits }, wallet.ownerUid, wallet.totalBalance - credits);
};
const refundUnallocated = (wallet, credits) => {
  integer(credits, 'Credits', { positive: true });
  if (wallet.unallocatedSpentCredits < credits) throw new Error('Unallocated refund exceeds recorded spending.');
  return readWallet({ ...wallet, unallocatedSpentCredits: wallet.unallocatedSpentCredits - credits,
    totalBalance: wallet.totalBalance + credits }, wallet.ownerUid, wallet.totalBalance + credits);
};
const giftEligiblePurchased = wallet => {
  readWallet(wallet,wallet.ownerUid,wallet.totalBalance);
  // Exact lower bound: unresolved spending U could have consumed at most
  // min(purchasedCredits, U), so this is the guaranteed purchased remainder.
  return Math.max(0,wallet.purchasedCredits-wallet.unallocatedSpentCredits);
};
const debitPurchasedGift = (wallet, credits) => {
  integer(credits,'Credits',{positive:true});
  if(giftEligiblePurchased(wallet)<credits)throw new Error('Insufficient eligible purchased Credits.');
  return readWallet({...wallet,purchasedCredits:wallet.purchasedCredits-credits,totalBalance:wallet.totalBalance-credits},wallet.ownerUid,wallet.totalBalance-credits);
};

const walletProjection = (wallet) => {
  const resolved = wallet.unallocatedSpentCredits === 0;
  return { totalCredits: wallet.totalBalance, currency: CURRENCY, accountingVersion: VERSION,
    compositionResolved: resolved,
    purchasedCredits: resolved ? wallet.purchasedCredits : null,
    bonusCredits: resolved ? wallet.bonusCredits : null,
    legacyCredits: resolved ? wallet.legacyCredits : null,
    giftEligiblePurchasedCredits: giftEligiblePurchased(wallet) };
};

const providerVerification = (result, attempt) => {
  strictObject(result, ['success', 'reference', 'providerTransactionId', 'amountMinor', 'currency'], 'Provider verification');
  if (result.success !== true) throw new Error('Provider did not verify payment success.');
  if (result.reference !== attempt.reference) throw new Error('Provider reference mismatch.');
  text(result.providerTransactionId, 'Provider transaction ID');
  if (integer(result.amountMinor, 'Provider amount', { positive: true }) !== attempt.amountMinor) throw new Error('Provider amount mismatch.');
  if (String(result.currency || '').toUpperCase() !== attempt.currency) throw new Error('Provider currency mismatch.');
  return { providerTransactionId: result.providerTransactionId };
};

const safeLedgerEntry = (id, data = {}) => ({ id, type: data.type, direction: data.direction,
  credits: data.credits, bucket: data.bucket, status: data.status,
  sourceReference: data.sourceReference, originalEntryId: data.originalEntryId || null,
  affectsSpendable: data.affectsSpendable !== false, createdAtMs: data.createdAt?.toMillis?.() || null });

module.exports = { VERSION, CURRENCY, integer, text, strictObject, packageCatalog, readWallet,
  grant, reversePurchased, debitUnallocated, refundUnallocated, giftEligiblePurchased, debitPurchasedGift, walletProjection, providerVerification, safeLedgerEntry };
