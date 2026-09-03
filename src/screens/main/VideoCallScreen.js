import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { Flag, Mic, MicOff, PhoneOff, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { DAILY_FREE_PREVIEW_SECONDS, BILLING_INCREMENT_SECONDS } from '../../config/callConfig';
import { rtcService } from '../../services/rtcService';
import { callService } from '../../services/callService';
import { canContinuePaidCall, quoteIncrement, quotePaidDuration } from '../../services/billingService';
import { blockService } from '../../services/blockService';
import { reportService } from '../../services/reportService';
import { useUser } from '../../context/UserContext';

const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const VideoCallScreen = ({ route, navigation }) => {
  const initialCall = route.params?.call;
  const creator = route.params?.creator || initialCall?.creator;
  const { coins } = useUser();
  const [call, setCall] = useState(initialCall);
  const [phase, setPhase] = useState(initialCall?.simulated ? 'ringing' : initialCall?.status || 'requesting');
  const [duration, setDuration] = useState(0);
  const [previewRemaining, setPreviewRemaining] = useState(DAILY_FREE_PREVIEW_SECONDS);
  const [mode, setMode] = useState(initialCall?.previewEligible ? 'free_preview' : 'paid_pending');
  const [muted, setMuted] = useState(false); const [front, setFront] = useState(true);
  const timerRef = useRef(null); const mounted = useRef(true);
  const rate = call?.ratePerMinute || creator?.hostProfile?.videoRateCredits || 25;

  useEffect(() => {
    mounted.current = true;
    let unsubscribe = () => {}; let ringTimeout;
    const connect = async () => {
      const granted = await rtcService.requestPermissions();
      if (!granted) throw new Error('Camera and microphone permissions are required.');
      setPhase('connecting');
      await rtcService.joinSession(call.callId);
      if (mounted.current) setPhase('connected');
    };
    if (call?.simulated) {
      ringTimeout = setTimeout(() => { setPhase('accepted'); setTimeout(() => connect().catch(endFailed), 500); }, 900);
    } else if (call?.callId) {
      unsubscribe = callService.subscribe(call.callId, (next) => {
        setCall(next); setPhase(next.status);
        if (next.status === 'accepted') connect().catch(endFailed);
        if (['rejected','missed','cancelled','failed'].includes(next.status)) Alert.alert('Call ended', `The call was ${next.status}.`, [{ text:'OK', onPress:()=>navigation.goBack() }]);
      });
    }
    return () => { mounted.current = false; clearTimeout(ringTimeout); unsubscribe(); rtcService.leaveSession(); };
  }, []);

  useEffect(() => {
    if (phase !== 'connected' || mode === 'paid_pending') return undefined;
    timerRef.current = setInterval(() => {
      setDuration((value) => value + 1);
      if (mode === 'free_preview') setPreviewRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, mode]);

  useEffect(() => {
    if (phase === 'connected' && mode === 'free_preview' && previewRemaining === 0) setMode('paid_pending');
  }, [phase, mode, previewRemaining]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active' && phase === 'connected') endCall('app_backgrounded'); });
    return () => subscription.remove();
  }, [phase, call]);

  async function endFailed() { setPhase('failed'); if (!call?.simulated) await callService.transition(call, 'failed', { endReason:'rtc_failure' }).catch(()=>{}); }
  const endCall = async (reason = 'caller_ended') => {
    clearInterval(timerRef.current); await rtcService.leaveSession();
    if (!call?.simulated && call && ['requesting','ringing','accepted','connecting','connected'].includes(call.status)) {
      const next = call.status === 'connected' ? 'ended' : 'cancelled';
      await callService.transition(call, next, { endedAt: new Date(), durationSeconds: duration, endedBy: 'caller', endReason: reason }).catch(()=>{});
    }
    navigation.replace('CallSummary', { duration, coinsSpent: mode === 'paid' ? quotePaidDuration(rate, Math.max(0, duration - DAILY_FREE_PREVIEW_SECONDS)) : 0, targetUserId: creator?.uid, targetUserName: creator?.username, targetUserPhoto: creator?.profilePic });
  };
  const continuePaid = () => {
    if (!canContinuePaidCall({ balance: coins, ratePerMinute: rate })) return Alert.alert('Not enough credits to continue.', 'Recharge your balance or end the call.', [{text:'End Call',style:'destructive',onPress:()=>endCall('insufficient_credits')},{text:'Recharge',onPress:()=>navigation.navigate('RechargeHub')}]);
    if (call?.simulated) setMode('paid');
    else Alert.alert('Paid calls unavailable', 'Secure server billing must be configured before paid time can begin.');
  };
  const safety = () => Alert.alert('Call safety', 'Choose an action.', [{text:'Report',onPress:()=>reportService.submit({reportedUserId:creator.uid,contextType:'call',contextId:call.callId,reason:'other',details:'Reported during video call'}).then(()=>Alert.alert('Report received'))},{text:'Block & end',style:'destructive',onPress:()=>blockService.block(creator.uid).then(()=>endCall('blocked'))},{text:'Cancel',style:'cancel'}]);
  const status = phase === 'connected' ? (mode === 'free_preview' ? `Free Preview · ${formatTime(previewRemaining)}` : mode === 'paid' ? `Paid · ${rate} credits/min` : 'Free preview ended') : phase === 'ringing' || phase === 'requesting' ? 'Calling…' : 'Connecting video…';
  return <View style={styles.container}>
    <View style={styles.remote}>{creator?.profilePic && <Image source={{uri:creator.profilePic}} style={styles.remoteImage}/>}<Text style={styles.name}>{creator?.username || 'Video call'}</Text><Text style={styles.status}>{status}</Text>{phase==='connected'&&mode==='paid'&&<Text style={styles.billing}>{formatTime(duration)} · {coins} credits · next {quoteIncrement(rate)} credits/{BILLING_INCREMENT_SECONDS}s</Text>}</View>
    {phase==='connected'&&<View style={styles.preview}><CameraView style={StyleSheet.absoluteFill} facing={front?'front':'back'} /></View>}
    {mode==='paid_pending'&&<View style={styles.decision}><Text style={styles.decisionTitle}>Free preview ended</Text><Text style={styles.decisionText}>Continue at {rate} credits/min? Billing uses {BILLING_INCREMENT_SECONDS}-second increments.</Text><TouchableOpacity style={styles.continue} onPress={continuePaid}><Text style={styles.white}>Continue</Text></TouchableOpacity><TouchableOpacity onPress={()=>endCall('preview_ended')}><Text style={styles.endText}>End Call</Text></TouchableOpacity></View>}
    <View style={styles.controls}><TouchableOpacity style={styles.control} onPress={()=>{setMuted(!muted);rtcService.setMicrophoneMuted(!muted);}}>{muted?<MicOff color="white"/>:<Mic color="white"/>}</TouchableOpacity><TouchableOpacity style={styles.control} onPress={()=>{setFront(!front);rtcService.switchCamera();}}><RefreshCw color="white"/></TouchableOpacity><TouchableOpacity style={styles.control} onPress={safety}><Flag color="white"/></TouchableOpacity><TouchableOpacity style={[styles.control,styles.hangup]} onPress={()=>endCall()}><PhoneOff color="white"/></TouchableOpacity></View>
  </View>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#0B0710'},remote:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center'},remoteImage:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',opacity:.42},name:{color:'white',fontSize:30,fontWeight:'900'},status:{color:'white',fontSize:17,fontWeight:'800',marginTop:8},billing:{color:'#FDE68A',fontWeight:'700',marginTop:8},preview:{position:'absolute',top:55,right:16,width:105,height:150,borderRadius:16,overflow:'hidden',backgroundColor:'#222'},decision:{position:'absolute',left:20,right:20,top:'34%',backgroundColor:'white',borderRadius:22,padding:22,alignItems:'center'},decisionTitle:{fontSize:22,fontWeight:'900',color:COLORS.text},decisionText:{textAlign:'center',color:COLORS.textSecondary,lineHeight:20,marginVertical:12},continue:{backgroundColor:COLORS.primary,borderRadius:22,paddingVertical:12,paddingHorizontal:38},white:{color:'white',fontWeight:'900'},endText:{color:'#DC2626',fontWeight:'900',marginTop:15},controls:{position:'absolute',bottom:45,left:18,right:18,flexDirection:'row',justifyContent:'space-around'},control:{width:56,height:56,borderRadius:28,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'},hangup:{backgroundColor:'#DC2626'}});
export default VideoCallScreen;
