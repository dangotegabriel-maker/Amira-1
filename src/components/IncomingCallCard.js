import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../theme/COLORS';
import { blockService } from '../services/blockService';
import { callService } from '../services/callService';
import { publicIdentityService } from '../services/publicIdentityService';
import { useUser } from '../context/UserContext';
import { AmiraLevelBadge } from './AmiraLevelBadge';

const alwaysCurrent = () => true;
const IncomingCallCard = ({ call, navigation, onDismiss, isSessionCurrent = alwaysCurrent }) => {
  const responseLock = useRef(false);
  const {user} = useUser();
  const [identityError,setIdentityError]=useState(false);
  const [identityVersion,setIdentityVersion]=useState(0);
  const [callerRecord, setCallerRecord] = useState(null);
  const caller = callerRecord?.ownerUid===user?.uid && callerRecord?.callId===(call?.callId || call?.id) ? callerRecord.profile : null;
  const setCaller = profile => setCallerRecord(profile ? {ownerUid:user?.uid,callId,profile} : null);
  const [responding, setResponding] = useState(false);

  const callId = call?.callId || call?.id;

  useEffect(() => {
    let alive=true; setCaller(null); setIdentityError(false);
    if (callId) publicIdentityService.calls([callId]).then(items=>{if(alive && isSessionCurrent()) {
      if (items[0]?.canInteract === false) { onDismiss?.(); return; }
      setCaller(items[0]?.identity || null);setIdentityError(!items[0]?.identity);
    }})
      .catch(()=>{if(alive && isSessionCurrent()) setIdentityError(true);});
    return ()=>{alive=false;};
  }, [callId,user?.uid,identityVersion,isSessionCurrent,onDismiss]);

  useEffect(() => {
    const expiresAtMs = Number(call?.expiresAtMs || 0);

    if (!expiresAtMs) return undefined;

    const remainingMs = expiresAtMs - Date.now();

    if (remainingMs <= 0) {
      onDismiss?.();
      return undefined;
    }

    const timer = setTimeout(() => {
      onDismiss?.();
    }, remainingMs + 250);

    return () => clearTimeout(timer);
  }, [callId, call?.expiresAtMs, onDismiss]);

  const handleExpiredCall = (error) => {
    const message = String(error?.message || '');

    if (
      message.includes('can no longer be answered') ||
      message.includes('not-ringable') ||
      message.includes('expired')
    ) {
      onDismiss?.();
      return true;
    }

    return false;
  };

  const decline = async () => {
    if (responseLock.current || !callId || !isSessionCurrent()) return;
    if (call?.expiresAtMs && call.expiresAtMs <= Date.now()) { onDismiss?.(); return; }
    responseLock.current = true;

    setResponding(true);

    try {
      await callService.respond({
        callId,
        action: 'decline',
      });

      if (isSessionCurrent()) onDismiss?.();
    } catch (error) {
      if (isSessionCurrent() && !handleExpiredCall(error)) {
        Alert.alert(
          'Could not decline call',
          error?.message || 'Please try again.',
        );
      }
    } finally {
      responseLock.current = false;
      if (isSessionCurrent()) setResponding(false);
    }
  };

  const accept = async () => {
    if (responseLock.current || !callId || !isSessionCurrent()) return;
    if (call?.expiresAtMs && call.expiresAtMs <= Date.now()) { onDismiss?.(); return; }
    responseLock.current = true;

    setResponding(true);

    try {
      const relationship = await blockService.getRelationship(call.callerId);
      if (!isSessionCurrent()) return;
      if (relationship.blocked) { onDismiss?.(); return; }
      if (call?.expiresAtMs && call.expiresAtMs <= Date.now()) { onDismiss?.(); return; }
      const accepted = await callService.respond({
        callId,
        action: 'accept',
      });

      if (!isSessionCurrent()) return;
      onDismiss?.();

      navigation.navigate('VideoCall', {
        call: {
          ...call,
          ...accepted,
        },
        creator: caller,
      });
    } catch (error) {
      if (isSessionCurrent() && !handleExpiredCall(error)) {
        Alert.alert(
          'Could not answer call',
          error?.message || 'Please try again.',
        );
      }
    } finally {
      responseLock.current = false;
      if (isSessionCurrent()) setResponding(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {caller?.profilePic ? (
          <Image
            source={{ uri: caller.profilePic }}
            style={styles.avatar}
          />
        ) : null}

        <Text style={styles.label}>Incoming video call</Text>

        <Text style={styles.name}>
          {caller?.username || (identityError ? 'Caller identity unavailable' : 'Incoming call')}
          {identityError && <Text onPress={()=>setIdentityVersion(n=>n+1)}> Retry</Text>}
        </Text>

        <View style={styles.identityBadges}>
          {Number.isInteger(caller?.level)&&caller.level>=0&&caller.level<=10?<AmiraLevelBadge level={caller.level}/>:null}
          {caller?.vipActive===true?<Text accessibilityLabel="VIP caller" style={styles.vip}>VIP</Text>:null}
        </View>
        {caller?.countryName ? (
          <Text style={styles.country}>
            {caller.countryName}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.decline,
              responding && styles.disabled,
            ]}
            onPress={decline}
            disabled={responding}
          >
            <Text style={styles.white}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.accept,
              responding && styles.disabled,
            ]}
            onPress={accept}
            disabled={responding}
          >
            {responding ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.white}>Accept</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
  },
  label: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  name: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 5,
  },
  country: {
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  identityBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  vip: { color: '#B7791F', backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '900' },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  decline: {
    backgroundColor: '#DC2626',
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 28,
    minWidth: 110,
    alignItems: 'center',
  },
  accept: {
    backgroundColor: '#16A34A',
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 30,
    minWidth: 110,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  white: {
    color: 'white',
    fontWeight: '900',
  },
});

export default IncomingCallCard;
