import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Eye, Phone } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { isApprovedHost } from '../../models/userModel';
import { COLORS } from '../../theme/COLORS';

const HostActivityScreen = ({ navigation }) => {
  const { user } = useUser();
  if (!isApprovedHost(user)) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>Catch up on calls and people who viewed your profile.</Text>
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Messages', { view: 'Calls' })}>
        <Phone color={COLORS.primary} size={25} />
        <View style={styles.body}>
          <Text style={styles.label}>Recent calls</Text>
          <Text style={styles.detail}>View call history and statuses in Messages.</Text>
        </View>
        <ChevronRight color={COLORS.textSecondary} size={20} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('HostVisitors')}>
        <Eye color={COLORS.primary} size={25} />
        <View style={styles.body}>
          <Text style={styles.label}>Profile Visitors</Text>
          <Text style={styles.detail}>See who has visited your profile.</Text>
        </View>
        <ChevronRight color={COLORS.textSecondary} size={20} />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' },
  content: { padding: 18, paddingTop: 56, paddingBottom: 32 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 8, marginBottom: 22 },
  card: { backgroundColor: 'white', borderRadius: 18, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1 },
  label: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  detail: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 5 },
});

export default HostActivityScreen;
