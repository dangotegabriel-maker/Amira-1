import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { ShieldAlert } from 'lucide-react-native';

const AccountNotAllowedScreen = ({ navigation }) => (
  <View style={styles.container}>
    <ShieldAlert color="#FF3B30" size={80} />
    <Text style={styles.title}>Account Restricted</Text>
    <Text style={styles.message}>
      Our safety systems indicate that you do not meet the minimum age requirement (18+) to use Amira.
    </Text>
    <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Welcome')}>
      <Text style={styles.buttonText}>Go Back</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 30 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 20, color: COLORS.text },
  message: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 15, lineHeight: 24 },
  button: { marginTop: 40, backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default AccountNotAllowedScreen;
