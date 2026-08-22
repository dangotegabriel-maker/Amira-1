// src/screens/main/VideoCallScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, PanResponder, Alert, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { PhoneOff, Mic, MicOff, Video, Gift, Coins, Heart, RefreshCw } from 'lucide-react-native';
import { Camera, CameraView } from 'expo-camera';
import LottieView from 'lottie-react-native';
import { hapticService } from '../../services/hapticService';
import { agoraService } from '../../services/agoraService';
import { ledgerService } from '../../services/ledgerService';
import { auth, dbService, getWalletBalance } from '../../services/firebaseService';
import { socketService } from '../../services/socketService';
import { soundService } from '../../services/soundService';
import GiftTray from '../../components/GiftTray';
import GiftingOverlay from '../../components/GiftingOverlay';
import * as ScreenCapture from 'expo-screen-capture';
import { BlurView } from 'expo-blur';
import { useUser } from '../../context/UserContext';
import { DEV_FEATURES } from '../../config/devFeatures';
import { isApprovedHost } from '../../models/userModel';

const { width, height } = Dimensions.get('window');
const CALL_RATE = 50;

const VideoCallScreen = ({ route, navigation }) => {
  const { name, userId, callRate = CALL_RATE } = route.params || {};
  const { fetchUserCoins } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
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

  const toggleCamera = () => {
     hapticService.lightImpact();
     setIsFrontCamera(prev => !prev);
  };

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
    const onCallEnded = (data) => {
       if (data.reason === 'low_balance') {
          Alert.alert("Call Ended", "The call ended due to low balance.");
       }
       navigateToSummary();
    };
    socketService.on('call_extending', onCallExtending);
    socketService.on('call_ended', onCallEnded);

    return () => {
      clearInterval(secondTimer);
      if (billingTimer.current) clearInterval(billingTimer.current);
      agoraService.leaveChannel();
      socketService.off('call_extending', onCallExtending);
      socketService.off('call_ended', onCallEnded);
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

   const navigateToSummary = () => {
      navigation.navigate('CallSummary', {
         duration,
         coinsSpent: currentUser?.role === 'consumer'
           ? (Math.ceil(duration / 60) * callRate)
           : 0,
         diamondsEarned: isApprovedHost(currentUser) ? diamondsEarned : 0,
         targetUserId: userId,
         targetUserName: name,
         targetUserPhoto: `https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200`, // In real app, pass actual photo
         isMale: currentUser?.role === 'consumer'
      });
   };

  const loadUserAndStartCall = async () => {
     try {
        const permissionsGranted = await requestMediaPermissions();
        if (!permissionsGranted) return;

        const user = auth.currentUser;
        if (!user) {
           Alert.alert("Error", "User not authenticated.");
           navigation.goBack();
           return;
        }

        const profile = await dbService.getUserProfile(user.uid);
        if (!profile) {
           Alert.alert("Error", "Could not load your profile.");
           navigation.goBack();
           return;
        }

        if (profile.is_verified === false && profile.defaultAvatar === true) {
           Alert.alert("Verification Required", "Please upload a profile photo to initiate or receive calls.");
           navigation.goBack();
           return;
        }
        setCurrentUser(profile);

        if (profile.role === 'host' && !isApprovedHost(profile)) {
           Alert.alert('Host Approval Required', 'Paid host calls are unavailable until your host application is approved.');
           navigation.goBack();
           return;
        }

        const currentBalance = await fetchLatestCoins();
        console.log("USER COINS:", currentBalance);
        setBalance(currentBalance);

        const isConsumer = profile.role === 'consumer';
        if (isConsumer) {
           if (currentBalance < callRate) {
              Alert.alert("Low Balance", `You need at least ${callRate} to start a call.`);
              navigation.goBack();
              return;
           }
           await billMinute();
        }

        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        hapticService.success();
        setTimeout(() => setShowSparkles(false), 3000);
        await agoraService.joinChannel(`call_${userId}`);
        setCameraActive(true);
        setIsConnecting(false);

        if (isConsumer) {
           billingTimer.current = setInterval(async () => {
              const latestBalance = await fetchLatestCoins();
              console.log("USER COINS:", latestBalance);
              if (latestBalance < callRate) {
                 hapticService.error();
                 socketService.emitEndCall(userId, 'low_balance');
              } else {
                 await billMinute();
              }
           }, 60000);
        }
     } catch (error) {
        console.log("CALL START ERROR:", error?.code, error?.message);
        Alert.alert("Call Error", "Could not start the call.");
        navigation.goBack();
     }
  };

  const requestMediaPermissions = async () => {
     try {
        const cameraPermission = await Camera.requestCameraPermissionsAsync();
        const microphonePermission = await Camera.requestMicrophonePermissionsAsync();
        const granted = cameraPermission?.granted && microphonePermission?.granted;

        console.log("Camera permission:", cameraPermission?.status);
        console.log("Microphone permission:", microphonePermission?.status);
        setHasCameraPermission(Boolean(granted));

        if (!granted) {
           Alert.alert("Permissions Required", "Camera and microphone access are required for video calls.");
           navigation.goBack();
        }

        return Boolean(granted);
     } catch (error) {
        console.log("MEDIA PERMISSION ERROR:", error?.code, error?.message);
        Alert.alert("Camera Error", "Could not start camera permissions.");
        navigation.goBack();
        return false;
     }
  };

  const fetchLatestCoins = async () => {
     try {
        const user = auth.currentUser;
        if (!user?.uid) {
           console.log("COIN FETCH ERROR:", "User not authenticated");
           return 0;
        }

        const profile = await dbService.getUserProfile(user.uid);
        const walletBalance = getWalletBalance(profile);
        setBalance(walletBalance);
        console.log('WALLET BALANCE:', walletBalance);
        return walletBalance;
     } catch (error) {
        console.log("COIN FETCH ERROR:", error?.code, error?.message);
        return 0;
     }
  };

  const billMinute = async () => {
     try {
        const user = auth.currentUser;
        if (!user) {
           throw new Error("User not authenticated");
        }

        const latestCoins = await fetchLatestCoins();
        if (latestCoins < callRate) {
           Alert.alert("Low Balance", `You need at least ${callRate} to continue this call.`);
           socketService.emitEndCall(userId, 'low_balance');
           return;
        }

        await dbService.updateWalletBalance(-callRate);

        const newBalance = latestCoins - callRate;
        setBalance(newBalance);
        await fetchUserCoins();

        // Signal extension to female
        socketService.signalCallExtension(userId);

         // console.log("Minute billed successfully.");
     } catch (e) {
        console.error("Billing failed", e);
     }
  };

  const handleQuickBuy = async (amount) => {
     if (!DEV_FEATURES.enableTestTopUps) {
        Alert.alert('Unavailable', 'Test top-ups are disabled in this build.');
        return;
     }
     try {
        hapticService.mediumImpact();
        const user = auth.currentUser;
        if (!user) {
           Alert.alert("Error", "User not authenticated.");
           return;
        }

        await dbService.topUpWallet(amount);
        await ledgerService.buyCoins(amount, 'quick_buy');
        const newBalance = await fetchLatestCoins();
        setBalance(newBalance);
        setShowQuickRecharge(false);
        hapticService.success();
     } catch (error) {
        console.log("QUICK BUY ERROR:", error?.code, error?.message);
        Alert.alert("Error", "Failed to add coins.");
     }
  };

  useEffect(() => {
     const isHost = isApprovedHost(currentUser);
     if (isHost && duration > 0 && duration % 60 === 0) {
        creditMinute();
     }
  }, [duration]);

  const creditMinute = async () => {
     try {
        const earned = await ledgerService.creditDiamonds(callRate);
        setDiamondsEarned(prev => prev + earned);
        if (soundService?.play) {
          soundService.play('https://www.soundjay.com/misc/coin-drop-1.mp3');
        }
        hapticService.lightImpact();
     } catch (error) {
        console.log("DIAMOND CREDIT ERROR:", error?.code, error?.message);
     }
  };

  const isLowForNext = balance < callRate;
  const isConsumer = currentUser?.role === 'consumer';
  const showWarning = secondsInMinute >= 50 && isConsumer && isLowForNext;

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
            {isApprovedHost(currentUser) && diamondsEarned > 0 && (
               <View style={styles.diamondFloat}>
                  <Text style={styles.diamondText}>+💎 {diamondsEarned}</Text>
               </View>
            )}
         </View>
      </Animated.View>

      {isConnecting && (
        <View style={styles.connectingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.connectingText}>Connecting video...</Text>
        </View>
      )}

      <Animated.View {...panResponder.panHandlers} style={[styles.pip, { transform: pipPos.getTranslateTransform() }]}>
         <View style={styles.localPlaceholder}>
            {hasCameraPermission ? (
              <CameraView
                style={{ flex: 1 }}
                facing={isFrontCamera ? 'front' : 'back'}
                active={cameraActive}
                onCameraReady={() => {
                  console.log('Camera stream active:', true);
                  setIsCameraReady(true);
                }}
                onMountError={(event) => console.log("CAMERA MOUNT ERROR:", event?.nativeEvent?.message)}
              />
            ) : (
              <View style={styles.cameraFallback}>
                <Text style={styles.cameraFallbackText}>Starting camera...</Text>
              </View>
            )}
            {hasCameraPermission && !isCameraReady && (
              <View style={styles.cameraLoading}>
                <ActivityIndicator color="white" />
                <Text style={styles.cameraFallbackText}>Starting camera...</Text>
              </View>
            )}
            <TouchableOpacity
               style={styles.flipButton}
               onPress={toggleCamera}
            >
               <RefreshCw color="white" size={20} />
            </TouchableOpacity>
         </View>
      </Animated.View>

      {showSparkles && (
        <LottieView source={{ uri: 'https://assets9.lottiefiles.com/private_files/lf30_shimmer.json' }} autoPlay loop style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}

      {activeGift && <GiftingOverlay giftId={activeGift.id} combo={activeGift.combo} onComplete={() => setActiveGift(null)} />}

      <View style={styles.controlsContainer}>
         <View style={styles.glassBar}>
            <TouchableOpacity style={styles.controlButton} onPress={() => setIsMuted(!isMuted)}>{isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}</TouchableOpacity>
            <TouchableOpacity style={[styles.controlButton, styles.endCall]} onPress={navigateToSummary}><PhoneOff color="white" size={28} /></TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}><Video color="white" size={24} /></TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => setIsGiftTrayVisible(true)}><Gift color="#FFD700" size={24} /></TouchableOpacity>
         </View>
      </View>

      <GiftTray visible={isGiftTrayVisible} onClose={() => setIsGiftTrayVisible(false)} onGiftSent={(g, c) => setActiveGift({ id: g.id, combo: c })} />

      {/* Quick Recharge Overlay */}
      {showQuickRecharge && DEV_FEATURES.enableTestTopUps && (
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
  pip: { position: 'absolute', width: 100, height: 150, borderRadius: 20, backgroundColor: '#333', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', zIndex: 100 },
  localPlaceholder: { flex: 1 },
  cameraFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  cameraFallbackText: { color: 'white', fontSize: 12 },
  cameraLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  connectingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 90, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  connectingText: { color: 'white', marginTop: 12, fontSize: 16, fontWeight: '700' },
  flipButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 15,
  },

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
