import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Flag, Mic, MicOff, PhoneOff, RefreshCw } from 'lucide-react-native';
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
  const [confirming, setConfirming] = useState(false);
  const [clockReady, setClockReady] = useState(initialCall?.simulated === true);
  const [nowMs, setNowMs] = useState(Date.now());
  const clockOffset = useRef(0), syncPending = useRef(false), lastSync = useRef(0);
  const reconnectRef = useRef(), joinedRef = useRef(false), endedRef = useRef(false);
  const callRef = useRef(call), finishRef = useRef(), syncRef = useRef();
  callRef.current = call;
  const mode = call?.billingMode;
  const isConsumer = call?.simulated ? user?.role === 'consumer' : user?.uid === call?.callerId;
  // Production calls always display and bill their server-captured snapshot.
  const rate = call?.ratePerMinute;
  const payment = getCallPaymentPresentation(call, nowMs);
  const paymentPaused = payment.mediaPaused || (mode !== 'paid' && !clockReady);
  const duration = call?.connectedAtMs ? Math.max(0, Math.floor((nowMs - call.connectedAtMs) / 1000)) : 0;
  const previewRemaining = payment.previewRemaining ?? DAILY_FREE_PREVIEW_SECONDS;

  const finish = async (reason = 'participant_ended') => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearTimeout(reconnectRef.current);
    await rtcService.leaveSession().catch(() => {});
    const current = callRef.current;
    let result = { durationSeconds: current?.durationSeconds ?? duration, billedCredits: current?.billedCredits || 0 };
    if (!current?.simulated) result = await callService.end(current.callId || current.id, reason).catch(() => result);
    navigation.replace('CallSummary', {
      duration: result.durationSeconds ?? duration, coinsSpent: result.billedCredits ?? 0,
      isConsumer, targetUserId: remoteProfile?.uid, targetUserName: remoteProfile?.username,
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
    let unsubscribe = () => {}, simTimer, active = true;
    const beginGrace = (reason) => {
      setPhase('reconnecting');
      clearTimeout(reconnectRef.current);
      reconnectRef.current = setTimeout(() => finishRef.current(reason), RTC_RECONNECT_GRACE_SECONDS * 1000);
    };
    const off = rtcService.subscribe(async (event) => {
      if (!active || endedRef.current) return;
      if (event.type === 'remoteJoined') {
        clearTimeout(reconnectRef.current);
        setRemoteUid(event.uid);
        if (!callRef.current?.simulated) {
          await callService.acknowledgeConnected(callRef.current.callId || callRef.current.id).catch(() => {});
          if (callRef.current?.status === 'connected') setPhase('connected');
        } else {
          const connectedAtMs = Date.now();
          setCall((current) => ({ ...current, status: 'connected', billingMode: 'preview', connectedAtMs,
            previewEndsAtMs: connectedAtMs + DAILY_FREE_PREVIEW_SECONDS * 1000 }));
          setPhase('connected');
        }
      }
      if (event.type === 'remoteLeft') beginGrace('remote_left');
      if (event.type === 'connectionLost') beginGrace('connection_lost');
      if (event.type === 'reconnected') { clearTimeout(reconnectRef.current); setPhase('connected'); }
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
        callRef.current = next;
        setCall(next);
        setPhase(next.status);
        if (['connecting', 'connected'].includes(next.status) && !joinedRef.current) {
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
    if (call?.status !== 'connected') return undefined;
    if (!call.simulated && mode !== 'paid') syncRef.current();
    const timer = setInterval(() => {
      if (endedRef.current) return;
      const current = callRef.current, now = Date.now() + clockOffset.current;
      setNowMs(now);
      const state = getCallPaymentPresentation(current, now);
      if (current.simulated && current.billingMode === 'preview' && state.previewRemaining === 0) {
        setCall((value) => ({ ...value, billingMode: 'awaiting_paid_confirmation' }));
      } else if (!current.simulated && current.billingMode !== 'paid'
          && (!clockReady || state.mediaPaused) && Date.now() - lastSync.current >= 2000) {
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

  const continuePaid = async () => {
    if (!isConsumer || confirming || mode !== 'awaiting_paid_confirmation' || payment.decisionExpired) return;
    setConfirming(true);
    try {
      if (call?.simulated) {
        if (coins < quoteIncrement(rate)) throw new Error('Not enough credits to continue.');
        setCall((current) => ({ ...current, billingMode: 'paid', paidStartedAtMs: Date.now() }));
      } else {
        await callService.confirmPaid(call.callId || call.id);
        // Only a persisted paid snapshot restores media.
      }
    } catch (error) {
      const insufficient = error.details?.reason === 'insufficient_credits' || /enough credits/i.test(error.message);
      Alert.alert(insufficient ? 'Not enough credits to continue' : 'Unable to continue', error.message);
      syncRef.current();
    } finally { setConfirming(false); }
  };
  const safety = () => Alert.alert('Call safety', 'Choose an action.', [
    { text: 'Report', onPress: () => reportService.submit({ reportedUserId: remoteProfile.uid, contextType: 'call',
      contextId: call.callId, reason: 'other', details: 'Reported during video call' }).then(() => Alert.alert('Report received')) },
    { text: 'Block & end', style: 'destructive', onPress: () => blockService.block(remoteProfile.uid).then(() => finish('blocked')) },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const waitingText = 'Waiting for ' + (remoteProfile?.username || 'the consumer') + ' to continue';
  const status = phase === 'connected'
    ? (mode === 'preview' ? 'FREE PREVIEW · ' + formatTime(previewRemaining)
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
          ? (payment.awaiting ? 'Continue Paid?' : 'Confirming preview status…') : waitingText}
      </Text>
      <Text style={styles.decisionText}>Audio and video are paused.</Text>
      {isConsumer && payment.awaiting && !payment.decisionExpired && <>
        <Text style={styles.decisionText}>{rate} credits/min · {coins} credits available. Billing uses {BILLING_INCREMENT_SECONDS}-second increments.</Text>
        <TouchableOpacity style={styles.continue} onPress={continuePaid} disabled={confirming}>
          <Text style={styles.white}>{confirming ? 'Confirming…' : 'Continue Paid'}</Text>
        </TouchableOpacity>
      </>}
      {payment.decisionExpired && <Text style={styles.decisionText}>This call can no longer continue.</Text>}
      <TouchableOpacity onPress={() => finish('preview_ended')}><Text style={styles.endText}>End Call</Text></TouchableOpacity>
    </View>}
    <View style={styles.controls}>
      <TouchableOpacity style={styles.control} onPress={() => setMuted(!muted)}>
        {muted || paymentPaused ? <MicOff color="white" /> : <Mic color="white" />}
      </TouchableOpacity>
      <TouchableOpacity style={styles.control} onPress={() => rtcService.switchCamera()}><RefreshCw color="white" /></TouchableOpacity>
      <TouchableOpacity style={styles.control} onPress={safety} accessibilityLabel="Call safety"><Flag color="white" /></TouchableOpacity>
      <TouchableOpacity style={[styles.control, styles.hangup]} onPress={() => finish()} accessibilityLabel="End Call"><PhoneOff color="white" /></TouchableOpacity>
    </View>
  </View>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#0B0710'},remote:{...StyleSheet.absoluteFillObject,alignItems:'center',justifyContent:'center'},remoteImage:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',opacity:.42},heading:{alignItems:'center',backgroundColor:'rgba(0,0,0,.28)',padding:12,borderRadius:16},name:{color:'white',fontSize:30,fontWeight:'900'},status:{color:'white',fontSize:17,fontWeight:'800',marginTop:8},rate:{color:'#FDE68A',fontWeight:'800',marginTop:5},billing:{color:'#FDE68A',fontWeight:'700',marginTop:8},preview:{position:'absolute',top:55,right:16,width:105,height:150,borderRadius:16},decision:{position:'absolute',left:20,right:20,top:'34%',backgroundColor:'white',borderRadius:22,padding:22,alignItems:'center'},decisionTitle:{fontSize:22,fontWeight:'900',color:COLORS.text},decisionText:{textAlign:'center',color:COLORS.textSecondary,lineHeight:20,marginVertical:12},continue:{backgroundColor:COLORS.primary,borderRadius:22,paddingVertical:12,paddingHorizontal:38},white:{color:'white',fontWeight:'900'},endText:{color:'#DC2626',fontWeight:'900',marginTop:15},controls:{position:'absolute',bottom:45,left:18,right:18,flexDirection:'row',justifyContent:'space-around'},control:{width:56,height:56,borderRadius:28,backgroundColor:'rgba(255,255,255,.2)',alignItems:'center',justifyContent:'center'},hangup:{backgroundColor:'#DC2626'}});
export default VideoCallScreen;
