const mockSet = jest.fn(), mockAuth = { currentUser: { uid: 'reporter' } };
jest.mock('../firebaseService', () => ({ auth: mockAuth, db: {} }));
jest.mock('firebase/firestore', () => ({ collection: (_db, path) => path, doc: (_db, ...parts) => parts.length ? parts.join('/') : { id: 'generated-report' }, setDoc: (...args) => mockSet(...args), serverTimestamp: () => 'SERVER_TIME' }));
const { reportService } = require('../reportService');
beforeEach(() => { mockSet.mockReset(); mockAuth.currentUser = { uid: 'reporter' }; });
test('uncertain report retries address the same create-only document and never claim a denied retry succeeded', async () => {
  const request = { requestId: 'stable-report', reportedUserId: 'target', reason: 'Harassment', contextType: 'profile', contextId: 'target' };
  mockSet.mockRejectedValueOnce(new Error('response lost')).mockRejectedValueOnce(new Error('permission-denied'));
  await expect(reportService.submit(request)).rejects.toThrow('response lost');
  await expect(reportService.submit(request)).rejects.toThrow('permission-denied');
  expect(mockSet.mock.calls.map(args => args[0])).toEqual(['reports/stable-report', 'reports/stable-report']);
  expect(mockSet.mock.calls[0][1]).toMatchObject({ reporterId: 'reporter', reportedUserId: 'target', reason: 'harassment', status: 'submitted', createdAt: 'SERVER_TIME' });
});
test('invalid report identity and self reports never write', async () => {
  await expect(reportService.submit({ requestId: '../wrong', reportedUserId: 'target', reason: 'Other' })).rejects.toThrow('Invalid report request');
  await expect(reportService.submit({ requestId: 'valid', reportedUserId: 'reporter', reason: 'Other' })).rejects.toThrow('cannot be submitted');
  expect(mockSet).not.toHaveBeenCalled();
});
