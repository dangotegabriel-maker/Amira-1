export const CREATOR_CARD_STATES = Object.freeze({
  NOT_APPLIED: 'not_applied',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTION_REQUIRED: 'action_required',
});

export const getCreatorCardState = (user, applicationStatus = '') => {
  if (user?.role === 'host' && user?.hostStatus?.isApproved === true) return CREATOR_CARD_STATES.APPROVED;
  const status = applicationStatus || user?.hostStatus?.verificationStatus || '';
  if (['rejected', 'needs_changes', 'action_required'].includes(status)) return CREATOR_CARD_STATES.ACTION_REQUIRED;
  if (['submitted', 'pending', 'under_review'].includes(status)) return CREATOR_CARD_STATES.PENDING;
  if (status === 'in_progress') return CREATOR_CARD_STATES.IN_PROGRESS;
  return CREATOR_CARD_STATES.NOT_APPLIED;
};

export const CREATOR_CARD_COPY = Object.freeze({
  not_applied: { title: 'Earn as a Creator', description: 'Connect with people, build your audience and earn through conversations.', cta: 'Get Started' },
  in_progress: { title: 'Creator Application', description: 'Finish setting up your creator application when you are ready.', cta: 'Continue Application' },
  pending: { title: 'Creator Application', description: 'Your application is waiting for review.', cta: 'Pending Review' },
  approved: { title: 'Creator Dashboard', description: 'Manage your approved creator presence and availability.', cta: 'Open Dashboard' },
  action_required: { title: 'Creator Application', description: 'Your application needs changes before it can be reviewed.', cta: 'Action Required' },
});

export const canContinueWithoutMedia = ({ step, mediaUploadsEnabled, isDev }) => (
  [2, 3, 4].includes(step) && !mediaUploadsEnabled && isDev === true
);

export const getMissingCreatorRequirements = ({ profilePhoto, introVideo, evidence = [], payoutMethod }) => [
  !profilePhoto?.url && 'Photos',
  !introVideo?.url && 'Intro Video',
  evidence.length < 5 && 'Verification',
  !payoutMethod && 'Payout Setup',
].filter(Boolean);
