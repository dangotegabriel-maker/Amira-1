import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Animated, Easing, Modal } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Phone, Coins, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { hapticService } from '../../services/hapticService';
import { socketService } from '../../services/socketService';
import { ledgerService } from '../../services/ledgerService';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 30) / 2;
const ITEM_HEIGHT = COLUMN_WIDTH * 1.5;

const CONTINENTS = ['All', 'Africa', 'Europe', 'Asia', 'Americas', 'Middle East'];

const CONTINENT_MAPPING = {
  'Africa': ['GH', 'NG', 'KE', 'ZA', 'EG'],
  'Europe': ['GB', 'FR', 'DE', 'IT', 'ES'],
  'Asia': ['CN', 'JP', 'KR', 'IN', 'TH'],
  'Americas': ['US', 'CA', 'BR', 'MX', 'AR'],
  'Middle East': ['AE', 'SA', 'QA', 'TR', 'LB']
};

const LiveBadge = () => {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.liveBadge, { opacity: pulseAnim }]}>
      <Text style={styles.liveBadgeText}>● LIVE</Text>
    </Animated.View>
  );
};

const LowBalanceSheet = ({ visible, onClose, navigation, required }) => (
  <Modal visible={visible} transparent animationType="slide">
     <View style={styles.sheetOverlay}>
        <View style={styles.sheetContent}>
           <View style={styles.sheetHandle} />
           <View style={styles.sheetIconBox}>
              <Coins color="#FFD700" size={40} />
           </View>
           <Text style={styles.sheetTitle}>Oops! Low Balance.</Text>
           <Text style={styles.sheetSubtitle}>You need at least {required} coins to start this call. Top up now to connect.</Text>

           <TouchableOpacity
             style={styles.rechargeCTA}
             onPress={() => { onClose(); navigation.navigate('RechargeHub'); }}
           >
              <Text style={styles.rechargeCTAText}>Go to Coin Store</Text>
              <ChevronRight color="white" size={20} />
           </TouchableOpacity>

           <TouchableOpacity style={styles.closeSheetBtn} onPress={onClose}>
              <Text style={styles.closeSheetText}>Maybe later</Text>
           </TouchableOpacity>
        </View>
     </View>
  </Modal>
);

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, loading, isMale } = useUser();
  const [activeTab, setActiveTab] = useState('online'); // 'online' or 'live'
  const [selectedContinent, setSelectedContinent] = useState('All');
  const [allUsers, setAllUsers] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [showLowBalance, setShowLowBalance] = useState(false);
  const [requiredCoins, setRequiredCoins] = useState(50);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  useEffect(() => {
    setIsFetching(true);
    // Mock data with required flags (gender, country_code, and viewer_count added)
    const mockUsers = [
      { id: 'f1', name: 'Jessica', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: false, call_price: 60, country_code: 'US', country_flag: '🇺🇸', gender: 'female' },
      { id: 'f2', name: 'Emma', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: true, call_price: 75, country_code: 'GB', country_flag: '🇬🇧', gender: 'female', viewer_count: '1.2k' },
      { id: 'f3', name: 'Sophia', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: false, call_price: null, country_code: 'TH', country_flag: '🇹🇭', gender: 'female' },
      { id: 'f4', name: 'Olivia', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: true, call_price: 50, country_code: 'GH', country_flag: '🇬🇭', gender: 'female', viewer_count: '850' },
      { id: 'f5', name: 'Ava', photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: false, call_price: 80, country_code: 'TR', country_flag: '🇹🇷', gender: 'female' },
      { id: 'f6', name: 'Isabella', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: true, call_price: 65, country_code: 'BR', country_flag: '🇧🇷', gender: 'female', viewer_count: '2.4k' },
      { id: 'm1', name: 'David', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=600', isOnline: true, isLive: false, call_price: null, country_code: 'FR', country_flag: '🇫🇷', gender: 'male' },
    ];

    // Simulate loading delay for responsive UI feel
    setTimeout(() => {
      setAllUsers(mockUsers);
      setIsFetching(false);
    }, 1000);

    // Socket listener for real-time live updates
    const handleUserWentLive = (data) => {
       // console.log('Socket: User went live', data);
      setAllUsers(prev => prev.map(u => u.id === data.userId ? { ...u, isLive: true } : u));
    };

    socketService.on('user-went-live', handleUserWentLive);

    return () => {
      socketService.off('user-went-live', handleUserWentLive);
    };
  }, []);

  if (loading || !user || isFetching) {
    return <LoadingSpinner />;
  }

  const filteredOnline = allUsers.filter(u => {
    if (!u.isOnline) return false;
    if (selectedContinent === 'All') return true;
    return CONTINENT_MAPPING[selectedContinent]?.includes(u.country_code);
  });

  const filteredLive = allUsers.filter(u => {
    if (!u.isLive) return false;
    if (selectedContinent === 'All') return true;
    return CONTINENT_MAPPING[selectedContinent]?.includes(u.country_code);
  });

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
      {item.isLive && (
        <>
          <LiveBadge />
          <View style={styles.viewerBadge}>
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/709/709612.png' }} // Simple eye icon placeholder
              style={styles.eyeIcon}
              tintColor="white"
            />
            <Text style={styles.viewerText}>{item.viewer_count || '1.1k'}</Text>
          </View>
        </>
      )}
      <View style={styles.overlay}>
        <View style={styles.infoRow}>
          <Text style={styles.username} numberOfLines={1}>{item.name} {item.country_flag}</Text>
          <View style={styles.onlineDot} />
        </View>
      </View>
      <TouchableOpacity
        style={styles.callButton}
        onPress={async () => {
          hapticService.mediumImpact();
          if (isMale) {
            const currentCoins = await ledgerService.getBalance();
            const price = item.call_price || 50;
            if (currentCoins < price) {
              setRequiredCoins(price);
              setShowLowBalance(true);
              return;
            }
          }
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

  const activeOpacity = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [1, 0.4],
    extrapolate: 'clamp'
  });

  const liveOpacity = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [0.4, 1],
    extrapolate: 'clamp'
  });

  const activeScale = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [1, 0.9],
    extrapolate: 'clamp'
  });

  const liveScale = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [0.9, 1],
    extrapolate: 'clamp'
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => {
            hapticService.lightImpact();
            scrollViewRef.current?.scrollTo({ x: 0, animated: true });
          }}>
            <Animated.Text style={[
              styles.headerTitle,
              { opacity: activeOpacity, transform: [{ scale: activeScale }] }
            ]}>
              Active Now
            </Animated.Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            hapticService.lightImpact();
            scrollViewRef.current?.scrollTo({ x: width, animated: true });
          }}>
            <Animated.Text style={[
              styles.headerTitle,
              { marginLeft: 15, opacity: liveOpacity, transform: [{ scale: liveScale }] }
            ]}>
              Live Streams
            </Animated.Text>
          </TouchableOpacity>
        </View>
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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Quiet in here!</Text>
                <Text style={styles.emptyText}>No users are online in this region right now. Check back in a few minutes!</Text>
              </View>
            }
          />
        </View>
        <View style={{ width }}>
          <FlashList
            data={filteredLive}
            renderItem={renderItem}
            estimatedItemSize={ITEM_HEIGHT}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Stage is Empty</Text>
                <Text style={styles.emptyText}>No live streams available in this region. Swipe back to Active users!</Text>
              </View>
            }
          />
        </View>
      </Animated.ScrollView>

      <LowBalanceSheet
        visible={showLowBalance}
        onClose={() => setShowLowBalance(false)}
        navigation={navigation}
        required={requiredCoins}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
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
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  viewerBadge: {
    position: 'absolute',
    bottom: 45,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eyeIcon: { width: 12, height: 12, marginRight: 4 },
  viewerText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
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
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 16, lineHeight: 22, marginTop: 20 },
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
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 30, alignItems: 'center' },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#EEE', borderRadius: 3, marginBottom: 20 },
  sheetIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  sheetSubtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
  rechargeCTA: { width: '100%', height: 55, backgroundColor: COLORS.primary, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rechargeCTAText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginRight: 10 },
  closeSheetBtn: { marginTop: 20, padding: 10 },
  closeSheetText: { color: COLORS.textSecondary, fontWeight: '600' }
});

export default HomeScreen;
