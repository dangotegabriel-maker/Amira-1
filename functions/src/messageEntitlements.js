'use strict';
const { createHash } = require('node:crypto');
const { nonnegativeInteger } = require('./economyDomain');

// Development policy only. Overrides must come from economyConfig/current.
const MESSAGE_DEFAULTS = Object.freeze({ version: 'chat-passes-development-v2', friendshipMessages: 5, signupMessages: 5, enableSignupMessages: false });
const GRANT_SOURCES = new Set(['signup', 'daily_check_in', 'task_reward', 'friendship', 'credit_purchase_bonus', 'vip', 'promotion', 'admin_adjustment']);
const eventId = (...parts) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const approvedHost = (user) => user?.role === 'host' && user.hostStatus?.isApproved === true;
const messagePolicy = (config = {}) => ({ ...MESSAGE_DEFAULTS,
  version: config.messagePolicyVersion || MESSAGE_DEFAULTS.version,
  friendshipMessages: nonnegativeInteger(config.friendshipMessages ?? MESSAGE_DEFAULTS.friendshipMessages),
  signupMessages: nonnegativeInteger(config.signupMessages ?? MESSAGE_DEFAULTS.signupMessages),
  enableSignupMessages: config.enableSignupMessages === true,
  // No tier has unlimited messaging by default. Only trusted config can enable it.
  unlimitedVipTiers: (config.unlimitedMessagingVipTiers || []).filter((tier) => ['VIP_1', 'VIP_2', 'VIP_3'].includes(tier)),
});
const millis = (value) => value?.toMillis?.() ?? (value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value) || 0);
const activeVip = (user, now = Date.now()) => user?.vip?.status === 'active'
  && (!user.vip.expiresAt || millis(user.vip.expiresAt) > now);
// Legacy freeMessages now stores Chat Passes, never a per-text quota.
const CHAT_WINDOW_MS = 24 * 60 * 60 * 1000;
const chatPassBalance = (rewards = {}) => nonnegativeInteger(rewards.freeMessages ?? 0);
const resolveMessagingEntitlement = (user, rewards = {}, policy = messagePolicy(), { friends = false, window, nowMs = Date.now() } = {}) => {
  if (approvedHost(user)) return { allowed: true, consume: 0, source: 'host' };
  if (user?.role !== 'consumer') return { allowed: false, consume: 0, source: 'ineligible_role' };
  if (friends) return { allowed: true, consume: 0, source: 'friends' };
  if (millis(window?.expiresAt) > nowMs) return { allowed: true, consume: 0, source: 'chat_window' };
  if (activeVip(user) && policy.unlimitedVipTiers.includes(user.vip.tier)) return { allowed: true, consume: 0, source: 'vip' };
  return { allowed: chatPassBalance(rewards) > 0, consume: 1, source: 'chat_window' };
};
const transactionData = ({ uid, delta, balance, source, sourceId, policyVersion, conversationId = null, messageId = null, otherUid = null, windowId = null, createdAt }) => {
  if (delta > 0 && !GRANT_SOURCES.has(source)) throw new Error('Invalid message grant source.');
  return { unit: 'chat_pass', otherUid, windowId, uid, delta, resultingBalance: balance, type: delta < 0 ? 'consume' : 'grant', source, sourceId, conversationId, messageId, policyVersion, createdAt };
};
// Trusted callers prepare all reads before invoking the returned write closure.
const prepareMessageGrant = async ({ tx, db, FieldValue, uid, amount, source, sourceId, policyVersion }) => {
  if (!GRANT_SOURCES.has(source)) throw new Error('Invalid message grant source.');
  amount = nonnegativeInteger(amount);
  const rewardsRef = db.doc(`consumerRewards/${uid}`);
  const ledgerRef = db.doc(`consumerRewards/${uid}/messageTransactions/${eventId(source, sourceId)}`);
  const [profile, rewards, ledger] = await Promise.all([tx.get(db.doc(`users/${uid}`)), tx.get(rewardsRef), tx.get(ledgerRef)]);
  if (profile.data()?.role !== 'consumer' || ledger.exists || !amount) return () => {};
  const balance = nonnegativeInteger((rewards.data()?.freeMessages ?? 0) + amount);
  return () => {
    const createdAt = FieldValue.serverTimestamp();
    tx.set(rewardsRef, { freeMessages: balance, updatedAt: createdAt }, { merge: true });
    tx.create(ledgerRef, transactionData({ uid, delta: amount, balance, source, sourceId, policyVersion, createdAt }));
  };
};
module.exports = { CHAT_WINDOW_MS, chatPassBalance, MESSAGE_DEFAULTS, GRANT_SOURCES, eventId, approvedHost, activeVip, millis, messagePolicy, resolveMessagingEntitlement, transactionData, prepareMessageGrant };
