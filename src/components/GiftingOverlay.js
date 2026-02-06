// src/components/GiftingOverlay.js
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const ASSETS = {
  // Popular: Rose (p1), Finger Heart (p2)
  'p1': {
    lottie: 'https://assets4.lottiefiles.com/packages/lf20_rose.json', // Petals floating (simulated)
    sfx: 'https://www.soundjay.com/magic/magic-chime-01.mp3' // Soft Sparkle
  },
  'p2': {
    lottie: 'https://assets2.lottiefiles.com/packages/lf20_heart.json',
    sfx: 'https://www.soundjay.com/magic/magic-chime-01.mp3'
  },
  // Glamour: Designer Bag (g7)
  'g7': {
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_bag.json', // Sparkle burst
    sfx: 'https://www.soundjay.com/misc/cash-register-05.mp3' // Chaching
  },
  // Luxury: Champagne (l1), Sports Car (l3), Private Jet (l4), Diamond Ring (l9)
  'l1': {
    lottie: 'https://assets6.lottiefiles.com/packages/lf20_champagne.json', // Bubbles
    sfx: 'https://www.soundjay.com/button/beep-08.mp3' // Pop and Fizz placeholder
  },
  'l3': {
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_V999iS.json', // Car zoom
    sfx: 'https://www.soundjay.com/transportation/car-accelerating-1.mp3' // Rev + Tires
  },
  'l4': {
    lottie: 'https://assets10.lottiefiles.com/packages/lf20_T6idS6.json', // Jet diagonal
    sfx: 'https://www.soundjay.com/transportation/airplane-take-off-1.mp3' // Turbine roar
  },
  'l9': {
    lottie: 'https://assets7.lottiefiles.com/packages/lf20_ring.json', // Radiant glow
    sfx: 'https://www.soundjay.com/magic/magic-chime-02.mp3' // Shimmering/Twinkle
  }
};

const GiftingOverlay = ({ giftId, onComplete }) => {
  const [sound, setSound] = useState();

  async function playSFX(url) {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: 0.5 } // Set volume to 0.5 as requested
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
      // If no asset is mapped, complete immediately to avoid showing anything (no robot)
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
