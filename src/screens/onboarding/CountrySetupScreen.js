import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COUNTRIES, DEFAULT_COUNTRY } from '../../data/countries';
import { useUser } from '../../context/UserContext';
import { dbService } from '../../services/firebaseService';
import { COLORS } from '../../theme/COLORS';

const CountrySetupScreen = () => {
  const { user, refreshUser } = useUser();
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find((country) => country.cca2 === user?.countryCode) || DEFAULT_COUNTRY,
  );
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!user?.uid || !selectedCountry) return;
    setSaving(true);
    try {
      await dbService.updateUserProfile(user.uid, {
        countryCode: selectedCountry.cca2,
        countryName: selectedCountry.name,
        updatedAt: new Date(),
      });
      await refreshUser();
    } catch (error) {
      Alert.alert('Update Failed', 'Could not save your country. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where are you based?</Text>
      <Text style={styles.subtitle}>This helps us show the correct region and calling code.</Text>
      <FlatList
        data={COUNTRIES}
        keyExtractor={(item) => item.cca2}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.option, selectedCountry?.cca2 === item.cca2 && styles.selectedOption]}
            onPress={() => setSelectedCountry(item)}
            disabled={saving}
          >
            <Text style={styles.countryName}>{item.flag} {item.name}</Text>
            <Text style={styles.countryMeta}>+{item.callingCode}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={saving}>
        {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 80 },
  title: { color: COLORS.text, fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: COLORS.textSecondary, fontSize: 16, lineHeight: 23, marginTop: 10, marginBottom: 20 },
  list: { flex: 1 },
  option: { minHeight: 58, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedOption: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  countryName: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  countryMeta: { color: COLORS.textSecondary, fontSize: 15 },
  button: { backgroundColor: COLORS.primary, minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default CountrySetupScreen;
