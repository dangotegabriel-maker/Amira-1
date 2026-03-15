import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Phone } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { hapticService } from '../../services/hapticService';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 30) / 2;
const ITEM_HEIGHT = COLUMN_WIDTH * 1.5;

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, loading } = useUser();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // Mock online users
    setOnlineUsers([
      { id: 'f1', name: 'Jessica', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=600', isOnline: true },
      { id: 'f2', name: 'Emma', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=600', isOnline: true },
      { id: 'f3', name: 'Sophia', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=600', isOnline: true },
      { id: 'f4', name: 'Olivia', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=600', isOnline: true },
      { id: 'f5', name: 'Ava', photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&h=600', isOnline: true },
      { id: 'f6', name: 'Isabella', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&h=600', isOnline: true },
    ]);
  }, []);

  if (loading || !user) {
    return <LoadingSpinner />;
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id, name: item.name, isOnline: item.isOnline })}
    >
      <Image
        source={{ uri: item.photo }}
        style={styles.photo}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.overlay}>
        <View style={styles.infoRow}>
          <Text style={styles.username} numberOfLines={1}>{item.name}</Text>
          <View style={styles.onlineDot} />
        </View>
      </View>
      <TouchableOpacity
        style={styles.callButton}
        onPress={() => {
          hapticService.mediumImpact();
          navigation.navigate('VideoCall', { name: item.name, userId: item.id });
        }}
      >
        <Phone color="white" size={20} fill="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Amira</Text>
      </View>
      <FlashList
        data={onlineUsers}
        renderItem={renderItem}
        estimatedItemSize={ITEM_HEIGHT}
        numColumns={2}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  listContent: { padding: 10 },
  itemContainer: {
    width: COLUMN_WIDTH,
    height: ITEM_HEIGHT,
    margin: 5,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0'
  },
  photo: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  username: { color: 'white', fontWeight: 'bold', fontSize: 14, flex: 1 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CD964', marginLeft: 5 },
  callButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  }
});

export default HomeScreen;
