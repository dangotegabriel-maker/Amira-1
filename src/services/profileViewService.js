import { auth } from './firebaseService';
import { shouldCountProfileView } from '../utils/socialDomain';
const invoke = async (name, data) => require('./socialBackend').invokeSocial(name, data);
const ownViews = async (ownerUid) => {
  if (auth.currentUser?.uid !== ownerUid) throw new Error('Visitor information is private.');
  return invoke('listProfileViews');
};
export const profileViewService = {
  track: async (ownerUid) => {
    if (!shouldCountProfileView({ ownerUid, viewerUid: auth.currentUser?.uid })) return false;
    return (await invoke('trackProfileView', { ownerUid })).counted;
  },
  list: async (ownerUid, max = 100) => (await ownViews(ownerUid)).views.slice(0, max).map((view) => ({
    ...view, id: view.viewerUid,
    lastViewedAt: { toMillis: () => view.lastViewedAtMs, toDate: () => new Date(view.lastViewedAtMs) },
  })),
  countSince: async (ownerUid, since) => (await profileViewService.list(ownerUid)).filter((view) => view.lastViewedAt.toDate() >= since).length,
  getAggregateCount: async (ownerUid) => (await ownViews(ownerUid)).count,
};
