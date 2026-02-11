import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { ChevronRight, LogOut, Trash2, Shield, User, Globe, Moon, RefreshCcw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from '../../services/socketService';
import { hapticService } from '../../services/hapticService';

const { width } = Dimensions.get('window');

const SettingsScreen = ({ navigation }) => {
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          socketService.disconnect();
          // Reset logic here
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
      }
    ]);
  };

  const handleClearCache = async () => {
    await AsyncStorage.clear();
    hapticService.success();
    Alert.alert("Success", "Cache cleared. The app will restart.");
    // Force reload or logout
    navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
  };

  const menuGroups = [
    {
      title: 'Account',
      items: [
        { label: 'Update Phone Number', icon: <User size={20} color="#666" /> },
        { label: 'Email & Password', icon: <Globe size={20} color="#666" /> },
      ]
    },
    {
      title: 'Privacy',
      items: [
        { label: 'Block List', icon: <Shield size={20} color="#666" /> },
        { label: 'Invisible Mode (VIP)', icon: <Moon size={20} color="#666" /> },
        { label: 'Read Receipts', icon: <RefreshCcw size={20} color="#666" /> },
      ]
    },
    {
      title: 'Danger Zone',
      items: [
        { label: 'Clear Cache', icon: <RefreshCcw size={20} color="#FF9500" />, action: handleClearCache },
        { label: 'Deactivate Account', icon: <Trash2 size={20} color="#FF3B30" />, color: '#FF3B30' },
        { label: 'Delete Account', icon: <Trash2 size={20} color="#FF3B30" />, color: '#FF3B30' },
      ]
    }
  ];

  return (
    <ScrollView style={styles.container}>
      {menuGroups.map((group, idx) => (
        <View key={idx} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.itemList}>
            {group.items.map((item, i) => (
              <TouchableOpacity key={i} style={styles.item} onPress={item.action}>
                <View style={styles.itemLeft}>
                  {item.icon}
                  <Text style={[styles.itemLabel, item.color ? { color: item.color } : null]}>{item.label}</Text>
                </View>
                <ChevronRight color="#CCC" size={20} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
         <LogOut color="#FF3B30" size={20} />
         <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Amira v1.0.0 (SDK 54 Hardened)</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  group: { marginTop: 25 },
  groupTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textSecondary, marginLeft: 20, marginBottom: 10, textTransform: 'uppercase' },
  itemList: { backgroundColor: 'white', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEE' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemLabel: { marginLeft: 15, fontSize: 16, color: COLORS.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', marginTop: 40, padding: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEE' },
  logoutText: { marginLeft: 10, fontSize: 16, color: '#FF3B30', fontWeight: 'bold' },
  version: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginVertical: 30 }
});

export default SettingsScreen;
