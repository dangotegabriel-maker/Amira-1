import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';

const HostPendingScreen = ({ navigation }) => {
  const { user } = useUser();
  const status = user?.hostStatus?.verificationStatus || 'not_started';
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Clock color={COLORS.primary} size={42} />
        <Text style={styles.title}>Host access pending</Text>
        <Text style={styles.body}>
          Your host application is not approved yet. You cannot go online, receive paid host calls, or accrue host earnings until approval.
        </Text>
        <Text style={styles.status}>Verification status: {status.replace(/_/g, ' ')}</Text>
        {['not_started', 'in_progress', 'rejected', 'needs_resubmission'].includes(status) && <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('HostApplication')}><Text style={styles.buttonText}>{status === 'rejected' || status === 'needs_resubmission' ? 'Update Application' : 'Continue Application'}</Text></TouchableOpacity>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', padding: 20, paddingTop: 80 },
  card: { backgroundColor: COLORS.white, borderRadius: 22, padding: 28, alignItems: 'center' },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '900', marginTop: 18 },
  body: { color: COLORS.textSecondary, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 12 },
  status: { color: COLORS.primary, fontSize: 14, fontWeight: '800', marginTop: 22, textTransform: 'capitalize' },
  button: { minHeight: 50, borderRadius: 25, backgroundColor: COLORS.primary, paddingHorizontal: 24, marginTop: 18, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: 'white', fontWeight: '900' },
});

export default HostPendingScreen;
