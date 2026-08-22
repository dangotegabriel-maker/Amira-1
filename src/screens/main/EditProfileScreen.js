import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { ChevronLeft, Camera, Check } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { auth, db, authService } from '../../services/firebaseService';
import { doc, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { COUNTRIES } from '../../data/countries';
import { validateUsername } from '../../utils/usernameValidation';

const EditProfileScreen = ({ navigation }) => {
  const { user, refreshUser } = useUser();
  const [name, setName] = useState(user?.username || user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [showCountries, setShowCountries] = useState(false);
  const [country, setCountry] = useState(
    COUNTRIES.find((item) => item.cca2 === user?.countryCode) || COUNTRIES[0],
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const validation = validateUsername(name);
    if (!validation.isValid) {
      Alert.alert('Check your name', validation.error);
      return;
    }

    setLoading(true);
    try {
      const currentAuthUser = auth.currentUser;

      if (!currentAuthUser?.uid) {
        Alert.alert("Error", "User not authenticated.");
        return;
      }

      console.log('UID:', currentAuthUser.uid);
      await authService.updateUserProfile({ displayName: validation.value });
      await setDoc(doc(db, "users", currentAuthUser.uid), {
        username: validation.value,
        bio,
        countryCode: country.cca2,
        countryName: country.name,
        phoneCode: `+${country.callingCode}`,
        updatedAt: new Date(),
      }, { merge: true });
      await refreshUser();
      Alert.alert("Success", "Profile updated successfully!");
      navigation.goBack();
    } catch (e) {
      console.log('FIRESTORE ERROR:', e);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Check color={COLORS.primary} size={28} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Country and currency</Text>
          <TouchableOpacity style={styles.countryButton} onPress={() => setShowCountries(true)}>
            <Text style={styles.countryButtonText}>{country.flag} {country.name}</Text>
            <Text style={styles.countryMeta}>+{country.callingCode} · {country.currency}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showCountries} transparent animationType="fade" onRequestClose={() => setShowCountries(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCountries(false)}>
          <View style={styles.countryModal}>
            <Text style={styles.modalTitle}>Select country</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.cca2}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryOption}
                  onPress={() => {
                    setCountry(item);
                    setShowCountries(false);
                  }}
                >
                  <Text style={styles.countryButtonText}>{item.flag} {item.name}</Text>
                  <Text style={styles.countryMeta}>+{item.callingCode} · {item.currency}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { height: 100, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  section: { marginBottom: 25 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600' },
  input: { fontSize: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 10, color: COLORS.text },
  bioInput: { height: 100, textAlignVertical: 'top' },
  countryButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 15, backgroundColor: '#FAFAFB' },
  countryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  countryMeta: { color: COLORS.textSecondary, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  countryModal: { maxHeight: 480, backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden' },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', padding: 18 },
  countryOption: { padding: 16, borderTopWidth: 1, borderTopColor: '#EFEFF2' },
});

export default EditProfileScreen;
