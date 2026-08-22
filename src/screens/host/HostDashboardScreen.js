import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Clock, Coins, Wallet } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { auth, dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';

const HostDashboardScreen = () => {
  const { user } = useUser();
  const [updating, setUpdating] = useState(false);

  const updateOnlineStatus = async (isOnline) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid || updating) return;
    setUpdating(true);
    try {
      await dbService.updateUserProfile(currentUser.uid, { isOnline });
    } catch (error) {
      console.log('FIRESTORE ERROR:', error);
      Alert.alert('Update Failed', 'Could not change your online status.');
    } finally {
      setUpdating(false);
    }
  };

  const metrics = [
    { label: 'Call time', value: user?.callTimeMinutes || 0, suffix: ' min', icon: Clock },
    { label: 'Earnings', value: user?.earnings || 0, suffix: '', icon: Coins },
    { label: 'Balance', value: user?.wallet?.balance || 0, suffix: ` ${user?.wallet?.currency || 'GHS'}`, icon: Wallet },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusTitle}>{user?.isOnline ? 'You are online' : 'You are offline'}</Text>
          <Text style={styles.statusText}>Online creators can receive connection requests.</Text>
        </View>
        <Switch
          value={Boolean(user?.isOnline)}
          onValueChange={updateOnlineStatus}
          disabled={updating}
          trackColor={{ true: COLORS.primary }}
        />
      </View>

      <View style={styles.metrics}>
        {metrics.map(({ label, value, suffix, icon: Icon }) => (
          <View key={label} style={styles.metricCard}>
            <Icon color={COLORS.primary} size={24} />
            <Text style={styles.metricValue}>{value}{suffix}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', padding: 20, paddingTop: 60 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '900', marginBottom: 22 },
  statusCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  statusText: { color: COLORS.textSecondary, marginTop: 5, maxWidth: 250, lineHeight: 19 },
  metrics: { marginTop: 20 },
  metricCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 20, marginBottom: 12 },
  metricValue: { color: COLORS.text, fontSize: 24, fontWeight: '900', marginTop: 12 },
  metricLabel: { color: COLORS.textSecondary, marginTop: 4 },
});

export default HostDashboardScreen;
