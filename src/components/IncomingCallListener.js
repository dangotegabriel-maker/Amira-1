import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { isApprovedHost } from '../models/userModel';
import { callService } from '../services/callService';
import { blockService } from '../services/blockService';
import IncomingCallCard from './IncomingCallCard';

// One owner above the root stack; route focus never owns this subscription.
export default function IncomingCallListener({ children, enabled }) {
  const { user, authenticatedSession: session } = useUser();
  const navigation = useNavigation();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const mounted = useRef(false);
  const dismissed = useMemo(() => new Map(), [session]);
  const responseCurrent = useCallback(() => mounted.current && Boolean(session?.isCurrent()), [session]);
  const eligible = enabled && isApprovedHost(user) && user?.hostStatus?.availability === 'online';

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { mounted.current = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    setEntry(null); setError(null);
    if (!eligible || !foreground || !session?.isCurrent()) return undefined;
    let alive = true, version = 0, candidateId = null;
    for (const [id, expiry] of dismissed) if (expiry <= Date.now()) dismissed.delete(id);
    const current = () => alive && session.isCurrent() && AppState.currentState === 'active';
    const failed = () => {
      if (!current()) return;
      version++; candidateId = null; setEntry(null); setError(session);
    };
    const stop = callService.subscribeIncoming(user.uid, async call => {
      if (!current()) return;
      const id = call?.callId || call?.id;
      if (!id || call.receiverId !== user.uid || call.status !== 'ringing'
        || Number(call.expiresAtMs) <= Date.now() || dismissed.has(id)) {
        version++; candidateId = null; setEntry(null); return;
      }
      if (candidateId === id) return;
      candidateId = id;
      const request = ++version;
      setEntry(null);
      try {
        const relationship = await blockService.getRelationship(call.callerId);
        if (!current() || request !== version) return;
        if (relationship.blocked || Number(call.expiresAtMs) <= Date.now()) return;
        setError(null);
        setEntry({ call, session, current, dismiss: () => {
          if (!current()) return;
          dismissed.set(id, Number(call.expiresAtMs) || Date.now());
          setEntry(previous => (previous?.call.callId || previous?.call.id) === id ? null : previous);
        } });
      } catch (_) { if (request === version) failed(); }
    }, failed);
    return () => { alive = false; version++; stop(); };
  }, [eligible, foreground, session, user?.uid, retry, dismissed]);

  const visible = eligible && foreground && entry?.session === session && session?.isCurrent();
  return <View style={{ flex: 1 }}>{children}
    {error === session && session?.isCurrent() && eligible && foreground &&
      <TouchableOpacity accessibilityRole="button" onPress={() => setRetry(value => value + 1)}>
        <Text accessibilityRole="alert">Incoming calls unavailable. Tap to retry.</Text>
      </TouchableOpacity>}
    {visible && <Modal transparent visible onRequestClose={() => {}}>
      <IncomingCallCard key={entry.call.callId || entry.call.id} call={entry.call}
        navigation={navigation} onDismiss={entry.dismiss} isSessionCurrent={responseCurrent} />
    </Modal>}
  </View>;
}
