import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Coins, Headphones, LogOut, Settings, UserCheck, UserPlus, Users } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { authService } from '../../services/firebaseService';
import { socketService } from '../../services/socketService';
import { getCountryByCode } from '../../data/countries';
import { isApprovedHost } from '../../models/userModel';

const Row = ({ icon: Icon, label, detail, onPress, destructive = false }) => (
  <TouchableOpacity style={styles.row} onPress={onPress}>
    <View style={styles.rowIcon}><Icon color={destructive ? '#DC2626' : COLORS.primary} size={21} /></View>
    <View style={styles.rowText}><Text style={[styles.rowLabel, destructive && { color: '#DC2626' }]}>{label}</Text>{detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}</View>
    <ChevronRight color="#B5B5BC" size={20} />
  </TouchableOpacity>
);

const MyProfileScreen = ({ navigation }) => {
  const { user } = useUser();
  const country = getCountryByCode(user?.countryCode);
  const approvedHost = isApprovedHost(user);
  const pendingHost = user?.role === 'host' && !approvedHost;

  const logout = () => Alert.alert('Log out', 'Are you sure you want to log out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: async () => { socketService.disconnect(); await authService.signOut(); } },
  ]);

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.profileCard}>
      {user?.profilePic ? <Image source={{ uri: user.profilePic }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarLetter}>{user?.username?.slice(0, 1)?.toUpperCase() || 'A'}</Text></View>}
      <Text style={styles.name}>{user?.username || 'Amira User'}</Text>
      <Text style={styles.country}>{country?.flag || ''} {user?.countryName || country?.name || 'Country not set'}</Text>
      <TouchableOpacity style={styles.edit} onPress={() => navigation.navigate('EditProfile')}><Text style={styles.editText}>Edit Profile</Text></TouchableOpacity>
    </View>

    {user?.role === 'consumer' && <View style={styles.creditsCard}><Text style={styles.creditsLabel}>AMIRA CREDITS</Text><View style={styles.balanceRow}><Coins color="#FACC15" size={30} /><Text style={styles.balance}>{(user?.wallet?.creditBalance || 0).toLocaleString()}</Text></View><TouchableOpacity style={styles.recharge} onPress={() => navigation.navigate('RechargeHub')}><Text style={styles.rechargeText}>Recharge</Text></TouchableOpacity></View>}

    {user?.role === 'consumer' && <Section title="SOCIAL"><Row icon={Users} label="Following" detail="Approved hosts you follow" onPress={() => navigation.navigate('Home', { initialTab: 'Following' })} /></Section>}

    <Section title="HOST">
      {user?.role === 'consumer' && <Row icon={UserPlus} label="Become a Host" detail="Apply for manual review" onPress={() => navigation.navigate('HostApplication')} />}
      {pendingHost && <Row icon={UserCheck} label="Host Application Pending" detail={(user?.hostStatus?.verificationStatus || 'pending').replace(/_/g, ' ')} onPress={() => navigation.navigate('Application')} />}
      {approvedHost && <Row icon={UserCheck} label="Host Dashboard" detail="Manage availability and activity" onPress={() => navigation.navigate('Dashboard')} />}
    </Section>

    <Section title="ACCOUNT & SUPPORT">
      <Row icon={Settings} label="Settings" onPress={() => navigation.navigate('Settings')} />
      <Row icon={Headphones} label="Help / Customer Service" onPress={() => navigation.navigate('HelpSupport')} />
      <Row icon={LogOut} label="Log out" destructive onPress={logout} />
    </Section>
  </ScrollView>;
};

const Section = ({ title, children }) => <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionCard}>{children}</View></View>;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' }, content: { paddingBottom: 110 }, profileCard: { backgroundColor: 'white', alignItems: 'center', paddingTop: 64, paddingBottom: 24, paddingHorizontal: 20 }, avatar: { width: 104, height: 104, borderRadius: 52 }, avatarPlaceholder: { backgroundColor: '#E9D5FF', justifyContent: 'center', alignItems: 'center' }, avatarLetter: { color: '#7C3AED', fontSize: 42, fontWeight: '900' }, name: { color: COLORS.text, fontSize: 25, fontWeight: '900', marginTop: 13 }, country: { color: COLORS.textSecondary, marginTop: 5 }, edit: { borderWidth: 1, borderColor: '#DDD', borderRadius: 18, paddingHorizontal: 20, paddingVertical: 9, marginTop: 14 }, editText: { color: COLORS.text, fontWeight: '800' },
  creditsCard: { backgroundColor: '#241532', margin: 16, borderRadius: 22, padding: 22 }, creditsLabel: { color: '#C4B5FD', fontWeight: '900', letterSpacing: 1 }, balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 13 }, balance: { color: 'white', fontSize: 35, fontWeight: '900' }, recharge: { backgroundColor: COLORS.primary, minHeight: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }, rechargeText: { color: 'white', fontWeight: '900', fontSize: 16 },
  section: { marginHorizontal: 16, marginTop: 14 }, sectionTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '900', marginLeft: 5, marginBottom: 7, letterSpacing: 0.6 }, sectionCard: { backgroundColor: 'white', borderRadius: 18, overflow: 'hidden' }, row: { minHeight: 68, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E9E9ED' }, rowIcon: { width: 38 }, rowText: { flex: 1 }, rowLabel: { color: COLORS.text, fontSize: 16, fontWeight: '800' }, rowDetail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
});
export default MyProfileScreen;
