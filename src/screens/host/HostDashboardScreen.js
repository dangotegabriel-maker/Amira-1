import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Clock, Coins, UserPlus, Video } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';
import { isApprovedHost } from '../../models/userModel';

const HostDashboardScreen = () => {
  const { user } = useUser();
  const [updating, setUpdating] = useState(false);
  const availability = user?.hostStatus?.availability || 'offline';

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
    { label: 'Calls', value: today.calls || 0, icon: Video },
    { label: 'Call Time', value: `${today.callTimeMinutes || 0} min`, icon: Clock },
    { label: 'Earnings', value: `${today.earnings || 0}`, icon: Coins },
    { label: 'New Followers', value: today.newFollowers || 0, icon: UserPlus },
  ];

  return <View style={styles.container}>
    <Text style={styles.title}>Host Dashboard</Text>
    <View style={styles.statusCard}><View style={{ flex: 1 }}><Text style={styles.sectionLabel}>STATUS</Text><Text style={styles.statusTitle}>{availability === 'online' ? 'You are online' : availability === 'busy' ? 'You are busy' : 'You are offline'}</Text><Text style={styles.statusText}>Only approved hosts can appear in marketplace discovery.</Text></View>{updating ? <ActivityIndicator color={COLORS.primary} /> : <Switch value={availability === 'online'} onValueChange={updateOnlineStatus} trackColor={{ true: COLORS.primary }} />}</View>
    <Text style={styles.heading}>TODAY</Text><View style={styles.grid}>{metrics.map(({ label, value, icon: Icon }) => <View style={styles.metric} key={label}><Icon color={COLORS.primary} size={21} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View>
    <Text style={styles.heading}>OPPORTUNITIES</Text><View style={styles.opportunity}><Text style={styles.opportunityTitle}>No marketplace activity yet</Text><Text style={styles.opportunityText}>Potential matches, returning connections, and introductions will appear when their backend systems are available.</Text></View>
    <View style={styles.profileState}><Text style={styles.opportunityTitle}>Profile readiness</Text><Text style={styles.opportunityText}>{user?.profilePic && user?.hostProfile?.bio && user?.hostProfile?.introVideoUrl ? 'Your public host profile has its core media.' : 'Add profile media and an introduction to improve marketplace readiness.'}</Text></View>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', padding: 18, paddingTop: 56 }, title: { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 18 }, sectionLabel: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, statusCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' }, statusTitle: { color: COLORS.text, fontSize: 21, fontWeight: '900', marginTop: 6 }, statusText: { color: COLORS.textSecondary, marginTop: 5, lineHeight: 18, maxWidth: 260 }, heading: { color: COLORS.textSecondary, fontWeight: '900', fontSize: 12, letterSpacing: 0.8, marginTop: 22, marginBottom: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, metric: { width: '48.5%', backgroundColor: 'white', borderRadius: 17, padding: 16, marginBottom: 10 }, metricValue: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 10 }, metricLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 }, opportunity: { backgroundColor: 'white', borderRadius: 18, padding: 18 }, profileState: { backgroundColor: '#FFF1F4', borderRadius: 18, padding: 18, marginTop: 10 }, opportunityTitle: { color: COLORS.text, fontSize: 16, fontWeight: '900' }, opportunityText: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 6 },
});
export default HostDashboardScreen;
