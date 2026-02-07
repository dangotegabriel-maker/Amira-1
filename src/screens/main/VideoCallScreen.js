// src/screens/main/VideoCallScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { PhoneOff, Mic, MicOff, Camera, Video, Gift } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { hapticService } from '../../services/hapticService';
import { agoraService } from '../../services/agoraService';
import GiftTray from '../../components/GiftTray';
import GiftingOverlay from '../../components/GiftingOverlay';

const { width, height } = Dimensions.get('window');

const VideoCallScreen = ({ route, navigation }) => {
  const { name, userId } = route.params;
  const [isMuted, setIsMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [showSparkles, setShowSparkles] = useState(true);
  const [isGiftTrayVisible, setIsGiftTrayVisible] = useState(false);
  const [activeGift, setActiveGift] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pipPos = useRef(new Animated.ValueXY({ x: width - 120, y: 100 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pipPos.x, dy: pipPos.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        // Simple snapping logic can be added here
      },
    })
  ).current;

  useEffect(() => {
    // Cinematic Cross-Fade on connect
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Haptic on connection
    hapticService.success();

    // Sparkle effect for first 3 seconds
    const timer = setTimeout(() => setShowSparkles(false), 3000);

    agoraService.joinChannel(`call_${userId}`);

    return () => {
      clearTimeout(timer);
      agoraService.leaveChannel();
    };
  }, []);

  const handleEndCall = () => {
    hapticService.mediumImpact();
    navigation.goBack();
  };

  const toggleMute = () => {
    hapticService.lightImpact();
    setIsMuted(!isMuted);
  };

  const handleGiftSent = (gift, combo) => {
    setActiveGift({ id: gift.id, combo });
  };

  return (
    <View style={styles.container}>
      {/* Remote Full-Screen Video Placeholder */}
      <Animated.View style={[styles.fullVideo, { opacity: fadeAnim }]}>
         <View style={styles.remotePlaceholder}>
            <Text style={styles.remoteName}>{name}</Text>
            <Text style={styles.remoteStatus}>Connected</Text>
         </View>
      </Animated.View>

      {/* Draggable Rounded PiP Local Feed */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.pip, { transform: pipPos.getTranslateTransform() }]}
      >
         <View style={styles.localPlaceholder}>
            <Camera color="white" size={24} />
         </View>
      </Animated.View>

      {/* Sparkle Lottie Overlay */}
      {showSparkles && (
        <LottieView
          source={{ uri: 'https://assets9.lottiefiles.com/private_files/lf30_shimmer.json' }}
          autoPlay
          loop
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {/* Gifting Overlay */}
      {activeGift && (
        <GiftingOverlay
           giftId={activeGift.id}
           combo={activeGift.combo}
           onComplete={() => setActiveGift(null)}
        />
      )}

      {/* Glassmorphism Controls */}
      <View style={styles.controlsContainer}>
         <View style={styles.glassBar}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
               {isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.controlButton, styles.endCall]} onPress={handleEndCall}>
               <PhoneOff color="white" size={28} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={() => setIsFrontCamera(!isFrontCamera)}>
               <Video color="white" size={24} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={() => setIsGiftTrayVisible(true)}>
               <Gift color="#FFD700" size={24} />
            </TouchableOpacity>
         </View>
      </View>

      <GiftTray
        visible={isGiftTrayVisible}
        onClose={() => setIsGiftTrayVisible(false)}
        onGiftSent={handleGiftSent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  fullVideo: { ...StyleSheet.absoluteFillObject },
  remotePlaceholder: { flex: 1, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  remoteName: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  remoteStatus: { color: COLORS.primary, fontSize: 16, marginTop: 10 },
  pip: { position: 'absolute', width: 100, height: 150, borderRadius: 20, backgroundColor: '#333', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  localPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  controlsContainer: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  glassBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  controlButton: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  endCall: { backgroundColor: '#FF3B30', width: 60, height: 60, borderRadius: 30 },
});

export default VideoCallScreen;
