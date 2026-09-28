const mockListeners = [];
jest.mock('../firebaseService', () => ({ auth: { currentUser: null }, db: 'db' }));
jest.mock('../publicIdentityService', () => ({ publicIdentityService: {} }));
jest.mock('../blockService', () => ({ blockService: {} }));
jest.mock('firebase/firestore', () => ({
  collection: (_, ...parts) => parts.join('/'),
  orderBy: (field, direction) => ({ kind: 'order', field, direction }),
  limit: count => ({ kind: 'limit', count }),
  query: (path, ...constraints) => ({ path, constraints }),
  onSnapshot: (query, value, error) => {
    const stop = jest.fn();
    mockListeners.push({ query, value, error, stop });
    return stop;
  },
}));

import { auth } from '../firebaseService';
import { messagingService } from '../messagingService';

const message = n => ({ id: `m${String(n).padStart(3, '0')}`, createdAt: n, text: `Message ${n}`, type: 'text' });
// Evaluate the constraints captured from the production service, not a copied
// recent-history helper. Firestore orders document IDs in the same direction
// as the final explicit order for equal timestamps.
const deliver = (listener, records) => {
  const order = listener.query.constraints.find(item => item.kind === 'order');
  const bound = listener.query.constraints.find(item => item.kind === 'limit');
  const docs = [...records].sort((a, b) => {
    const comparison = a[order.field] - b[order.field] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return order.direction === 'desc' ? -comparison : comparison;
  }).slice(0, bound.count).map(record => ({ id: record.id, data: () => record }));
  listener.value({ docs });
};
beforeEach(() => { mockListeners.length = 0; auth.currentUser = { uid: 'a' }; });

test('production query selects newest 250 of 300 and normalizes every chronological boundary', () => {
  const receive = jest.fn();
  messagingService.subscribeMessages('a__b', receive);
  const listener = mockListeners[0];
  expect(listener.query).toEqual({ path: 'conversations/a__b/messages', constraints: [
    { kind: 'order', field: 'createdAt', direction: 'desc' }, { kind: 'limit', count: 250 },
  ] });
  deliver(listener, Array.from({ length: 300 }, (_, i) => message(i + 1)));
  const rows = receive.mock.calls[0][0];
  expect(rows).toEqual(Array.from({ length: 250 }, (_, i) => message(i + 51)));
  expect(rows[0]).toMatchObject({ id: 'm051', createdAt: 51 });
  expect(rows.at(-1)).toMatchObject({ id: 'm300', createdAt: 300 });
});

test('live insert rolls the bounded window forward; replay replaces without duplicates', () => {
  let visible = [];
  messagingService.subscribeMessages('a__b', rows => { visible = rows; });
  const history = Array.from({ length: 300 }, (_, i) => message(i + 1));
  deliver(mockListeners[0], history);
  history.push(message(301));
  deliver(mockListeners[0], history);
  expect(visible).toEqual(Array.from({ length: 250 }, (_, i) => message(i + 52)));
  deliver(mockListeners[0], history);
  expect(visible).toHaveLength(250);
  expect(new Set(visible.map(row => row.id)).size).toBe(250);
  expect(visible.filter(row => row.id === 'm301')).toHaveLength(1);
  expect(visible.at(-1)).toEqual(message(301));
});

test('equal timestamps retain deterministic document-ID boundaries across replay', () => {
  const receive = jest.fn();
  messagingService.subscribeMessages('a__b', receive);
  const history = Array.from({ length: 300 }, (_, i) => ({ ...message(i + 1), createdAt: 1000 }));
  deliver(mockListeners[0], history);
  deliver(mockListeners[0], [...history].reverse());
  expect(receive.mock.calls[0][0]).toEqual(history.slice(50));
  expect(receive.mock.calls[1][0]).toEqual(history.slice(50));
});

test('empty and short histories preserve message types and fields without fabricated rows', () => {
  const receive = jest.fn();
  messagingService.subscribeMessages('a__b', receive);
  deliver(mockListeners[0], []);
  expect(receive).toHaveBeenLastCalledWith([]);
  const rows = [{ ...message(1), type: 'friendship_created', senderId: null }, message(2)];
  deliver(mockListeners[0], rows);
  expect(receive).toHaveBeenLastCalledWith(rows);
});

test('cleanup rejects queued values/errors from an old conversation and stops its listener', () => {
  let visible = [];
  const receive = jest.fn(rows => { visible = rows; }), error = jest.fn();
  const stopOld = messagingService.subscribeMessages('a__b', receive, error);
  deliver(mockListeners[0], [message(1)]);
  stopOld();
  const stopNew = messagingService.subscribeMessages('a__c', receive, error);
  deliver(mockListeners[1], [message(2)]);
  deliver(mockListeners[0], [message(3)]);
  mockListeners[0].error(new Error('late old error'));
  expect(visible).toEqual([message(2)]);
  expect(receive).toHaveBeenCalledTimes(2);
  expect(error).not.toHaveBeenCalled();
  expect(mockListeners[0].stop).toHaveBeenCalledTimes(1);
  stopNew();
  deliver(mockListeners[1], [message(4)]);
  expect(receive).toHaveBeenCalledTimes(2);
  expect(mockListeners[1].stop).toHaveBeenCalledTimes(1);
});

test.each([null, { uid: 'b' }, { uid: 'a' }])('obsolete Auth session suppresses values/errors before cleanup: %p', next => {
  const receive = jest.fn(), error = jest.fn();
  messagingService.subscribeMessages('a__b', receive, error);
  auth.currentUser = next;
  deliver(mockListeners[0], [message(1)]);
  mockListeners[0].error(new Error('obsolete'));
  expect(receive).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});

test('current errors propagate and signed-out subscriptions do not attach', () => {
  const error = jest.fn();
  messagingService.subscribeMessages('a__b', jest.fn(), error);
  const failure = new Error('unavailable');
  mockListeners[0].error(failure);
  expect(error).toHaveBeenCalledWith(failure);
  auth.currentUser = null;
  messagingService.subscribeMessages('a__b', jest.fn())();
  expect(mockListeners).toHaveLength(1);
});
