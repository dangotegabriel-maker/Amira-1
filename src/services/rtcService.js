import { Camera } from 'expo-camera';
import { DEV_FEATURES } from '../config/devFeatures';

const listeners = new Set();
const emit = (state) => listeners.forEach((listener) => listener(state));
const unavailable = () => { throw new Error('A production RTC provider is not configured.'); };

export const rtcService = Object.freeze({
  provider: DEV_FEATURES.enableCallSimulator ? 'development-simulator' : 'unconfigured',
  initialize: async () => ({ provider: DEV_FEATURES.enableCallSimulator ? 'development-simulator' : 'unconfigured' }),
  requestPermissions: async () => {
    const [camera, microphone] = await Promise.all([Camera.requestCameraPermissionsAsync(), Camera.requestMicrophonePermissionsAsync()]);
    return camera.granted && microphone.granted;
  },
  joinSession: async () => {
    if (!DEV_FEATURES.enableCallSimulator) return unavailable();
    emit('connecting');
    await new Promise((resolve) => setTimeout(resolve, 700));
    emit('connected');
    return { connected: true, simulated: true };
  },
  leaveSession: async () => emit('disconnected'),
  setCameraEnabled: async () => {}, setMicrophoneMuted: async () => {}, switchCamera: async () => {},
  subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
});
