import { AudioModule } from 'expo-audio';

export const soundService = {
  init: () => {
    console.log("Sound initialized");
  },

  preload: async (urls = []) => {
    try {
      console.log("Sound preload requested:", urls.length);
    } catch (error) {
      console.error("Failed to preload sounds:", error);
    }
  },

  play: async (url) => {
    try {
      if (!url) return;
      console.log("Playing sound:", url);
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  },

  playGiftSent: async () => {
    try {
      // In a real app, use the imperative API for expo-audio if available,
      // or implement via a Sound Context/Provider to use hooks correctly.
      // console.log("Playing gift sent sound...");
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  },

  playGiftReceived: async () => {
     // console.log("Playing gift received sound...");
  },

  playIncomingCall: async () => {
    try {
      await AudioModule.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
    } catch (error) {
       console.error("Failed to set audio mode:", error);
    }
  }
};

export const initSoundService = () => {
  try {
    if (typeof soundService?.init === 'function') {
      return soundService.init();
    }
  } catch (error) {
    console.log('SOUND INIT ERROR:', error);
  }
  return undefined;
};

export default soundService;
