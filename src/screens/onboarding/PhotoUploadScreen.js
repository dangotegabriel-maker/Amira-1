import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Camera } from 'lucide-react-native';

const PhotoUploadScreen = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Photos</Text>
      <Text style={styles.subtitle}>Add at least 2 photos to continue</Text>
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <TouchableOpacity key={i} style={styles.photoPlaceholder}>
            <Camera color={COLORS.border} size={32} />
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Interests')}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 40 },
  photoPlaceholder: { width: '31%', aspectRatio: 0.8, backgroundColor: '#F2F2F7', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginBottom: 40 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});
export default PhotoUploadScreen;
