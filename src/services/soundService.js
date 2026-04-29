import { AudioModule } from 'expo-audio';

export const soundService = {
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
