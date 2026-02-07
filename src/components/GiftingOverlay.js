// src/components/GiftingOverlay.js
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { getGiftAsset } from '../services/giftingService';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/hapticService';

const { width, height } = Dimensions.get('window');

const GiftingOverlay = ({ giftId, senderName, combo = 1, onComplete }) => {

  useEffect(() => {
    const asset = getGiftAsset(giftId);
    if (asset && asset.sfxUrl) {
      // Trigger sound simultaneously with the animation start
      soundService.play(asset.sfxUrl);

      // Trigger long vibration for premium feel
      hapticService.longVibration();
    }
  }, []);

  const asset = getGiftAsset(giftId);

  if (!asset) {
    onComplete();
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.content}>
        {senderName && (
          <View style={styles.banner}>
             <Text style={styles.bannerText}>{senderName} sent {asset.name || 'a gift'}!</Text>
             {combo > 1 && <Text style={styles.comboText}>x{combo}</Text>}
          </View>
        )}
        <LottieView
          source={asset.lottie || { uri: asset.lottieUrl }}
          autoPlay
          loop={false}
          onAnimationFinish={onComplete}
          style={styles.lottie}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: width,
    height: height,
  },
  banner: {
    position: 'absolute',
    top: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100000
  },
  bannerText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16
  },
  comboText: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: '900',
    marginLeft: 10,
    fontStyle: 'italic'
  }
});

export default GiftingOverlay;
