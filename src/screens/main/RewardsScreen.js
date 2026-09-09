import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useUser } from '../../context/UserContext';
import { rewardsService } from '../../services/rewardsService';
import { COLORS } from '../../theme/COLORS';

const rewardDescription = (reward) => [
  reward.freeMessages > 0 && `${reward.freeMessages} free messages`,
  reward.freeVideoSeconds > 0 && `${reward.freeVideoSeconds}s free video`,
  reward.quickMatchCount > 0 && `${reward.quickMatchCount} Quick Match`,
  reward.promotionalGifts?.generic > 0 && `${reward.promotionalGifts.generic} promotional gift`,
].filter(Boolean).join(' + ');
const videoTime = (seconds) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

const RewardsScreen = () => {
  const { user } = useUser();
  const focused = useIsFocused();
  const [dashboard, setDashboard] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const consumer = user?.role === 'consumer';

  useEffect(() => {
    if (!consumer || !focused) return undefined;
    let active = true, midnightTimer;
    setDashboard(null); setRewards(null); setError('');
    const load = async () => {
      try {
        const next = await rewardsService.getDashboard();
        if (!active) return;
        setDashboard(next); setError('');
        // UI refresh only. Claim eligibility always uses the backend's UTC date.
        const nextMidnight = (Math.floor(next.serverNowMs / 86400000) + 1) * 86400000;
        midnightTimer = setTimeout(load, Math.max(250, nextMidnight - next.serverNowMs + 250));
      } catch (_) { if (active) setError('Could not load rewards. Please try again.'); }
    };
    load();
    const stop = rewardsService.subscribe((value) => { if (active) setRewards(value); },
      () => { if (active) setError('Rewards updates are unavailable. Please refresh.'); });
    return () => { active = false; clearTimeout(midnightTimer); stop(); };
  }, [consumer, user?.uid, focused, refresh]);

  if (!consumer) return null;
  const balance = rewards || dashboard?.balances;
  const checkIn = rewards?.checkIn || dashboard?.checkIn;
  const claimed = dashboard && (checkIn?.lastClaimDate === dashboard.dateKey || dashboard.alreadyClaimed || dashboard.claimed);
  const nextDay = checkIn ? checkIn.totalClaims % 7 + 1 : dashboard?.nextDay;
  const claim = async () => {
    if (claiming || claimed || !dashboard || error) return;
    setClaiming(true);
    try {
      const result = await rewardsService.claimDailyCheckIn();
      setDashboard(result);
      setRewards({ ...result.balances, checkIn: result.checkIn });
      Alert.alert(result.alreadyClaimed ? 'Already claimed today' : 'Reward claimed', rewardDescription(result.reward || {}));
    } catch (failure) { Alert.alert('Unable to claim reward', failure.message || 'Please try again.'); }
    finally { setClaiming(false); }
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Rewards &amp; Tasks</Text>
    <Text style={styles.subtitle}>Your promotional rewards are separate from Credits and cannot be withdrawn.</Text>
    {error ? <View style={styles.card}><Text style={styles.body}>{error}</Text><TouchableOpacity onPress={() => setRefresh((value) => value + 1)}><Text style={styles.link}>Try again</Text></TouchableOpacity></View> : null}
    {!dashboard ? !error && <ActivityIndicator color={COLORS.primary} accessibilityLabel="Loading rewards" /> : <>
      <View style={styles.balances}>
        {[['Free Messages', balance.freeMessages], ['Free Video Time', videoTime(balance.freeVideoSeconds)],
          ['Quick Matches', balance.quickMatchCount], ['Promotional Gifts', balance.promotionalGifts?.generic || 0]].map(([label, value]) =>
          <View style={styles.balance} key={label}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>)}
      </View>
      <Text style={styles.note}>Free Messages, Quick Matches and promotional gifts are saved for future features. Messaging remains free.</Text>
      {!dashboard.earnedVideoEnabled && <Text style={styles.note}>Earned Free Video Time is saved for later activation. The current daily call preview remains available under its existing rules.</Text>}
      <View style={styles.card}>
        <Text style={styles.heading}>Daily Check-In</Text>
        <Text style={styles.body}>Claim once per UTC day. Each claim advances one day in the seven-day sequence; missed days do not reset it.</Text>
        {dashboard.developmentDefaults && <Text style={styles.note}>Development reward schedule. Values are configurable.</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
          {dashboard.schedule.map((reward, index) => <View key={index} style={[styles.day, !claimed && nextDay === index + 1 && styles.selectedDay]}>
            <Text style={styles.dayTitle}>Day {index + 1}</Text>
            {index === 6 && <Text style={styles.dayTitle}>Bonus bundle</Text>}
            <Text style={styles.body}>{rewardDescription(reward)}</Text>
          </View>)}
        </ScrollView>
        <Text style={styles.body}>{claimed ? 'Today’s reward has been claimed.' : `Day ${nextDay} is ready to claim.`}</Text>
        {!claimed && <TouchableOpacity style={styles.claim} onPress={claim} disabled={claiming || !!error} accessibilityRole="button">
          {claiming ? <ActivityIndicator color="white" /> : <Text style={styles.claimText}>Claim daily reward</Text>}
        </TouchableOpacity>}
      </View>
    </>}
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' }, content: { padding: 18, paddingBottom: 32 },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '900' }, subtitle: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 8, marginBottom: 18 },
  balances: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  balance: { backgroundColor: 'white', width: '48%', borderRadius: 18, padding: 16, marginBottom: 12 },
  value: { color: COLORS.primary, fontSize: 24, fontWeight: '900' }, label: { color: COLORS.textSecondary, marginTop: 6 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginTop: 16 },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '800' }, body: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 8 },
  note: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 8 },
  strip: { marginVertical: 14 }, day: { width: 112, padding: 12, borderRadius: 14, backgroundColor: '#F7F7F9', marginRight: 8, borderWidth: 1, borderColor: '#E9E9ED' },
  selectedDay: { borderColor: COLORS.primary, backgroundColor: '#FFF1F4' }, dayTitle: { color: COLORS.text, fontWeight: '800' },
  claim: { backgroundColor: COLORS.primary, borderRadius: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  claimText: { color: 'white', fontWeight: '800' }, link: { color: COLORS.primary, fontWeight: '800', marginTop: 12 },
});
export default RewardsScreen;
