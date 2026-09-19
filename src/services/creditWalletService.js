import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseService';

const functions = getFunctions(app, 'us-central1');
const invoke = async (name, data = {}) => (await httpsCallable(functions, name)(data)).data;

export const creditWalletService = Object.freeze({
  getWallet: () => invoke('getCreditWallet'),
  listHistory: () => invoke('listCreditHistory'),
  initializeRecharge: (packageId) => invoke('initializeCreditRecharge', { packageId }),
  verifyRecharge: (reference) => invoke('verifyCreditRecharge', { reference }),
});
