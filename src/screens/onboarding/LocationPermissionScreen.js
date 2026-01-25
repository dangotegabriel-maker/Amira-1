import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { MapPin } from 'lucide-react-native';

const LocationPermissionScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MapPin color={COLORS.primary} size={64} />
        </View>
        <Text style={styles.title}>Enable Location</Text>
        <Text style={styles.description}>
          We need your location to show you potential matches nearby.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.replace('MainTabs')}
      >
        <Text style={styles.buttonText}>Allow Location</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.textButton}
        onPress={() => navigation.replace('MainTabs')}
      >
        <Text style={styles.textButtonText}>Not Now</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, justifyContent: 'space-between', paddingVertical: 60 },
  content: { alignItems: 'center', marginTop: 100 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  description: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  textButton: { alignItems: 'center', marginTop: 20 },
  textButtonText: { color: COLORS.textSecondary, fontSize: 16 },
});
export default LocationPermissionScreen;
