export const PRESENCE_FRESHNESS_MS = 3 * 60 * 1000;
export const PROFILE_VIEW_COOLDOWN_MS = 30 * 60 * 1000;

export const getDirectConversationId = (firstUid, secondUid) => {
  const ids = [String(firstUid || ''), String(secondUid || '')].filter(Boolean).sort();
  if (ids.length !== 2 || ids[0] === ids[1]) throw new Error('Two different users are required.');
  return ids.join('__');
};
export const isConversationUnreplied = (conversation, currentUid) => Boolean(conversation?.lastMessage?.senderId && conversation.lastMessage.senderId !== currentUid);
export const toDate = (value) => value?.toDate?.() || (value ? new Date(value) : null);
export const isPresenceFresh = (presence, now = new Date()) => {
  const lastSeen = toDate(presence?.lastSeenAt);
  return Boolean(presence?.state === 'online' && lastSeen && !Number.isNaN(lastSeen.getTime()) && now - lastSeen >= 0 && now - lastSeen <= PRESENCE_FRESHNESS_MS);
};
export const shouldCountProfileView = ({ ownerUid, viewerUid, lastViewedAt, now = new Date() }) => {
  if (!ownerUid || !viewerUid || ownerUid === viewerUid) return false;
  const previous = toDate(lastViewedAt);
  return !previous || Number.isNaN(previous.getTime()) || now - previous >= PROFILE_VIEW_COOLDOWN_MS;
};
export const isMessagingBlocked = ({ blockedByMe = false, blockedMe = false } = {}) => blockedByMe || blockedMe;

export const groupCallContacts = (records, currentUid, onlineByUid = {}) => {
  const contacts = new Map();
  records.forEach((record) => {
    const otherUid = record.callerId === currentUid ? record.receiverId : record.callerId;
    if (!otherUid) return;
    const createdAt = toDate(record.createdAt || record.startedAt)?.getTime() || 0;
    const existing = contacts.get(otherUid);
    if (!existing || createdAt > existing.lastCallAt) contacts.set(otherUid, { uid: otherUid, lastCallAt: createdAt, lastCall: record, isOnline: Boolean(onlineByUid[otherUid]) });
  });
  return [...contacts.values()].sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || b.lastCallAt - a.lastCallAt);
};
