export const introductionService = {
  getAllowance: async () => ({ enabled: false, remaining: 0 }),
  requestIntroduction: async () => { throw new Error('Host-assisted introductions are not enabled in Batch 2.'); },
};
