import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { COLORS } from '../../theme/COLORS';

const InterestsScreen = ({ navigation }) => {
  const [selected, setSelected] = useState([]);
  const interests = ['Music', 'Travel', 'Food', 'Gaming', 'Art', 'Sports', 'Movies', 'Tech', 'Fashion', 'Fitness'];

  const toggle = (interest) => {
    if (selected.includes(interest)) setSelected(selected.filter(i => i !== interest));
    else setSelected([...selected, interest]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interests</Text>
      <Text style={styles.subtitle}>Select interests to find better matches</Text>
      <View style={styles.chipContainer}>
        {interests.map(i => (
          <TouchableOpacity
            key={i}
            style={[styles.chip, selected.includes(i) && styles.chipSelected]}
            onPress={() => toggle(i)}
          >
            <Text style={[styles.chipText, selected.includes(i) && styles.chipTextSelected]}>{i}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('LocationPermission')}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, paddingTop: 80 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 30 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 40 },
  chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginRight: 10, marginBottom: 10 },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.white, fontWeight: 'bold' },
  button: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});
export default InterestsScreen;
