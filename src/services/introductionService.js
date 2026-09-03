export const introductionService = {
  warmLeadSignals: Object.freeze(['profile_view', 'follow', 'match', 'message']),
  toWarmLead: (profileView) => ({ uid: profileView.viewerUid, signal: 'profile_view', occurredAt: profileView.lastViewedAt }),
  getAllowance: async () => ({ enabled: false, remaining: 0 }),
  requestIntroduction: async () => { throw new Error('Automated introductions are not enabled.'); },
};
