// src/screens/main/VideoCallScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, PanResponder, Alert, Modal } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { PhoneOff, Mic, MicOff, Camera, Video, Gift, Coins, X, DollarSign, Heart } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { hapticService } from '../../services/hapticService';
import { agoraService } from '../../services/agoraService';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { socketService } from '../../services/socketService';
import { soundService } from '../../services/soundService';
import GiftTray from '../../components/GiftTray';
import GiftingOverlay from '../../components/GiftingOverlay';
import * as ScreenCapture from 'expo-screen-capture';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const CALL_RATE = 50;

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
  const [showQuickRecharge, setShowQuickRecharge] = useState(false);
  const [extendingCall, setExtendingCall] = useState(false);
  const [diamondsEarned, setDiamondsEarned] = useState(0);

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

    // Privacy Shield
    ScreenCapture.preventScreenCaptureAsync();

    const secondTimer = setInterval(() => {
       setDuration(prev => prev + 1);
       setSecondsInMinute(prev => (prev + 1) % 60);
    }, 1000);

    // Listen for call extension animation
    const onCallExtending = () => {
       setExtendingCall(true);
       setTimeout(() => setExtendingCall(false), 3000);
    };
    socketService.on('call_extending', onCallExtending);

    return () => {
      clearInterval(secondTimer);
      if (billingTimer.current) clearInterval(billingTimer.current);
      agoraService.leaveChannel();
      socketService.off('call_extending', onCallExtending);
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const loadUserAndStartCall = async () => {
     const profile = await dbService.getUserProfile('current_user_id');
     if (profile.is_verified === false && profile.defaultAvatar === true) {
        Alert.alert("Verification Required", "Please upload a profile photo to initiate or receive calls.");
        navigation.goBack();
        return;
     }
     setCurrentUser(profile);

     const currentBalance = await ledgerService.getBalance();
     setBalance(currentBalance);

     if (profile.gender === 'male') {
        if (currentBalance < CALL_RATE) {
           Alert.alert("Low Balance", "You need at least 50 coins to start a call.");
           navigation.goBack();
           return;
        }
        await billMinute();
     }

     Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
     hapticService.success();
     const sparkleTimer = setTimeout(() => setShowSparkles(false), 3000);
     agoraService.joinChannel(`call_${userId}`);

     if (profile.gender === 'male') {
        billingTimer.current = setInterval(async () => {
           const latestBalance = await ledgerService.getBalance();
           if (latestBalance < CALL_RATE) {
              hapticService.error();
              Alert.alert("Low Balance", "The call has ended.");
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

        // Signal extension to female
        socketService.signalCallExtension(userId);

        console.log("Minute billed successfully.");
     } catch (e) {
        console.error("Billing failed", e);
     }
  };

  const handleQuickBuy = async (amount) => {
     hapticService.mediumImpact();
     await ledgerService.buyCoins(amount, 'quick_buy');
     const newBalance = await ledgerService.getBalance();
     setBalance(newBalance);
     setShowQuickRecharge(false);
     hapticService.success();
  };

  useEffect(() => {
     if (currentUser?.gender === 'female' && duration > 0 && duration % 60 === 0) {
        creditMinute();
     }
  }, [duration]);

  const creditMinute = async () => {
     const earned = await ledgerService.creditDiamonds(CALL_RATE);
     setDiamondsEarned(prev => prev + earned);
     soundService.play('https://www.soundjay.com/misc/coin-drop-1.mp3');
     hapticService.lightImpact();
  };

  const isLowForNext = balance < CALL_RATE;
  const showWarning = secondsInMinute >= 50 && currentUser?.gender === 'male' && isLowForNext;

  useEffect(() => {
     if (showWarning) setShowQuickRecharge(true);
  }, [showWarning]);

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
            {extendingCall && (
               <View style={styles.extendingOverlay}>
                  <Heart color={COLORS.primary} fill={COLORS.primary} size={48} />
                  <Text style={styles.extendingText}>User is extending the call...</Text>
               </View>
            )}
            {currentUser?.gender === 'female' && diamondsEarned > 0 && (
               <View style={styles.diamondFloat}>
                  <Text style={styles.diamondText}>+💎 {diamondsEarned}</Text>
               </View>
            )}
         </View>
      </Animated.View>

      <Animated.View {...panResponder.panHandlers} style={[styles.pip, { transform: pipPos.getTranslateTransform() }]}>
         <View style={styles.localPlaceholder}><Camera color="white" size={24} /></View>
      </Animated.View>

      {showSparkles && (
        <LottieView source={{ uri: 'https://assets9.lottiefiles.com/private_files/lf30_shimmer.json' }} autoPlay loop style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}

      {activeGift && <GiftingOverlay giftId={activeGift.id} combo={activeGift.combo} onComplete={() => setActiveGift(null)} />}

      <View style={styles.controlsContainer}>
         <View style={styles.glassBar}>
            <TouchableOpacity style={styles.controlButton} onPress={() => setIsMuted(!isMuted)}>{isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}</TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, styles.endCall]} onPress={() => navigation.goBack()}><PhoneOff color="white" size={28} /></TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => setIsFrontCamera(!isFrontCamera)}><Video color="white" size={24} /></TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => setIsGiftTrayVisible(true)}><Gift color="#FFD700" size={24} /></TouchableOpacity>
         </View>
      </View>

      <GiftTray visible={isGiftTrayVisible} onClose={() => setIsGiftTrayVisible(false)} onGiftSent={(g, c) => setActiveGift({ id: g.id, combo: c })} />

      {/* Quick Recharge Overlay */}
      {showQuickRecharge && (
         <View style={styles.quickBuyContainer}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.quickBuyContent}>
               <Text style={styles.quickBuyTitle}>Running Low!</Text>
               <Text style={styles.quickBuySubtitle}>Next minute in {60 - secondsInMinute}s. Top up now to stay connected.</Text>
               <View style={styles.packageRow}>
                  {[
                    { coins: 100, price: '$0.99' },
                    { coins: 500, price: '$4.99' },
                    { coins: 1200, price: '$9.99' }
                  ].map((p, i) => (
                    <TouchableOpacity key={i} style={styles.package} onPress={() => handleQuickBuy(p.coins)}>
                       <Coins color="#FFD700" size={20} />
                       <Text style={styles.pkgCoins}>{p.coins}</Text>
                       <Text style={styles.pkgPrice}>{p.price}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
               <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowQuickRecharge(false)}><Text style={{ color: 'white' }}>Cancel</Text></TouchableOpacity>
            </View>
         </View>
      )}
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

  extendingOverlay: { position: 'absolute', top: '30%', alignItems: 'center' },
  extendingText: { color: 'white', fontWeight: 'bold', marginTop: 15, textShadowColor: 'black', textShadowRadius: 5 },
  diamondFloat: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(76, 217, 100, 0.8)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  diamondText: { color: 'white', fontWeight: 'bold' },

  controlsContainer: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  glassBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 15, borderRadius: 40, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  controlButton: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  endCall: { backgroundColor: '#FF3B30', width: 60, height: 60, borderRadius: 30 },

  quickBuyContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 350, zIndex: 1000 },
  quickBuyContent: { flex: 1, padding: 30, alignItems: 'center' },
  quickBuyTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  quickBuySubtitle: { color: '#CCC', textAlign: 'center', marginBottom: 30 },
  packageRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  package: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 15, alignItems: 'center', width: '30%' },
  pkgCoins: { color: 'white', fontWeight: 'bold', marginTop: 5 },
  pkgPrice: { color: COLORS.primary, fontSize: 12, marginTop: 2 },
  cancelBtn: { marginTop: 30 }
});

export default VideoCallScreen;
