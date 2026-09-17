export const unreadBadge = (count) => count > 99 ? '99+' : count > 0 ? count : undefined;
export const visibleConversations = (items, uid, blockedIds) => items.filter((item) =>
  item.participantIds?.length === 2 && item.participantIds.includes(uid)
  && !item.participantIds.some((id) => id !== uid && blockedIds.has(id)));
export const totalUnread = (items, uid) => items.reduce((sum, item) => sum + Math.max(0, Number(item.unreadCounts?.[uid]) || 0), 0);
export const incomingBanner = (item, uid, previousTime, activeConversationId, active) => {
  const message = item.lastMessage;
  const time = item.lastMessageAt?.toMillis?.() || 0;
  return active && item.id !== activeConversationId && message?.type === 'text'
    && message.senderId !== uid && item.participantIds.includes(message.senderId)
    && time > previousTime && (item.unreadCounts?.[uid] || 0) > 0;
};
