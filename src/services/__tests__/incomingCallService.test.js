const mockStop = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: (_db, name) => name,
  query: (...args) => args,
  where: (...args) => args,
  orderBy: (...args) => args,
  limit: count => count,
  onSnapshot: jest.fn(() => mockStop),
}));
jest.mock('firebase/functions', () => ({ getFunctions: jest.fn(), connectFunctionsEmulator: jest.fn() }));
jest.mock('../firebaseService', () => ({ app: {}, auth: {}, db: {} }));
const { onSnapshot } = require('firebase/firestore');
const { callService } = require('../callService');

test('production incoming query retains participant/receiver/ringing constraints and cleanup', () => {
  const next = jest.fn(), error = jest.fn();
  expect(callService.subscribeIncoming('host', next, error)).toBe(mockStop);
  const [query, snapshot, failed] = onSnapshot.mock.calls[0];
  expect(query).toEqual(['calls', ['participantIds', 'array-contains', 'host'], ['receiverId', '==', 'host'], ['status', '==', 'ringing'], ['createdAt', 'desc'], 1]);
  snapshot({ empty: false, docs: [{ id: 'call', data: () => ({ status: 'ringing' }) }] });
  expect(next).toHaveBeenLastCalledWith({ id: 'call', callId: 'call', status: 'ringing' });
  snapshot({ empty: true }); expect(next).toHaveBeenLastCalledWith(null);
  const failure = new Error('permission-denied'); failed(failure); expect(error).toHaveBeenCalledWith(failure);
});
