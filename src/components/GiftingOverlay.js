// src/components/GiftingOverlay.js
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const ASSETS = {
  // Popular
  'p1': { // Rose
    lottie: 'https://assets4.lottiefiles.com/packages/lf20_rose.json',
    sfx: 'https://www.soundjay.com/nature/wind-chime-1.mp3'
  },
  'p2': { // Finger Heart
    lottie: 'https://assets2.lottiefiles.com/packages/lf20_heart.json',
    sfx: 'https://www.soundjay.com/nature/wind-chime-1.mp3'
  },
  // Glamour
  'g1': { // Lip Gloss
    lottie: 'https://assets1.lottiefiles.com/private_files/lf30_shimmer.json',
    sfx: 'https://www.soundjay.com/magic/magic-chime-01.mp3'
  },
  'g9': { // Luxury Vanity
    lottie: 'https://assets1.lottiefiles.com/private_files/lf30_shimmer.json',
    sfx: 'https://www.soundjay.com/magic/magic-chime-01.mp3'
  },
  'g7': { // Designer Bag
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_bag.json',
    sfx: 'https://www.soundjay.com/clothing/clothing-rustle-1.mp3'
  },
  'g5': { // High Heels
    lottie: 'https://assets1.lottiefiles.com/packages/lf20_redcarpet.json',
    sfx: 'https://www.soundjay.com/misc/footsteps-1.mp3'
  },
  // Luxury
  'l1': { // Champagne
    lottie: 'https://assets6.lottiefiles.com/packages/lf20_champagne.json',
    sfx: 'https://www.soundjay.com/button/beep-08.mp3'
  },
  'l9': { // Diamond Ring
    lottie: 'https://assets7.lottiefiles.com/packages/lf20_ring.json',
    sfx: 'https://www.soundjay.com/magic/magic-chime-03.mp3'
  },
  'l4': { // Private Jet
    lottie: 'https://assets10.lottiefiles.com/packages/lf20_T6idS6.json',
    sfx: 'https://www.soundjay.com/transportation/airplane-take-off-1.mp3'
  },
  'l3': { // Sports Car
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_V999iS.json',
    sfx: 'https://www.soundjay.com/transportation/car-engine-purr-1.mp3'
  },
  'l6': { // Mansion
    lottie: 'https://assets8.lottiefiles.com/packages/lf20_castle_build.json',
    sfx: 'https://www.soundjay.com/magic/harp-glissando-1.mp3'
  },
  'l12': { // Golden Swan
    lottie: 'https://assets8.lottiefiles.com/packages/lf20_swan.json',
    sfx: 'https://www.soundjay.com/magic/harp-glissando-1.mp3'
  },
  'l8': { // Phoenix
    lottie: 'https://assets3.lottiefiles.com/packages/lf20_phoenix.json',
    sfx: 'https://www.soundjay.com/nature/bird-chirp-1.mp3'
  },
  'l7': { // Crystal Castle
    lottie: 'https://assets9.lottiefiles.com/packages/lf20_crystal_tower.json',
    sfx: 'https://www.soundjay.com/magic/glass-chime-1.mp3'
  },
  'l11': { // Amira Crown
    lottie: 'https://assets11.lottiefiles.com/packages/lf20_crown_descent.json',
    sfx: 'https://www.soundjay.com/magic/celestial-choir-1.mp3'
  }
};

const GiftingOverlay = ({ giftId, onComplete }) => {
  const [sound, setSound] = useState();

  async function playSFX(url) {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 0.5 }
      );
      setSound(newSound);
    } catch (e) {
      console.log('Error playing sound', e);
    }
  }

  useEffect(() => {
    const asset = ASSETS[giftId];

    if (asset) {
      playSFX(asset.sfx);
    } else {
      onComplete();
    }

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const currentAsset = ASSETS[giftId];

  if (!currentAsset) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <LottieView
        source={{ uri: currentAsset.lottie }}
        autoPlay
        loop={false}
        onAnimationFinish={onComplete}
        style={styles.lottie}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  lottie: {
    width: width,
    height: height,
  },
});

export default GiftingOverlay;
