import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { useSessionGuard } from '../hooks/useSessionGuard';
import { isApprovedHost } from '../models/userModel';
import { quickMatchService } from '../services/quickMatchService';
import { blockService } from '../services/blockService';
import QuickMatchOfferCard from './QuickMatchOfferCard';

export default function QuickMatchListener({ enabled, suppressed = false }) {
  const { user, authenticatedSession } = useUser();
  const navigation = useNavigation(), current = useSessionGuard();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [offer, setOffer] = useState(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const dismissed = useRef(new Map());
  const eligible = enabled && foreground && isApprovedHost(user) && user?.hostStatus?.availability === 'online';
  useEffect(() => { dismissed.current.clear(); }, [authenticatedSession]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    setOffer(null); setError(false);
    if (!eligible || !current()) return undefined;
    let active = true, pending = false;
    const live = () => active && current() && AppState.currentState === 'active';
    const load = async () => {
      if (!live() || pending) return;
      pending = true;
      try {
        const result = await quickMatchService.offer();
        if (!live()) return;
        const next = result.offer;
        for (const [id, expiry] of dismissed.current) if (expiry <= Date.now()) dismissed.current.delete(id);
        if (!next || next.deadlineMs <= Date.now() || dismissed.current.has(`${next.consumerUid}:${next.requestId}`)) {
          setOffer(null); setError(false); return;
        }
        const relationship = await blockService.getRelationship(next.consumerUid);
        if (!live()) return;
        setOffer(!relationship.blocked && next.deadlineMs > Date.now() ? next : null); setError(false);
      } catch (_) { if (live()) { setOffer(null); setError(true); } }
      finally { pending = false; }
    };
    load(); const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [eligible, current, retry]);
  const dismiss = () => {
    if (!current() || !offer) return;
    dismissed.current.set(`${offer.consumerUid}:${offer.requestId}`, offer.deadlineMs);
    setOffer(previous => previous?.requestId === offer.requestId ? null : previous);
  };
  return <>
    {eligible && error && !suppressed && <TouchableOpacity onPress={() => setRetry(value => value + 1)}><Text>Quick Match offers unavailable. Tap to retry.</Text></TouchableOpacity>}
    {eligible && offer && !suppressed && <Modal transparent visible onRequestClose={() => {}}>
      <QuickMatchOfferCard key={`${offer.consumerUid}:${offer.requestId}`} offer={offer} navigation={navigation} onDismiss={dismiss} isSessionCurrent={() => current() && AppState.currentState === 'active'} />
    </Modal>}
  </>;
}
