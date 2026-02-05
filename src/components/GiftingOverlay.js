// src/components/GiftingOverlay.js
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const ASSETS = {
  'p12': { // Rocket
    lottie: 'https://assets3.lottiefiles.com/packages/lf20_96bovdur.json',
    sfx: 'https://www.soundjay.com/mechanical/rocket-launch-01.mp3'
  },
  'l9': { // Private Jet
    lottie: 'https://assets10.lottiefiles.com/packages/lf20_T6idS6.json',
    sfx: 'https://www.soundjay.com/transportation/airplane-take-off-1.mp3'
  },
  'l6': { // Sportscar
    lottie: 'https://assets5.lottiefiles.com/packages/lf20_V999iS.json',
    sfx: 'https://www.soundjay.com/transportation/car-accelerating-1.mp3'
  }
};

const GiftingOverlay = ({ giftId, onComplete }) => {
  const [sound, setSound] = useState();

  async function playSFX(url) {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setSound(sound);
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing sound', e);
    }
  }

  useEffect(() => {
    const asset = ASSETS[giftId] || ASSETS['p12']; // Fallback to rocket

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
        source={{ uri: ASSETS[giftId]?.lottie || ASSETS['p12'].lottie }}
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
