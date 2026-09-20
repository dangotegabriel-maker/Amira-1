'use strict';

const INTRO_SECONDS = 20;
const OFFER_SECONDS = 25;
const REQUEST_SECONDS = 180;
const MAX_CANDIDATES = 3;
const ACTIVE = new Set(['searching', 'offering', 'accepted', 'connecting', 'connected']);
const TERMINAL = new Set(['no_match', 'cancelled', 'connection_failed', 'expired', 'completed']);
const TRANSITIONS = Object.freeze({
  searching: new Set(['offering', 'no_match', 'cancelled', 'expired']),
  offering: new Set(['offering', 'accepted', 'no_match', 'cancelled', 'expired']),
  accepted: new Set(['connecting', 'cancelled', 'connection_failed', 'expired']),
  connecting: new Set(['connected', 'cancelled', 'connection_failed', 'expired']),
  connected: new Set(['completed']),
});
const canTransition = (from, to) => TRANSITIONS[from]?.has(to) === true;
const isActive = (status) => ACTIVE.has(status);
const eligibleConsumer = (profile) => profile?.isDemo !== true && profile?.role === 'consumer'
  && profile?.creatorApplication?.status !== 'approved';
const eligibleHost = (profile, locked = false) => profile?.isDemo !== true && profile?.role === 'host'
  && profile?.hostStatus?.isApproved === true && profile?.hostStatus?.availability === 'online' && !locked;
const normalizeReward = (reward) => ({
  available: Math.max(0, Number.isSafeInteger(reward?.quickMatchCount) ? reward.quickMatchCount : 0),
  reserved: Math.max(0, Number.isSafeInteger(reward?.quickMatchReserved) ? reward.quickMatchReserved : 0),
});
const mayReserve = (reward) => { const value = normalizeReward(reward); return value.available - value.reserved > 0; };
const reserve = (reward) => { const value = normalizeReward(reward); if (!mayReserve(reward)) throw new Error('no-entitlement'); return { quickMatchCount: value.available, quickMatchReserved: value.reserved + 1 }; };
const release = (reward) => { const value = normalizeReward(reward); if (value.reserved < 1) return { quickMatchCount: value.available, quickMatchReserved: 0 }; return { quickMatchCount: value.available, quickMatchReserved: value.reserved - 1 }; };
const consume = (reward) => { const value = normalizeReward(reward); if (value.available < 1 || value.reserved < 1) throw new Error('reservation-missing'); return { quickMatchCount: value.available - 1, quickMatchReserved: value.reserved - 1 }; };
const rankCandidates = (hosts, consumer, excluded = []) => {
  const skip = new Set(excluded);
  const interests = new Set(consumer?.preferences?.interests || consumer?.interests || []);
  return hosts.filter((host) => eligibleHost(host) && !skip.has(host.uid)).map((host) => ({ host, score:
    (host.countryCode && host.countryCode === consumer?.countryCode ? 20 : 0)
    + (host.hostProfile?.interests || []).filter((item) => interests.has(item)).length * 10
    + Math.min(9, Math.max(0, Number(host.hostStatus?.activityScore || 0)))
  })).sort((a, b) => b.score - a.score || a.host.uid.localeCompare(b.host.uid)).slice(0, MAX_CANDIDATES).map(({ host }) => host.uid);
};
const safeConsumerRequest = (request, now) => ({ requestId: request.requestId, status: request.status,
  fundingSource: request.fundingSource, introSeconds: INTRO_SECONDS, callId: request.callId || null,
  expiresAtMs: request.expiresAtMs, serverNowMs: now, host: ['accepted','connecting','connected','completed'].includes(request.status) ? request.acceptedHostIdentity || null : null });
const connectedAllocation=(connectedMs,rewardSeconds=0)=>{const seconds=Math.max(0,Math.floor(Number(connectedMs||0)/1000)),introSeconds=Math.min(INTRO_SECONDS,seconds),freeVideoSeconds=Math.min(Math.max(0,rewardSeconds),Math.max(0,seconds-INTRO_SECONDS));return {introSeconds,freeVideoSeconds,paidEligibleSeconds:Math.max(0,seconds-INTRO_SECONDS-Math.max(0,rewardSeconds))}};
module.exports = { INTRO_SECONDS, OFFER_SECONDS, REQUEST_SECONDS, MAX_CANDIDATES, ACTIVE, TERMINAL,
  canTransition, isActive, eligibleConsumer, eligibleHost, normalizeReward, mayReserve, reserve, release, consume,
  rankCandidates, safeConsumerRequest, connectedAllocation };
