import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MessageCircle, RefreshCw, Sparkles, UserRound, Video } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { discoveryService } from '../../services/discoveryService';
import HostCard from '../../components/HostCard';

const MatchScreen = ({ navigation }) => {
  const { user } = useUser();
  const [hosts, setHosts] = useState([]);
  const [match, setMatch] = useState(null);
  const [skipped, setSkipped] = useState([]);
  const [loading, setLoading] = useState(true);

  const findMatch = useCallback(async (nextSkipped = skipped) => {
    setLoading(true);
    try {
      const eligible = await discoveryService.getApprovedHosts({ onlineOnly: true });
      setHosts(eligible);
      setMatch(discoveryService.getBestMatch(eligible, user, nextSkipped));
    } finally { setLoading(false); }
  }, [skipped, user]);

  useFocusEffect(useCallback(() => { findMatch([]); }, [user?.uid, user?.countryCode]));

  const next = () => {
    if (!match) return findMatch([]);
    const nextSkipped = [...skipped, match.uid];
    const nextMatch = discoveryService.getBestMatch(hosts, user, nextSkipped);
    if (nextMatch) { setSkipped(nextSkipped); setMatch(nextMatch); }
    else { setSkipped([]); setMatch(discoveryService.getBestMatch(hosts, user, [])); }
  };

  if (loading) return <View style={styles.center}><Sparkles color={COLORS.primary} size={44} /><Text style={styles.finding}>Finding someone for you...</Text><ActivityIndicator color={COLORS.primary} /></View>;
  if (!match) return <View style={styles.center}><Sparkles color={COLORS.primary} size={44} /><Text style={styles.emptyTitle}>No online match right now</Text><Text style={styles.emptyText}>Approved hosts may be offline. Try again later or browse Home.</Text><TouchableOpacity style={styles.primary} onPress={() => findMatch([])}><RefreshCw color="white" /><Text style={styles.primaryText}>Try Again</Text></TouchableOpacity></View>;

  return <View style={styles.container}><Text style={styles.title}>Your Amira Match</Text><Text style={styles.subtitle}>Matching is free. Calls are not connected or billed in this batch.</Text><HostCard host={match} compact onPress={() => navigation.navigate('UserProfile', { userId: match.uid })} /><View style={styles.actions}><TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('UserProfile', { userId: match.uid })}><UserRound color={COLORS.primary} /><Text style={styles.secondaryText}>Profile</Text></TouchableOpacity><TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('ChatDetail', { userId: match.uid, name: match.username })}><MessageCircle color={COLORS.primary} /><Text style={styles.secondaryText}>Message</Text></TouchableOpacity><TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('VideoCall', { userId: match.uid, name: match.username, callRate: match.hostProfile?.videoRateCredits, demoOnly: true })}><Video color={COLORS.primary} /><Text style={styles.secondaryText}>Video</Text></TouchableOpacity></View><TouchableOpacity style={styles.primary} onPress={next}><RefreshCw color="white" /><Text style={styles.primaryText}>Next Match</Text></TouchableOpacity></View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', padding: 20, paddingTop: 58 }, center: { flex: 1, backgroundColor: '#F7F7F9', alignItems: 'center', justifyContent: 'center', padding: 30 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '900' }, subtitle: { color: COLORS.textSecondary, marginTop: 5, marginBottom: 18, lineHeight: 19 }, finding: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginVertical: 18 }, emptyTitle: { color: COLORS.text, fontSize: 23, fontWeight: '900', marginTop: 16 }, emptyText: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 8 }, secondary: { flex: 1, minHeight: 58, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: COLORS.text, fontSize: 11, fontWeight: '800', marginTop: 3 }, primary: { minHeight: 56, borderRadius: 28, backgroundColor: COLORS.primary, marginTop: 16, paddingHorizontal: 24, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: 'white', fontSize: 16, fontWeight: '900' },
});
export default MatchScreen;
