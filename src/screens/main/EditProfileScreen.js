import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { ChevronLeft, Camera, Check } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { auth, authService, dbService } from '../../services/firebaseService';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { COUNTRIES } from '../../data/countries';
import { validateUsername } from '../../utils/usernameValidation';
import CountrySelectorModal from '../../components/CountrySelectorModal';
import { mediaService } from '../../services/mediaService';

const EditProfileScreen = ({ navigation }) => {
  const { user, refreshUser } = useUser();
  const [name, setName] = useState(user?.username || user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [showCountries, setShowCountries] = useState(false);
  const [country, setCountry] = useState(
    COUNTRIES.find((item) => item.cca2 === user?.countryCode) || COUNTRIES[0],
  );
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');

  const updatePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission required', 'Media library access is required.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (result.canceled) return;
    setLoading(true);
    try {
      const media = await mediaService.uploadUserMedia({ asset: result.assets[0], category: 'profile', kind: 'image' });
      await dbService.updateUserProfile(user.uid, { profilePic: media.url, updatedAt: new Date() });
      setProfilePic(media.url);
      await refreshUser();
    } catch (error) { Alert.alert('Upload failed', error.message || 'Please try again.'); }
    finally { setLoading(false); }
  };

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
      await dbService.updateUserProfile(currentAuthUser.uid, {
        username: validation.value,
        bio,
        countryCode: country.cca2,
        countryName: country.name,
        phoneCode: `+${country.callingCode}`,
        updatedAt: new Date(),
      });
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
        <TouchableOpacity style={styles.photoButton} onPress={updatePhoto} disabled={loading}>
          {profilePic ? <Image source={{ uri: profilePic }} style={styles.profilePhoto} /> : <View style={[styles.profilePhoto, styles.photoPlaceholder]}><Camera color={COLORS.primary} size={30} /></View>}
          <Text style={styles.photoText}>Change profile photo</Text>
        </TouchableOpacity>
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
          <Text style={styles.label}>Country</Text>
          <TouchableOpacity style={styles.countryButton} onPress={() => setShowCountries(true)}>
            <Text style={styles.countryButtonText}>{country.flag} {country.name}</Text>
            <Text style={styles.countryMeta}>+{country.callingCode} · Wallet currency is unchanged</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CountrySelectorModal visible={showCountries} onClose={() => setShowCountries(false)} onSelect={setCountry} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { height: 100, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  photoButton: { alignItems: 'center', marginBottom: 26 }, profilePhoto: { width: 104, height: 104, borderRadius: 52 }, photoPlaceholder: { backgroundColor: '#FFF1F4', alignItems: 'center', justifyContent: 'center' }, photoText: { color: COLORS.primary, fontWeight: '800', marginTop: 9 },
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
