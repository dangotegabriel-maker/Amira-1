// src/components/GiftingOverlay.js
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const ASSETS = {
  // Popular: Rose (p1), Finger Heart (p2)
  'p1': {
    lottie: 'https://assets4.lottiefiles.com/packages/lf20_rose.json',
    sfx: 'https://www.soundjay.com/magic/magic-chime-01.mp3'
  },
  'p2': {
    lottie: 'https://assets2.lottiefiles.com/packages/lf20_heart.json',
    sfx: 'https://www.soundjay.com/magic/magic-chime-01.mp3'
  },
  // Glamour: Designer Bag (g7)
  'g7': {
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_bag.json',
    sfx: 'https://www.soundjay.com/misc/cash-register-05.mp3'
  },
  // Luxury: Champagne (l1), Sports Car (l3), Private Jet (l4), Diamond Ring (l9)
  'l1': {
    lottie: 'https://assets6.lottiefiles.com/packages/lf20_champagne.json',
    sfx: 'https://www.soundjay.com/button/beep-08.mp3' // Pop/Fizz placeholder
  },
  'l3': {
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_V999iS.json',
    sfx: 'https://www.soundjay.com/transportation/car-accelerating-1.mp3'
  },
  'l4': {
    lottie: 'https://assets10.lottiefiles.com/packages/lf20_T6idS6.json',
    sfx: 'https://www.soundjay.com/transportation/airplane-take-off-1.mp3'
  },
  'l9': {
    lottie: 'https://assets7.lottiefiles.com/packages/lf20_ring.json',
    sfx: 'https://www.soundjay.com/magic/magic-chime-02.mp3'
  }
};

const GiftingOverlay = ({ giftId, onComplete }) => {
  const [sound, setSound] = useState();

  async function playSFX(url) {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      setSound(newSound);
    } catch (e) {
      console.log('Error playing sound', e);
    }
  }

  useEffect(() => {
    const asset = ASSETS[giftId] || {
      lottie: 'https://assets3.lottiefiles.com/packages/lf20_96bovdur.json', // Rocket fallback
      sfx: 'https://www.soundjay.com/button/beep-07.mp3'
    };

    // Command: Simultaneous execution of sound and animation
    playSFX(asset.sfx);

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      <LottieView
        source={{ uri: ASSETS[giftId]?.lottie || 'https://assets3.lottiefiles.com/packages/lf20_96bovdur.json' }}
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
