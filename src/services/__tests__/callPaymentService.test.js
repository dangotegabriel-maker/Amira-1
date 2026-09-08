const mockInvoke = jest.fn();
const mockWalletWrite = jest.fn();
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(), connectFunctionsEmulator: jest.fn(), httpsCallable: jest.fn(() => mockInvoke),
}));
jest.mock('firebase/firestore', () => ({}));
jest.mock('../firebaseService', () => ({
  app: {}, db: {}, auth: { currentUser: { uid: 'consumer' } },
  dbService: { updateWalletBalance: mockWalletWrite, topUpWallet: mockWalletWrite },
}));
const { httpsCallable } = require('firebase/functions');
const { callService } = require('../callService');

beforeEach(() => jest.clearAllMocks());

test('paid consent sends only call identity to the backend and never mutates the client wallet', async () => {
  mockInvoke.mockResolvedValue({ data: { billingMode: 'paid' } });
  await expect(callService.confirmPaid('call-1', { ratePerMinute: 1, balance: 9999 })).resolves.toEqual({ billingMode: 'paid' });
  expect(httpsCallable).toHaveBeenCalledWith(undefined, 'confirmPaidContinuation');
  expect(mockInvoke).toHaveBeenCalledWith({ callId: 'call-1' });
  expect(mockWalletWrite).not.toHaveBeenCalled();
});

test('preview synchronization sends no client timing or billing authority', async () => {
  mockInvoke.mockResolvedValue({ data: { billingMode: 'awaiting_paid_confirmation', serverNowMs: 123 } });
  await callService.syncPaymentState('call-1', { previewEnded: true, duration: 999 });
  expect(mockInvoke).toHaveBeenCalledWith({ callId: 'call-1' });
  expect(mockWalletWrite).not.toHaveBeenCalled();
});

test('insufficient-credit error details survive the callable adapter', async () => {
  const details = { reason: 'insufficient_credits', availableCredits: 4, requiredCredits: 5 };
  mockInvoke.mockRejectedValue({ code: 'functions/resource-exhausted', message: 'Not enough credits to continue.', details });
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await expect(callService.confirmPaid('call-1')).rejects.toMatchObject({ code: 'functions/resource-exhausted', details });
    expect(mockWalletWrite).not.toHaveBeenCalled();
  } finally { warn.mockRestore(); }
});
