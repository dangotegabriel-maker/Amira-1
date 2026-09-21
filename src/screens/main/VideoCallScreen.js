import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Flag, Gift, MessageCircle, Mic, MicOff, PhoneOff, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { BILLING_INCREMENT_SECONDS, DAILY_FREE_PREVIEW_SECONDS, RTC_RECONNECT_GRACE_SECONDS } from '../../config/callConfig';
import { rtcService } from '../../services/rtcService';
import { callService } from '../../services/callService';
import { quoteIncrement } from '../../services/billingService';
import { getCallPaymentPresentation } from '../../services/callUiState';
import { blockService } from '../../services/blockService';
import { reportService } from '../../services/reportService';
import { useUser } from '../../context/UserContext';
import { LocalRtcVideoView, RemoteRtcVideoView } from '../../components/RtcVideoView';
import GiftTray from '../../components/GiftTray';

const { HEARTBEAT_INTERVAL_MS } = require('../../../shared/callRecoveryConfig');
const formatTime = (seconds) => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
const friendlyEnd = { rejected: 'Call declined', missed: 'Call not answered', failed: 'Unable to connect', cancelled: 'Call cancelled' };

const VideoCallScreen = ({ route, navigation }) => {
  const initialCall = route.params?.call;
  const remoteProfile = route.params?.creator || initialCall?.creator;
  const { user, coins } = useUser();
  const [call, setCall] = useState(initialCall);
  const [phase, setPhase] = useState(initialCall?.status || 'ringing');
  const [muted, setMuted] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);
  const [rtcReady, setRtcReady] = useState(false);
  const [clockReady, setClockReady] = useState(initialCall?.simulated === true);
  const [giftOpen,setGiftOpen]=useState(false),[giftNotice,setGiftNotice]=useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const clockOffset = useRef(0), syncPending = useRef(false), lastSync = useRef(0);
  const rtcEvidence = useRef(false), eventSequence = useRef(0), eventQueue = useRef(Promise.resolve());
  const reportConnection = (state) => {
    eventQueue.current = eventQueue.current.catch(() => {}).then(async () => {
      const current = callRef.current;
      if (endedRef.current || ![2,3].includes(current?.accountingVersion) || !['connected','reconnecting'].includes(current.status)) return;
      if (state === 'connected' && !rtcEvidence.current) return;
      const sequence = ++eventSequence.current;
      const value = await callService.reportConnection(current.callId || current.id, { state, sequence, epoch: current.connection.epoch });
      if (!endedRef.current && (value.lifecycleRevision || 0) >= (callRef.current?.lifecycleRevision || 0)) { callRef.current = value; setCall(value); setPhase(value.status); }
    }).catch(() => {});
    return eventQueue.current;
  };
  const reconnectRef = useRef(), joinedRef = useRef(false), endedRef = useRef(false);
  const callRef = useRef(call), finishRef = useRef(), syncRef = useRef();
  callRef.current = call;
  const mode = call?.billingMode;
  const isConsumer = call?.simulated ? user?.role === 'consumer' : user?.uid === call?.callerId;
  // Production calls always display and bill their server-captured snapshot.
  const rate = call?.economicsSnapshot?.consumerRatePerMinute ?? call?.ratePerMinute;
  const payment = getCallPaymentPresentation(call, nowMs);
  const paymentPaused = phase === 'reconnecting' || payment.mediaPaused || (mode !== 'paid' && !clockReady);
  const duration = [2,3].includes(call?.accountingVersion) ? Math.floor(((call.connection?.connectedMs || 0) + (call.connection?.state === 'connected' ? Math.max(0, Math.min(nowMs, call.connection.leaseUntilMs) - call.connection.segmentStartedAtMs) : 0)) / 1000) : call?.connectedAtMs ? Math.max(0, Math.floor((nowMs - call.connectedAtMs) / 1000)) : 0;
  const previewRemaining = payment.previewRemaining ?? DAILY_FREE_PREVIEW_SECONDS;
  const giftTimer=useRef();
  useEffect(()=>()=>clearTimeout(giftTimer.current),[]);
  useEffect(()=>{if(phase!=='connected')setGiftOpen(false);},[phase]);
  const acknowledgeGift=(gift)=>{setGiftNotice(gift);clearTimeout(giftTimer.current);giftTimer.current=setTimeout(()=>setGiftNotice(null),2500);};

  const finish = async (reason = 'participant_ended') => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearTimeout(reconnectRef.current);
    await rtcService.leaveSession().catch(() => {});
    const current = callRef.current;
    let result = { durationSeconds: current?.durationSeconds ?? duration, billedCredits: current?.billedCredits || 0 };
    if (!current?.simulated) result = await callService.end(current.callId || current.id, reason).catch(() => result);
    navigation.replace('CallSummary', {
      callId: current?.simulated ? undefined : current?.callId || current?.id,
      duration: result.durationSeconds ?? duration, coinsSpent: result.billedCredits ?? 0,
      isConsumer, targetUserId: remoteProfile?.uid || (isConsumer ? current?.receiverId : current?.callerId), targetUserName: remoteProfile?.username,
      targetUserPhoto: remoteProfile?.profilePic,
    });
  };
  finishRef.current = finish;
  syncRef.current = async () => {
    const current = callRef.current;
    if (current?.simulated || syncPending.current || endedRef.current) return;
    syncPending.current = true;
    lastSync.current = Date.now();
    try {
      const state = await callService.syncPaymentState(current.callId || current.id);
      if (endedRef.current) return;
      clockOffset.current = state.serverNowMs - Date.now();
      setClockReady(true);
      setNowMs(state.serverNowMs);
      // Firestore remains the mode authority; an older callable response must
      // never overwrite a newer paid/ended snapshot.
    } catch (_) {
      // Retry while the call remains mounted. Expired previews stay muted.
      if (getCallPaymentPresentation(callRef.current, Date.now() + clockOffset.current).decisionExpired) {
        finishRef.current('payment_decision_timeout');
      }
    } finally { syncPending.current = false; }
  };

  useEffect(() => {
    if (!initialCall?.callId && !initialCall?.id) {
      Alert.alert('Video call unavailable', 'Please start the call again.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      return undefined;
    }
    let unsubscribe = () => {}, simTimer, active = true;
    const beginGrace = (reason) => {
      rtcEvidence.current = false;
      reportConnection('disconnected');
      setPhase('reconnecting');
      if (reconnectRef.current) return;
      clearTimeout(reconnectRef.current);
      reconnectRef.current = setTimeout(() => finishRef.current(reason), RTC_RECONNECT_GRACE_SECONDS * 1000);
    };
    const off = rtcService.subscribe(async (event) => {
      if (!active || endedRef.current) return;
      if (event.type === 'remoteJoined') {
        clearTimeout(reconnectRef.current); reconnectRef.current = null;
        rtcEvidence.current = true;
        setRemoteUid(event.uid);
        if (!callRef.current?.simulated) {
          if (callRef.current?.connection) await reportConnection('connected');
          else await callService.acknowledgeConnected(callRef.current.callId || callRef.current.id).catch(() => {});
          if (callRef.current?.status === 'connected') setPhase('connected');
        } else {
          const connectedAtMs = Date.now();
          setCall((current) => ({ ...current, status: 'connected', billingMode: 'preview', connectedAtMs,
            previewEndsAtMs: connectedAtMs + DAILY_FREE_PREVIEW_SECONDS * 1000 }));
          setPhase('connected');
        }
      }
      if (event.type === 'remoteLeft') { setRemoteUid(null); beginGrace('remote_left'); }
      if (event.type === 'connectionLost') beginGrace('connection_lost');
      if (event.type === 'reconnected' && rtcService.getRemoteUid()) { rtcEvidence.current = true; clearTimeout(reconnectRef.current); reconnectRef.current = null; reportConnection('connected'); }
      if (event.type === 'error') finishRef.current('rtc_failure');
    });
    if (initialCall?.simulated) {
      simTimer = setTimeout(async () => {
        try {
          setPhase('connecting');
          await rtcService.requestPermissions();
          await rtcService.joinSession({ simulated: true });
          joinedRef.current = true;
          if (active) setRtcReady(true);
        } catch (error) {
          Alert.alert('Video call unavailable', error.message, [{ text: 'OK', onPress: () => finishRef.current('permission_denied') }]);
        }
      }, 900);
    } else {
      unsubscribe = callService.subscribe(initialCall.callId || initialCall.id, (next) => {
        if (!active || endedRef.current) return;
        if (next.accountingVersion === 2 && (next.lifecycleRevision || 0) < (callRef.current?.lifecycleRevision || 0)) return;
        callRef.current = next;
        eventSequence.current = Math.max(eventSequence.current, next.connection?.participants?.[user?.uid]?.sequence || 0);
        setCall(next);
        setPhase(next.status);
        if (['connecting', 'connected', 'reconnecting'].includes(next.status) && !joinedRef.current) {
          joinedRef.current = true;
          (async () => {
            try {
              await rtcService.requestPermissions();
              if (!active || endedRef.current) return;
              const credentials = await callService.getRtcCredentials(next.callId || next.id);
              if (!active || endedRef.current) return;
              await rtcService.joinSession(credentials);
              if (active && !endedRef.current) setRtcReady(true);
              else await rtcService.leaveSession();
            } catch (error) {
              Alert.alert('Unable to connect', error.message, [{ text: 'End Call', onPress: () => finishRef.current('rtc_failure') }]);
            }
          })();
        }
        if (friendlyEnd[next.status]) {
          endedRef.current = true;
          rtcService.leaveSession().catch(() => {});
          Alert.alert(friendlyEnd[next.status], 'The video call has ended.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        }
        if (next.status === 'ended') finishRef.current(next.endReason || 'remote_ended');
      });
    }
    return () => {
      active = false;
      clearTimeout(simTimer);
      clearTimeout(reconnectRef.current);
      unsubscribe();
      off();
      rtcService.leaveSession().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (![2,3].includes(call?.accountingVersion) || !['connecting','connected','reconnecting'].includes(call?.status)) return undefined;
    const timer = setInterval(() => { if (rtcEvidence.current && !endedRef.current) { if (callRef.current.status === 'connecting') callService.acknowledgeConnected(callRef.current.callId || callRef.current.id).catch(() => {}); else reportConnection('connected'); } }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [call?.accountingVersion, call?.status]);

  useEffect(() => {
    if (call?.status !== 'connected') return undefined;
    if (!call.simulated && mode !== 'paid') syncRef.current();
    const timer = setInterval(() => {
      if (endedRef.current) return;
      const current = callRef.current, now = Date.now() + clockOffset.current;
      setNowMs(now);
      const state = getCallPaymentPresentation(current, now);
      if (current.simulated && current.billingMode === 'preview' && state.previewRemaining === 0) {
        setCall((value) => ({ ...value, billingMode: coins >= quoteIncrement(rate) ? 'paid' : 'ended', paidStartedAtMs: Date.now() }));
      } else if (!current.simulated && current.billingMode !== 'paid'
          && (!clockReady || state.mediaPaused || current.freeVideoSource === 'consumer_rewards') && Date.now() - lastSync.current >= 2000) {
        syncRef.current();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [call?.status, call?.simulated, mode, clockReady]);

  useEffect(() => {
    if (!rtcReady || endedRef.current) return;
    // Existing Agora mute methods preserve channel membership and camera choice.
    Promise.all([
      rtcService.setMicrophoneMuted(paymentPaused || muted),
      rtcService.setCameraEnabled(!paymentPaused),
    ]).catch(() => finishRef.current('media_pause_failed'));
  }, [rtcReady, paymentPaused, muted]);

  useEffect(() => {
    if (phase !== 'connected' || mode !== 'paid' || call?.simulated) return undefined;
    const timer = setInterval(() => {
      if (!endedRef.current) callService.settleIncrement(call.callId || call.id).catch(() => {});
      // Insufficient-credit mode/deadline arrive through the call snapshot.
    }, BILLING_INCREMENT_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [phase, mode, call?.callId, call?.id, call?.simulated]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && ['connected', 'reconnecting'].includes(phase)) finishRef.current('app_backgrounded');
    });
    return () => sub.remove();
  }, [phase]);

  const safety = () => Alert.alert('Call safety', 'Choose an action.', [
    { text: 'Report', onPress: () => reportService.submit({ reportedUserId: remoteProfile.uid, contextType: 'call',
      contextId: call.callId, reason: 'other', details: 'Reported during video call' }).then(() => Alert.alert('Report received')) },
    { text: 'Block & end', style: 'destructive', onPress: () => blockService.block(remoteProfile.uid).then(() => finish('blocked')) },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const waitingText = 'Checking automatic paid continuation';
  const status = phase === 'connected'
    ? (mode === 'preview' ? (call?.freeVideoSource === 'consumer_rewards' ? 'FREE VIDEO TIME · ' : 'FREE PREVIEW · ') + formatTime(previewRemaining)
      : mode === 'paid' ? 'PAID · ' + rate + ' credits/min' : isConsumer ? 'Payment decision' : waitingText)
    : phase === 'ringing' ? 'Calling…' : phase === 'reconnecting' ? 'Connection interrupted…' : 'Connecting video…';

  return <View style={styles.container}>
    <View style={styles.remote}>
      {remoteUid ? <RemoteRtcVideoView uid={remoteUid} style={StyleSheet.absoluteFill} />
        : remoteProfile?.profilePic && <Image source={{ uri: remoteProfile.profilePic }} style={styles.remoteImage} />}
      <View style={styles.heading}>
        <Text style={styles.name}>{remoteProfile?.username || 'Video call'}</Text>
        <Text style={styles.status}>{status}</Text>
        <Text style={styles.rate}>{rate} credits/min</Text>
        {phase === 'connected' && mode === 'paid' && <Text style={styles.billing}>
          {formatTime(duration)}{isConsumer ? ' · ' + coins + ' credits · next ' + quoteIncrement(rate) + ' credits/' + BILLING_INCREMENT_SECONDS + 's' : ''}
        </Text>}
      </View>
    </View>
    {rtcReady && <LocalRtcVideoView style={styles.preview} />}
    {paymentPaused && ['connected', 'reconnecting'].includes(phase) && <View style={styles.decision}>
      <Text style={styles.decisionTitle}>
        {payment.decisionExpired ? 'Payment decision expired' : isConsumer
          ? (payment.awaiting ? 'Starting paid continuation…' : 'Confirming free-time status…') : waitingText}
      </Text>
      <Text style={styles.decisionText}>Audio and video are paused.</Text>
      {isConsumer && payment.awaiting && !payment.decisionExpired && <Text style={styles.decisionText}>{rate} credits/min · Billing starts automatically in {BILLING_INCREMENT_SECONDS}-second increments when funding is available.</Text>}
      {payment.decisionExpired && <Text style={styles.decisionText}>This call can no longer continue.</Text>}
      <TouchableOpacity onPress={() => finish('preview_ended')}><Text style={styles.endText}>End Call</Text></TouchableOpacity>
    </View>}
    {giftNotice&&<View accessibilityLiveRegion="polite" style={styles.giftNotice}><Text style={styles.giftNoticeIcon}>{giftNotice.asset?.kind==='emoji'?giftNotice.asset.key:'🎁'}</Text><Text style={styles.giftNoticeText}>{giftNotice.name} sent</Text></View>}
    <View style={styles.controls}>
      <TouchableOpacity style={styles.control} onPress={() => setMuted(!muted)}>
        {muted || paymentPaused ? <MicOff color="white" /> : <Mic color="white" />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.control} onPress={() => rtcService.switchCamera()}><RefreshCw color="white" /></TouchableOpacity>
      <TouchableOpacity disabled={phase!=='connected'} style={styles.control} onPress={()=>navigation.navigate('ChatDetail',{userId:remoteProfile?.uid,name:remoteProfile?.username})} accessibilityLabel="Open Call Chat"><MessageCircle color="white" /></TouchableOpacity>
      {isConsumer&&phase==='connected'&&<TouchableOpacity style={styles.control} onPress={()=>setGiftOpen(true)} accessibilityLabel="Send Gift"><Gift color="white" /></TouchableOpacity>}
      <TouchableOpacity style={styles.control} onPress={safety} accessibilityLabel="Call safety"><Flag color="white" /></TouchableOpacity>
      <TouchableOpacity style={[styles.control, styles.hangup]} onPress={() => finish()} accessibilityLabel="End Call"><PhoneOff color="white" /></TouchableOpacity>
    </View>
    <GiftTray visible={giftOpen} onClose={()=>setGiftOpen(false)} hostUid={call?.receiverId} source="video_call" callId={call?.callId||call?.id} onGiftSent={acknowledgeGift}/>
  </View>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#0B0710'},remote:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center'},remoteImage:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',opacity:.42},heading:{alignItems:'center',backgroundColor:'rgba(0,0,0,.28)',padding:12,borderRadius:16},name:{color:'white',fontSize:30,fontWeight:'900'},status:{color:'white',fontSize:17,fontWeight:'800',marginTop:8},rate:{color:'#FDE68A',fontWeight:'800',marginTop:5},billing:{color:'#FDE68A',fontWeight:'700',marginTop:8},preview:{position:'absolute',top:55,right:16,width:105,height:150,borderRadius:16},decision:{position:'absolute',left:20,right:20,top:'34%',backgroundColor:'white',borderRadius:22,padding:22,alignItems:'center'},decisionTitle:{fontSize:22,fontWeight:'900',color:COLORS.text},decisionText:{textAlign:'center',color:COLORS.textSecondary,lineHeight:20,marginVertical:12},continue:{backgroundColor:COLORS.primary,borderRadius:22,paddingVertical:12,paddingHorizontal:38},white:{color:'white',fontWeight:'900'},endText:{color:'#DC2626',fontWeight:'900',marginTop:15},giftNotice:{position:'absolute',top:'20%',alignSelf:'center',backgroundColor:'rgba(0,0,0,.78)',borderRadius:20,paddingHorizontal:24,paddingVertical:14,alignItems:'center'},giftNoticeIcon:{fontSize:34},giftNoticeText:{color:'white',fontWeight:'900',marginTop:4},controls:{position:'absolute',bottom:45,left:8,right:8,flexDirection:'row',justifyContent:'space-around'},control:{width:50,height:50,borderRadius:25,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'},hangup:{backgroundColor:'#DC2626'}});
export default VideoCallScreen;
