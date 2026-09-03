import { canContinueWithoutMedia, CREATOR_CARD_STATES, getCreatorCardState, getMissingCreatorRequirements } from '../creatorApplication';

describe('creator application recovery', () => {
  test.each([
    [{ role: 'consumer', hostStatus: {} }, '', CREATOR_CARD_STATES.NOT_APPLIED],
    [{ role: 'consumer', hostStatus: {} }, 'in_progress', CREATOR_CARD_STATES.IN_PROGRESS],
    [{ role: 'host', hostStatus: { isApproved: false, verificationStatus: 'pending' } }, '', CREATOR_CARD_STATES.PENDING],
    [{ role: 'host', hostStatus: { isApproved: true } }, '', CREATOR_CARD_STATES.APPROVED],
    [{ role: 'host', hostStatus: { isApproved: false, verificationStatus: 'needs_changes' } }, '', CREATOR_CARD_STATES.ACTION_REQUIRED],
  ])('calculates the creator card state', (user, status, expected) => expect(getCreatorCardState(user, status)).toBe(expected));

  it('allows media steps for development UI testing when Storage is disabled', () => {
    expect(canContinueWithoutMedia({ step: 2, mediaUploadsEnabled: false, isDev: true })).toBe(true);
    expect(canContinueWithoutMedia({ step: 2, mediaUploadsEnabled: false, isDev: false })).toBe(false);
  });

  it('keeps missing media as submission requirements', () => {
    expect(getMissingCreatorRequirements({ evidence: [], payoutMethod: 'Bank Transfer' })).toEqual(['Photos', 'Intro Video', 'Verification']);
  });
});
