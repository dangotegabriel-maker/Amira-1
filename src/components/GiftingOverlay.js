// src/components/GiftingOverlay.js
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const ASSETS = {
  // Popular: Rose, Finger Heart (p1, p2)
  'p1': {
    lottie: 'https://assets2.lottiefiles.com/packages/lf20_heart.json',
    sfx: 'https://www.soundjay.com/button/beep-07.mp3' // Sparkle placeholder
  },
  'p2': {
    lottie: 'https://assets4.lottiefiles.com/packages/lf20_rose.json',
    sfx: 'https://www.soundjay.com/button/beep-07.mp3' // Sparkle placeholder
  },
  // Glamour: Designer Bag (g7)
  'g7': {
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_bag.json',
    sfx: 'https://www.soundjay.com/misc/cash-register-05.mp3' // Chaching
  },
  // Luxury: Champagne, Sports Car, Private Jet, Diamond Ring (l1, l3, l4, l9)
  'l1': {
    lottie: 'https://assets6.lottiefiles.com/packages/lf20_champagne.json',
    sfx: 'https://www.soundjay.com/button/beep-08.mp3' // Pop placeholder
  },
  'l3': {
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_V999iS.json', // Sportscar
    sfx: 'https://www.soundjay.com/transportation/car-accelerating-1.mp3' // Rev/Screech placeholder
  },
  'l4': {
    lottie: 'https://assets10.lottiefiles.com/packages/lf20_T6idS6.json', // Private Jet
    sfx: 'https://www.soundjay.com/transportation/airplane-take-off-1.mp3' // Jet roar
  },
  'l9': {
    lottie: 'https://assets7.lottiefiles.com/packages/lf20_ring.json',
    sfx: 'https://www.soundjay.com/button/beep-09.mp3' // Twinkle placeholder
  }
};

const GiftingOverlay = ({ giftId, onComplete }) => {
  const [sound, setSound] = useState();

  async function playSFX(url) {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: url });
      setSound(newSound);
      await newSound.playAsync();
    } catch (e) {
      console.log('Error playing sound', e);
    }
  }

  useEffect(() => {
    const asset = ASSETS[giftId] || {
      lottie: 'https://assets3.lottiefiles.com/packages/lf20_96bovdur.json', // Rocket fallback
      sfx: 'https://www.soundjay.com/button/beep-07.mp3'
    };

    // Execute playSFX and playAnimation (LottieView autoPlay) simultaneously
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
