import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { ChevronRight, LogOut, Trash2, Shield, User, Globe } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../../services/socketService';

const SettingsScreen = ({ navigation }) => {
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          socketService.disconnect();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
      }
    ]);
  };

  const sections = [
    { title: 'Account', items: ['Update Phone Number', 'Email & Password'] },
    { title: 'Privacy', items: ['Block List', 'Invisible Mode'] },
  ];

  return (
    <ScrollView style={styles.container}>
      {sections.map((section, idx) => (
        <View key={idx} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.itemList}>
            {section.items.map((item, i) => (
              <TouchableOpacity key={i} style={styles.item}>
                <Text style={styles.itemText}>{item}</Text>
                <ChevronRight color="#CCC" size={20} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
         <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  section: { marginTop: 25 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary, marginLeft: 20, marginBottom: 10, textTransform: 'uppercase' },
  itemList: { backgroundColor: 'white', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEE' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemText: { fontSize: 16, color: COLORS.text },
  logoutBtn: { backgroundColor: 'white', marginTop: 40, padding: 18, alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEE' },
  logoutText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 16 }
});

export default SettingsScreen;
