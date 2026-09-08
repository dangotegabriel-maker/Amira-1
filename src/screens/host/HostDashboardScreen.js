import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { followService } from '../../services/followService';
import { COLORS } from '../../theme/COLORS';
import { dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';
import { isApprovedHost } from '../../models/userModel';
import { callService } from '../../services/callService';
import { discoveryService } from '../../services/discoveryService';
import { getCountryByCode } from '../../data/countries';
import IncomingCallCard from '../../components/IncomingCallCard';

const HostDashboardScreen = ({ navigation }) => {
  const { user } = useUser();
  const [updating, setUpdating] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [consumers, setConsumers] = useState([]);
  const [loadingConsumers, setLoadingConsumers] = useState(true);
  const [consumerError, setConsumerError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [discoveryTab, setDiscoveryTab] = useState('For You');
  const [followerCount, setFollowerCount] = useState(null);
  const [followerError, setFollowerError] = useState(false);
  const isFocused = useIsFocused();
  const approvedHost = isApprovedHost(user);

  useEffect(() => {
    if (!approvedHost || !user?.uid || !isFocused) return undefined;
    let cancelled = false;
    setLoadingConsumers(true);
    setConsumerError('');
    setConsumers([]);
    const loadConsumers = discoveryTab === 'Following'
      ? discoveryService.getFollowingConsumers : discoveryService.getConsumersForHosts;
    loadConsumers(user.uid)
      .then((profiles) => { if (!cancelled) setConsumers(profiles); })
      .catch(() => {
        if (!cancelled) {
          setConsumers([]);
          setConsumerError('Could not load people right now. Please try again.');
        }
      })
      .finally(() => { if (!cancelled) setLoadingConsumers(false); });
    return () => { cancelled = true; };
  }, [user?.uid, approvedHost, refreshVersion, discoveryTab, isFocused]);

  useEffect(() => {
    if (!approvedHost || !user?.uid) return undefined;
    setFollowerCount(null);
    setFollowerError(false);
    return followService.subscribeFollowerCount(user.uid,
      (count) => { setFollowerCount(count); setFollowerError(false); },
      () => { setFollowerCount(null); setFollowerError(true); },
    );
  }, [user?.uid, approvedHost, refreshVersion]);

  const availability = user?.hostStatus?.availability || 'offline';
  useEffect(() => {
  if (!user?.uid || availability !== 'online') {
    setIncomingCall(null);
    return undefined;
  }

  return callService.subscribeIncoming(user.uid, (nextCall) => {
    if (!nextCall) {
      setIncomingCall(null);
      return;
    }

    const expiresAtMs = Number(nextCall.expiresAtMs || 0);

    if (expiresAtMs && expiresAtMs <= Date.now()) {
      setIncomingCall(null);
      return;
    }

    setIncomingCall(nextCall);
  });
}, [user?.uid, availability]);

  const updateOnlineStatus = async (online) => {
    if (!isApprovedHost(user) || updating) return;
    setUpdating(true);
    try { await dbService.updateHostAvailability(online ? 'online' : 'offline'); }
    catch (error) { Alert.alert('Update failed', error.message || 'Could not change availability.'); }
    finally { setUpdating(false); }
  };

  if (!isApprovedHost(user)) return null;
  const today = user?.hostMetrics?.today || {};
  const metrics = [
    { label: 'Calls', value: today.calls || 0 },
    { label: 'Call Time', value: `${today.callTimeMinutes || 0} min` },
    { label: 'Earnings', value: `${today.earnings || 0}` },
  ];

  const refresh = () => setRefreshVersion((value) => value + 1);
  const renderConsumer = ({ item: consumer }) => {
    const country = getCountryByCode(consumer.countryCode);
    const details = [consumer.age, [country?.flag, consumer.countryName || country?.name].filter(Boolean).join(' ')].filter(Boolean).join(' / ');
    const interests = Array.isArray(consumer.interests) ? consumer.interests.filter((item) => typeof item === 'string') : [];
    return (
      <View style={styles.consumerCard}>
        <TouchableOpacity style={styles.consumerBody} onPress={() => navigation.navigate('UserProfile', { userId: consumer.uid })}>
          {consumer.profilePic ? <Image source={{ uri: consumer.profilePic }} style={styles.avatar} /> : <View style={[styles.avatar, styles.placeholder]}><Text style={styles.initial}>{consumer.username?.slice(0, 1)?.toUpperCase() || 'A'}</Text></View>}
          <View style={styles.consumerInfo}>
            <Text numberOfLines={1} style={styles.opportunityTitle}>{consumer.username}</Text>
            {!!details && <Text numberOfLines={2} style={styles.opportunityText}>{details}</Text>}
            {(consumer.bio || interests.length > 0) && <Text numberOfLines={2} style={styles.interests}>{consumer.bio || interests.slice(0, 2).join(' / ')}</Text>}
          </View>
        </TouchableOpacity>
        <View style={styles.consumerActions}>
          <TouchableOpacity style={styles.messageButton} onPress={() => navigation.navigate('ChatDetail', { userId: consumer.uid, name: consumer.username })}>
            <Text style={styles.messageText}>Message</Text>
          </TouchableOpacity>
          {/* Future video invites can sit beside Message once supported. */}
        </View>
      </View>
    );
  };

  return <View style={styles.container}>
    <FlatList
      data={consumers}
      numColumns={2}
      columnWrapperStyle={styles.consumerRow}
      keyExtractor={(consumer) => consumer.uid}
      renderItem={renderConsumer}
      contentContainerStyle={styles.content}
      refreshing={loadingConsumers}
      onRefresh={refresh}
      ListHeaderComponent={<>
        <Text style={styles.title}>Connect</Text>
        <View style={styles.statusCard}><View style={{ flex: 1 }}><Text style={styles.sectionLabel}>CALL AVAILABILITY</Text><Text style={styles.statusTitle}>{availability === 'online' ? 'Available for Calls' : availability === 'busy' ? 'Busy on a Call' : 'Unavailable'}</Text><Text style={styles.statusText}>You choose when you are willing to receive video calls.</Text></View>{updating ? <ActivityIndicator color={COLORS.primary} /> : <Switch value={availability === 'online'} onValueChange={updateOnlineStatus} trackColor={{ true: COLORS.primary }} />}</View>
        <Text style={styles.heading}>TODAY</Text>
        <View style={styles.grid}>{metrics.map(({ label, value }) => <View style={styles.metric} key={label}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>
        <Text style={styles.followerSummary}>Followers (total): {followerError ? 'Unavailable - pull down to retry' : followerCount ?? 'Loading...'}</Text>
        <View style={styles.discoveryTabs}>{['For You', 'Following'].map((tab) => (
          <TouchableOpacity key={tab} accessibilityRole="tab" accessibilityState={{ selected: discoveryTab === tab }} style={[styles.discoveryTab, discoveryTab === tab && styles.selectedTab]} onPress={() => setDiscoveryTab(tab)}>
            <Text style={[styles.tabText, discoveryTab === tab && styles.selectedTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}</View>
        <Text style={styles.discoveryText}>Explore profiles and start a conversation</Text>
      </>}
      ListEmptyComponent={<View style={styles.opportunity}>
        {loadingConsumers ? <ActivityIndicator color={COLORS.primary} /> : <>
          <Text style={styles.opportunityTitle}>{consumerError ? 'Unable to load people' : discoveryTab === 'Following' ? "You're not following anyone yet." : 'No people to connect with yet'}</Text>
          <Text style={styles.opportunityText}>{consumerError || (discoveryTab === 'Following' ? 'Follow people from their profiles to find them here. Only available profiles are shown.' : 'New profiles will appear here when available. Pull down to refresh.')}</Text>
          {consumerError ? <TouchableOpacity onPress={refresh} style={styles.messageButton}><Text style={styles.messageText}>Try again</Text></TouchableOpacity> : null}
        </>}
      </View>}
      ListFooterComponent={<>
        <View style={styles.profileState}><Text style={styles.opportunityTitle}>Profile readiness</Text><Text style={styles.opportunityText}>{user?.profilePic && user?.hostProfile?.bio && user?.hostProfile?.introVideoUrl ? 'Your public host profile has its core media.' : 'Add profile media and an introduction to improve marketplace readiness.'}</Text></View>
      </>}
    />
    {incomingCall && <IncomingCallCard call={incomingCall} navigation={navigation} onDismiss={()=>setIncomingCall(null)} />}
  </View>;
};

const styles = StyleSheet.create({
  consumerRow: { justifyContent: 'space-between' },
  followerSummary: { color: COLORS.textSecondary, fontSize: 12, marginVertical: 6 },
  discoveryTabs: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  discoveryTab: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: 'white', justifyContent: 'center' },
  selectedTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontWeight: '800' },
  selectedTabText: { color: 'white' },
  discoveryText: { color: COLORS.textSecondary, marginTop: 5, marginBottom: 16 },
  consumerCard: { width: '48.5%', backgroundColor: 'white', borderRadius: 18, padding: 10, marginBottom: 12 },
  consumerBody: { flex: 1, gap: 10 },
  consumerInfo: { flex: 1 },
  avatar: { width: '100%', aspectRatio: 1, borderRadius: 12 },
  placeholder: { backgroundColor: '#E9D5FF', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#7C3AED', fontSize: 30, fontWeight: '900' },
  interests: { color: COLORS.primary, marginTop: 7, fontSize: 12 },
  consumerActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  messageButton: { backgroundColor: '#FFF1F4', paddingHorizontal: 18, minHeight: 44, borderRadius: 22, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 4 },
  messageText: { color: COLORS.primary, fontWeight: '800' },
  container: { flex: 1, backgroundColor: '#F7F7F9' }, content: { padding: 18, paddingTop: 56, paddingBottom: 32 }, title: { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 18 }, sectionLabel: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, statusCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' }, statusTitle: { color: COLORS.text, fontSize: 21, fontWeight: '900', marginTop: 6 }, statusText: { color: COLORS.textSecondary, marginTop: 5, lineHeight: 18, maxWidth: 260 }, heading: { color: COLORS.textSecondary, fontWeight: '900', fontSize: 12, letterSpacing: 0.8, marginTop: 22, marginBottom: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, metric: { width: '32%', backgroundColor: 'white', borderRadius: 12, padding: 8, marginBottom: 10 }, metricValue: { color: COLORS.text, fontSize: 16, fontWeight: '800' }, metricLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 }, opportunity: { backgroundColor: 'white', borderRadius: 18, padding: 18 }, profileState: { backgroundColor: '#FFF1F4', borderRadius: 18, padding: 18, marginTop: 10 }, opportunityTitle: { color: COLORS.text, fontSize: 16, fontWeight: '900' }, opportunityText: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 6 },
});
export default HostDashboardScreen;
