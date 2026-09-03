const mockGetDoc = jest.fn();
const mockRunTransaction = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...parts) => parts.join('/')), doc: jest.fn((...parts) => parts.join('/')),
  getDoc: (...args) => mockGetDoc(...args), increment: jest.fn(), limit: jest.fn(), onSnapshot: jest.fn(),
  orderBy: jest.fn(), query: jest.fn(), runTransaction: (...args) => mockRunTransaction(...args), serverTimestamp: jest.fn(), where: jest.fn(),
}));
jest.mock('../firebaseService', () => ({ auth: { currentUser: { uid: 'alice' } }, db: 'db', dbService: { getUserProfile: jest.fn(async uid => ({ uid, username: uid })) } }));
jest.mock('../blockService', () => ({ blockService: { getRelationship: jest.fn(async () => ({ blocked: false })) } }));
import { messagingService } from '../messagingService';

describe('opening direct conversations', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('does not create a conversation before the first message', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await expect(messagingService.prepareConversation('bob')).resolves.toEqual({ conversationId: 'alice__bob', exists: false });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
  it('recognizes an existing deterministic conversation without rewriting it', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    await expect(messagingService.prepareConversation('bob')).resolves.toEqual({ conversationId: 'alice__bob', exists: true });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
  it('treats the protected missing-document read as a new chat', async () => {
    mockGetDoc.mockRejectedValue({ code: 'permission-denied' });
    await expect(messagingService.prepareConversation('bob')).resolves.toEqual({ conversationId: 'alice__bob', exists: false });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});
