// src/services/translationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'translation_cache_';

export const translationService = {
  translateMessage: async (text, targetLang) => {
    const cacheKey = `${CACHE_KEY_PREFIX}${targetLang}_${text}`;

    // Check cache
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        console.log('Returning cached translation');
        return cached;
      }
    } catch (e) {
      console.error('Cache read error:', e);
    }

    // Mock Translation Logic (Simulating Google Cloud Translation / DeepL)
    console.log(`Translating "${text}" to ${targetLang}`);

    // Simple mock translations for demo
    let translated = `[${targetLang}] ${text}`;
    if (text.toLowerCase().includes('hey')) translated = targetLang === 'es' ? '¡Hola!' : translated;
    if (text.toLowerCase().includes('good')) translated = targetLang === 'fr' ? 'Bien' : translated;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Cache the result
    try {
      await AsyncStorage.setItem(cacheKey, translated);
    } catch (e) {
      console.error('Cache write error:', e);
    }

    return translated;
  },

  clearCache: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const translationKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(translationKeys);
    } catch (e) {
      console.error('Cache clear error:', e);
    }
  }
};
