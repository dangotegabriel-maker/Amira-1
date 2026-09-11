// Loaded only by operations needing a callable; shares existing emulator setup.
import './callService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseService';
export const invokeSocial = async (name, data = {}) =>
  (await httpsCallable(getFunctions(app, 'us-central1'), name)(data)).data;
