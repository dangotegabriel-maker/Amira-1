import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Heart, Video } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { auth, dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';
import { DEFAULT_HOST_STATUS, isProfileActuallyComplete } from '../../models/userModel';

const RoleSelectionScreen = () => {
  const [saving, setSaving] = useState('');
  const { user, refreshUser } = useUser();

  const selectRole = async (role) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      Alert.alert('Session Error', 'Please log in again.');
      return;
    }

    setSaving(role);
    try {
      console.log('UID:', currentUser.uid);
      const rolePatch = role === 'host'
        ? {
            role,
            hostStatus: {
              ...DEFAULT_HOST_STATUS,
              hasApplied: true,
            },
          }
        : { role };
      await dbService.updateUserProfile(currentUser.uid, {
        ...rolePatch,
        isProfileComplete: isProfileActuallyComplete({ ...user, ...rolePatch }),
        updatedAt: new Date(),
      });
      await refreshUser();
    } catch (error) {
      console.log('FIRESTORE ERROR:', error);
      Alert.alert('Update Failed', 'Could not save your account type.');
    } finally {
      setSaving('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Amira</Text>
      <Text style={styles.subtitle}>Choose how you want to use the platform.</Text>

      <TouchableOpacity style={styles.option} onPress={() => selectRole('consumer')} disabled={Boolean(saving)}>
        <Heart color={COLORS.primary} size={30} />
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Find Connections</Text>
          <Text style={styles.optionSubtitle}>Discover and connect with creators.</Text>
        </View>
        {saving === 'consumer' && <ActivityIndicator color={COLORS.primary} />}
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={() => selectRole('host')} disabled={Boolean(saving)}>
        <Video color={COLORS.secondary} size={30} />
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Earn as Creator</Text>
          <Text style={styles.optionSubtitle}>Go online, take calls, and track earnings.</Text>
        </View>
        {saving === 'host' && <ActivityIndicator color={COLORS.secondary} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, paddingTop: 100 },
  title: { color: COLORS.text, fontSize: 34, fontWeight: '900' },
  subtitle: { color: COLORS.textSecondary, fontSize: 17, marginTop: 10, marginBottom: 36 },
  option: { minHeight: 100, borderWidth: 1, borderColor: '#E7E7EB', borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white },
  optionText: { flex: 1, marginLeft: 16 },
  optionTitle: { color: COLORS.text, fontSize: 19, fontWeight: '800' },
  optionSubtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 5, lineHeight: 20 },
});

export default RoleSelectionScreen;
