import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';

import { isApprovedHost } from '../../models/userModel';
import { hostEarningsService } from '../../services/hostEarningsService';

const HostEarningsScreen = () => {
  const { user } = useUser();
  const approvedHost = isApprovedHost(user);
  const [earnings, setEarnings] = useState(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    setEarnings(null); setError(false);
    if (!approvedHost) return undefined;
    let active = true;
    const fail = () => { if (active) { setEarnings(null); setError(true); } };
    let stop = () => {};
    try { stop = hostEarningsService.subscribe((value) => { if (active) { setEarnings(value); setError(false); } }, fail); }
    catch (_) { fail(); }
    return () => { active = false; stop(); };
  }, [user?.uid, approvedHost, retry]);
  if (!approvedHost) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Earnings</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Pending Earnings</Text>
        {error ? <><Text style={styles.note}>Unable to load earnings.</Text><TouchableOpacity onPress={() => setRetry((value) => value + 1)}><Text style={styles.note}>Try again</Text></TouchableOpacity></>
          : earnings ? <Text style={styles.value}>{earnings.pendingCreditsEquivalent.toLocaleString()} credit equivalent</Text>
            : <ActivityIndicator accessibilityLabel="Loading earnings" color={COLORS.primary} /> }
        <Text style={styles.note}>Internal accounting only. Cash conversion and withdrawals are not available.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', padding: 20, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 22 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24 },
  label: { color: COLORS.textSecondary, fontSize: 15 },
  value: { color: COLORS.text, fontSize: 32, fontWeight: '900', marginTop: 8 },
  note: { color: COLORS.textSecondary, marginTop: 20, lineHeight: 20 },
});

export default HostEarningsScreen;
