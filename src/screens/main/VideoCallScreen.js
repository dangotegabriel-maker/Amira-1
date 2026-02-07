// src/screens/main/VideoCallScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, PanResponder, Alert } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { PhoneOff, Mic, MicOff, Camera, Video, Gift } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { hapticService } from '../../services/hapticService';
import { agoraService } from '../../services/agoraService';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import GiftTray from '../../components/GiftTray';
import GiftingOverlay from '../../components/GiftingOverlay';

const { width, height } = Dimensions.get('window');

const VideoCallScreen = ({ route, navigation }) => {
  const { name, userId } = route.params;
  const [currentUser, setCurrentUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [showSparkles, setShowSparkles] = useState(true);
  const [isGiftTrayVisible, setIsGiftTrayVisible] = useState(false);
  const [activeGift, setActiveGift] = useState(null);
  const [duration, setDuration] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pipPos = useRef(new Animated.ValueXY({ x: width - 120, y: 100 })).current;
  const billingTimer = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pipPos.x, dy: pipPos.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {},
    })
  ).current;

  useEffect(() => {
    loadUserAndStartCall();

    const secondTimer = setInterval(() => {
       setDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(secondTimer);
      if (billingTimer.current) clearInterval(billingTimer.current);
      agoraService.leaveChannel();
    };
  }, []);

  const loadUserAndStartCall = async () => {
     const profile = await dbService.getUserProfile('current_user_id');
     setCurrentUser(profile);

     // Cinematic Cross-Fade
     Animated.timing(fadeAnim, {
       toValue: 1,
       duration: 500,
       useNativeDriver: true,
     }).start();

     hapticService.success();
     const sparkleTimer = setTimeout(() => setShowSparkles(false), 3000);

     agoraService.joinChannel(`call_${userId}`);

     // Start Per-Minute Billing for Males
     if (profile.gender === 'male') {
        billingTimer.current = setInterval(async () => {
           try {
              await ledgerService.billCallMinute(30, userId, name); // 30 coins/min
              console.log("Call billed: 30 coins deducted.");
           } catch (e) {
              hapticService.error();
              Alert.alert("Low Balance", "You ran out of coins. The call has ended.");
              navigation.goBack();
           }
        }, 60000);
     }
  };

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

  const formatDuration = (s) => {
     const mins = Math.floor(s / 60);
     const secs = s % 60;
     return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.fullVideo, { opacity: fadeAnim }]}>
         <View style={styles.remotePlaceholder}>
            <Text style={styles.remoteName}>{name}</Text>
            <Text style={styles.remoteStatus}>{formatDuration(duration)}</Text>
         </View>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.pip, { transform: pipPos.getTranslateTransform() }]}
      >
         <View style={styles.localPlaceholder}>
            <Camera color="white" size={24} />
         </View>
      </Animated.View>

      {showSparkles && (
        <LottieView
          source={{ uri: 'https://assets9.lottiefiles.com/private_files/lf30_shimmer.json' }}
          autoPlay
          loop
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {activeGift && (
        <GiftingOverlay
           giftId={activeGift.id}
           combo={activeGift.combo}
           onComplete={() => setActiveGift(null)}
        />
      )}

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
