// src/services/giftingService.js

export const GIFT_ASSETS = {
  // Popular
  'p1': { // Rose
    name: 'Rose',
    lottie: require('../../assets/animations/sparkles.json'),
    lottieUrl: 'https://assets9.lottiefiles.com/packages/lf20_mr67vnu6.json',
    sfx: require('../../assets/sounds/chime.mp3'),
    sfxUrl: 'https://www.soundjay.com/nature/wind-chime-1.mp3'
  },
  'p2': { // Finger Heart
    name: 'Finger Heart',
    lottieUrl: 'https://assets2.lottiefiles.com/packages/lf20_heart.json',
    sfxUrl: 'https://www.soundjay.com/nature/wind-chime-1.mp3'
  },
  // Glamour
  'g1': { // Lip Gloss
    name: 'Lip Gloss',
    lottieUrl: 'https://assets1.lottiefiles.com/private_files/lf30_shimmer.json',
    sfxUrl: 'https://www.soundjay.com/magic/magic-chime-01.mp3'
  },
  // Luxury
  'l9': { // Diamond Ring
    name: 'Diamond Ring',
    lottieUrl: 'https://assets10.lottiefiles.com/packages/lf20_f7sh9vpx.json', // Gold/Luxury
    sfxUrl: 'https://www.soundjay.com/magic/magic-chime-03.mp3'
  },
  'l11': { // Amira Crown
    name: 'Amira Crown',
    lottieUrl: 'https://assets11.lottiefiles.com/packages/lf20_crown_descent.json',
    sfxUrl: 'https://www.soundjay.com/magic/celestial-choir-1.mp3'
  },
  'l12': { // Golden Swan
    name: 'Golden Swan',
    lottieUrl: 'https://assets8.lottiefiles.com/packages/lf20_swan.json',
    sfxUrl: 'https://www.soundjay.com/magic/harp-glissando-1.mp3'
  }
};

// Map all other IDs to a default "Sparkle" if missing
export const getGiftAsset = (id) => {
  return GIFT_ASSETS[id] || {
    lottieUrl: 'https://assets9.lottiefiles.com/packages/lf20_mr67vnu6.json',
    sfxUrl: 'https://www.soundjay.com/nature/wind-chime-1.mp3'
  };
};
