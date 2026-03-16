import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Animated } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Phone } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { hapticService } from '../../services/hapticService';
import { socketService } from '../../services/socketService';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 30) / 2;
const ITEM_HEIGHT = COLUMN_WIDTH * 1.5;

const CONTINENTS = ['All', 'Africa', 'Europe', 'Asia', 'Americas', 'Middle East'];

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState('online'); // 'online' or 'live'
  const [selectedContinent, setSelectedContinent] = useState('All');
  const [allUsers, setAllUsers] = useState([]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // Mock data with required flags (gender added for price badge logic)
    const mockUsers = [
      { id: 'f1', name: 'Jessica', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: false, call_price: 60, continent: 'Americas', gender: 'female' },
      { id: 'f2', name: 'Emma', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: true, call_price: 75, continent: 'Europe', gender: 'female' },
      { id: 'f3', name: 'Sophia', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: false, call_price: null, continent: 'Asia', gender: 'female' },
      { id: 'f4', name: 'Olivia', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: true, call_price: 50, continent: 'Africa', gender: 'female' },
      { id: 'f5', name: 'Ava', photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: false, call_price: 80, continent: 'Middle East', gender: 'female' },
      { id: 'f6', name: 'Isabella', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: true, call_price: 65, continent: 'Americas', gender: 'female' },
      { id: 'm1', name: 'David', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: false, call_price: null, continent: 'Europe', gender: 'male' },
    ];
    setAllUsers(mockUsers);

    // Socket listener for real-time live updates
    const handleUserWentLive = (data) => {
      console.log('Socket: User went live', data);
      setAllUsers(prev => prev.map(u => u.id === data.userId ? { ...u, isLive: true } : u));
    };

    socketService.on('user-went-live', handleUserWentLive);

    return () => {
      socketService.off('user-went-live', handleUserWentLive);
    };
  }, []);

  if (loading || !user) {
    return <LoadingSpinner />;
  }

  const filteredOnline = allUsers.filter(u =>
    u.isOnline && (selectedContinent === 'All' || u.continent === selectedContinent)
  );

  const filteredLive = allUsers.filter(u =>
    u.isLive && (selectedContinent === 'All' || u.continent === selectedContinent)
  );

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
      {item.gender === 'female' && (
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{item.call_price || 50} 🪙/min</Text>
        </View>
      )}
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

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false, listener: (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      if (offsetX >= width / 2 && activeTab !== 'live') {
        setActiveTab('live');
      } else if (offsetX < width / 2 && activeTab !== 'online') {
        setActiveTab('online');
      }
    }}
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'online' ? 'Active Now' : 'On Air'}
        </Text>
      </View>

      <View style={styles.categoryBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}
        >
          {CONTINENTS.map(continent => (
            <TouchableOpacity
              key={continent}
              style={[
                styles.categoryItem,
                selectedContinent === continent && styles.categoryItemActive
              ]}
              onPress={() => {
                hapticService.lightImpact();
                setSelectedContinent(continent);
              }}
            >
              <Text style={[
                styles.categoryText,
                selectedContinent === continent && styles.categoryTextActive
              ]}>
                {continent}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={{ width }}>
          <FlashList
            data={filteredOnline}
            renderItem={renderItem}
            estimatedItemSize={ITEM_HEIGHT}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No users online in this region</Text>}
          />
        </View>
        <View style={{ width }}>
          <FlashList
            data={filteredLive}
            renderItem={renderItem}
            estimatedItemSize={ITEM_HEIGHT}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No live streams in this region</Text>}
          />
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  categoryBarContainer: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  categoryBar: { paddingHorizontal: 15, paddingVertical: 10 },
  categoryItem: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, backgroundColor: '#F5F5F5' },
  categoryItemActive: { backgroundColor: COLORS.primary + '15' }, // 15% opacity Amira Pink
  categoryText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  categoryTextActive: { color: COLORS.primary },
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
  priceBadge: {
    position: 'absolute',
    bottom: 45,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    height: 40,
    justifyContent: 'center'
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
  },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textSecondary, fontSize: 16 }
});

export default HomeScreen;
