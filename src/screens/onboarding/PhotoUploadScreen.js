import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../theme/COLORS';
import { Camera, X } from 'lucide-react-native';
import { dbService } from '../../services/firebaseService';
import { useUser } from '../../context/UserContext';

const PhotoUploadScreen = ({ navigation }) => {
  const [photos, setPhotos] = useState(Array(9).fill(null));
  const { refreshUser } = useUser();

  const pickImage = async (index) => {
    Alert.alert(
      "Add Photo",
      "Choose a source",
      [
        {
          text: "Camera",
          onPress: () => openCamera(index)
        },
        {
          text: "Gallery",
          onPress: () => openGallery(index)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const openCamera = async (index) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 5], quality: 0.8 });
    if (!result.canceled) {
      const newPhotos = [...photos];
      newPhotos[index] = result.assets[0].uri;
      setPhotos(newPhotos);
    }
  };

  const openGallery = async (index) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery permissions to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 5], quality: 0.8 });
    if (!result.canceled) {
      const newPhotos = [...photos];
      newPhotos[index] = result.assets[0].uri;
      setPhotos(newPhotos);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos[index] = null;
    setPhotos(newPhotos);
  };

  const handleContinue = async () => {
    const photoCount = photos.filter(p => p !== null).length;
    await dbService.updateUserProfile('current_user_id', {
        photos: photos.filter(p => p !== null),
        is_verified: photoCount >= 2,
        defaultAvatar: photoCount === 0
    });
    await refreshUser();
    navigation.navigate('Interests');
  };

  const handleSkip = async () => {
    await dbService.updateUserProfile('current_user_id', {
        is_verified: false,
        defaultAvatar: true
    });
    await refreshUser();
    navigation.navigate('Interests');
  };

  const photoCount = photos.filter(p => p !== null).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Photos</Text>
        <TouchableOpacity onPress={handleSkip}>
           <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Add at least 2 photos to be verified</Text>
      <View style={styles.grid}>
        {photos.map((photo, i) => (
          <TouchableOpacity
            key={i}
            style={styles.photoPlaceholder}
            onPress={() => photo ? null : pickImage(i)}
            disabled={photo !== null}
          >
            {photo ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: photo }} style={styles.image} />
                <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(i)}>
                    <X color={COLORS.white} size={16} />
                </TouchableOpacity>
              </View>
            ) : (
              <Camera color={COLORS.border} size={32} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, photoCount < 1 && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={photoCount < 1}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold' },
  skipText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 40 },
  photoPlaceholder: {
    width: '31%', aspectRatio: 0.8, backgroundColor: '#F2F2F7', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden'
  },
  imageWrapper: { width: '100%', height: '100%' },
  image: { width: '100%', height: '100%' },
  removeButton: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginBottom: 40 },
  buttonDisabled: { backgroundColor: COLORS.border },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default PhotoUploadScreen;
