// src/services/soundService.js
import { Audio } from 'expo-av';

class SoundService {
  constructor() {
    this.sounds = {};
  }

  async init() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1,
      });
    } catch (e) {
      console.log('SoundService: Error initializing audio mode', e);
    }
  }

  async preload(urls) {
    for (const url of urls) {
      if (this.sounds[url]) continue;
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: url });
        this.sounds[url] = sound;
      } catch (e) {
        console.log(`SoundService: Error preloading ${url}`, e);
      }
    }
  }

  async play(url) {
    if (this.sounds[url]) {
      try {
        await this.sounds[url].replayAsync();
      } catch (e) {
        console.log(`SoundService: Error replaying ${url}`, e);
        // Fallback: try loading and playing
        const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
        this.sounds[url] = sound;
      }
    } else {
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      this.sounds[url] = sound;
    }
  }

  async unloadAll() {
    for (const url in this.sounds) {
      await this.sounds[url].unloadAsync();
    }
    this.sounds = {};
  }
}

export const soundService = new SoundService();
