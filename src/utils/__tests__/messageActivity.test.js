import { incomingBanner, totalUnread, unreadBadge, visibleConversations } from '../messageActivity';
const item = { id: 'c__h', participantIds: ['c','h'], unreadCounts: { c: 2, h: 0 }, lastMessage: { type: 'text', senderId: 'h' }, lastMessageAt: { toMillis: () => 200 } };
test('unread sums real counts, clears after read and caps display only', () => {
  expect(totalUnread([item], 'c')).toBe(2);
  expect(totalUnread([{ ...item, unreadCounts: { c: 0 } }], 'c')).toBe(0);
  expect(totalUnread([item], 'h')).toBe(0);
  expect(unreadBadge(0)).toBeUndefined(); expect(unreadBadge(99)).toBe(99); expect(unreadBadge(100)).toBe('99+');
});
test('blocked and invalid conversations are excluded', () => {
  expect(visibleConversations([item], 'c', new Set(['h']))).toEqual([]);
  expect(visibleConversations([{ ...item, participantIds: ['x','h'] }], 'c', new Set())).toEqual([]);
});
test('banner requires new incoming ordinary message outside active chat', () => {
  expect(incomingBanner(item, 'c', 100, null, true)).toBe(true);
  expect(incomingBanner(item, 'c', 200, null, true)).toBe(false);
  expect(incomingBanner(item, 'c', 100, item.id, true)).toBe(false);
  expect(incomingBanner(item, 'c', 100, null, false)).toBe(false);
  expect(incomingBanner({ ...item, lastMessage: { type: 'friendship_created' } }, 'c', 100, null, true)).toBe(false);
  expect(incomingBanner(item, 'h', 100, null, true)).toBe(false);
});
