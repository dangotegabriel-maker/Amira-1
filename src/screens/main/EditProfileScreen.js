import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Camera } from 'lucide-react-native';

const EditProfileScreen = ({ navigation }) => {
  const [name, setName] = useState('John Doe');
  const [bio, setBio] = useState('Enjoying life and looking for connections.');
  const [location, setLocation] = useState('Lagos, Nigeria');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.cameraIcon}>
            <Camera color={COLORS.white} size={20} />
          </View>
        </TouchableOpacity>
        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Bio"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Location"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { alignItems: 'center', paddingVertical: 30 },
  avatarContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEE', position: 'relative' },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 60 },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.white
  },
  changePhotoText: { marginTop: 15, color: COLORS.primary, fontWeight: '600' },
  form: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.text
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: {
    margin: 20,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 40
  },
  saveButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default EditProfileScreen;
