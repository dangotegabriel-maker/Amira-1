// src/screens/main/VideoCallScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, PanResponder, Alert, Modal } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { PhoneOff, Mic, MicOff, Camera, Video, Gift, Coins, X } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { hapticService } from '../../services/hapticService';
import { agoraService } from '../../services/agoraService';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import GiftTray from '../../components/GiftTray';
import GiftingOverlay from '../../components/GiftingOverlay';
import RechargeHubScreen from './RechargeHubScreen';

const { width, height } = Dimensions.get('window');
const CALL_RATE = 50; // 50 coins per minute

const VideoCallScreen = ({ route, navigation }) => {
  const { name, userId } = route.params;
  const [currentUser, setCurrentUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [showSparkles, setShowSparkles] = useState(true);
  const [isGiftTrayVisible, setIsGiftTrayVisible] = useState(false);
  const [activeGift, setActiveGift] = useState(null);
  const [duration, setDuration] = useState(0);
  const [secondsInMinute, setSecondsInMinute] = useState(0);
  const [balance, setBalance] = useState(0);
  const [isRechargeVisible, setIsRechargeVisible] = useState(false);

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
       setSecondsInMinute(prev => (prev + 1) % 60);
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

     const currentBalance = await ledgerService.getBalance();
     setBalance(currentBalance);

     // Upfront Billing for the First Minute
     if (profile.gender === 'male') {
        if (currentBalance < CALL_RATE) {
           Alert.alert("Low Balance", "You need at least 50 coins to start a call.");
           navigation.goBack();
           return;
        }
        await billMinute();
     }

     // Cinematic Cross-Fade
     Animated.timing(fadeAnim, {
       toValue: 1,
       duration: 500,
       useNativeDriver: true,
     }).start();

     hapticService.success();
     const sparkleTimer = setTimeout(() => setShowSparkles(false), 3000);

     agoraService.joinChannel(`call_${userId}`);

     // Heartbeat Check: Every 60 seconds starting from now
     if (profile.gender === 'male') {
        billingTimer.current = setInterval(async () => {
           const latestBalance = await ledgerService.getBalance();
           if (latestBalance < CALL_RATE) {
              hapticService.error();
              Alert.alert("Low Balance", "The call has ended due to insufficient coins.");
              navigation.goBack();
           } else {
              await billMinute();
           }
        }, 60000);
     }
  };

  const billMinute = async () => {
     try {
        await ledgerService.billCallMinute(CALL_RATE, userId, name);
        const newBalance = await ledgerService.getBalance();
        setBalance(newBalance);
        console.log("Minute billed successfully.");
     } catch (e) {
        console.error("Billing failed", e);
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
    loadBalance(); // Refresh balance after gift
  };

  const loadBalance = async () => {
     const b = await ledgerService.getBalance();
     setBalance(b);
  };

  const formatDuration = (s) => {
     const mins = Math.floor(s / 60);
     const secs = s % 60;
     return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isLowBalance = balance < CALL_RATE;
  const showCountdown = secondsInMinute >= 50;

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

      {/* Graceful Exit / Recharge UI */}
      {currentUser?.gender === 'male' && showCountdown && (
         <View style={styles.alertBar}>
            {isLowBalance ? (
               <TouchableOpacity style={styles.rechargeInline} onPress={() => setIsRechargeVisible(true)}>
                  <Coins color="white" size={16} />
                  <Text style={styles.rechargeInlineText}>Low Balance! Recharge now to stay connected</Text>
               </TouchableOpacity>
            ) : (
               <Text style={styles.countdownText}>Next minute in {60 - secondsInMinute}s...</Text>
            )}
         </View>
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

      <Modal visible={isRechargeVisible} animationType="slide">
         <View style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
               <TouchableOpacity onPress={() => { setIsRechargeVisible(false); loadBalance(); }}>
                  <X color="black" size={28} />
               </TouchableOpacity>
               <Text style={styles.modalTitle}>Recharge Hub</Text>
               <View style={{ width: 28 }} />
            </View>
            <RechargeHubScreen navigation={navigation} />
         </View>
      </Modal>
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

  alertBar: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  rechargeInline: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  rechargeInlineText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 12 },
  countdownText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, fontSize: 12 },

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

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
});

export default VideoCallScreen;
