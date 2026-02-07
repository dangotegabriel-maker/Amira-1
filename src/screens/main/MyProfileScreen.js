import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions, Image, Modal } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Settings, Award, ChevronRight, Coins, Gift, ArrowUpCircle, Eye, Clock, User, X } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { getGiftAsset } from '../../services/giftingService';
import { useIsFocused } from '@react-navigation/native';
import VIPBadge from '../../components/VIPBadge';
import GlowAvatar from '../../components/GlowAvatar';

const { width } = Dimensions.get('window');

const MyProfileScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [upvotes, setUpvotes] = useState(0);
  const [totalReceivedCount, setTotalReceivedCount] = useState(0);
  const [profileViews, setProfileViews] = useState(0);
  const [receivedGifts, setReceivedGifts] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    const profile = await dbService.getUserProfile('current_user_id');
    const b = await ledgerService.getBalance();
    const s = await ledgerService.getTotalSpent();
    const u = await ledgerService.getUpvotes();
    const trc = await ledgerService.getTotalGiftsReceived();
    const v = await ledgerService.getProfileViews();
    const r = await ledgerService.getReceivedGifts();

    setUser(profile);
    setBalance(b);
    setTotalSpent(s);
    setUpvotes(u);
    setTotalReceivedCount(trc);
    setProfileViews(v);
    setReceivedGifts(r);
  };

  const trophyData = Object.entries(receivedGifts).map(([id, count]) => {
    const asset = getGiftAsset(id);
    return { id, count, name: asset.name };
  });

  if (!user) return null;

  const isMale = user.gender === 'male';

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <GlowAvatar size={100} isOnline={true} />
          <View style={styles.vipBadgeContainer}>
            <VIPBadge totalSpent={totalSpent} />
          </View>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{user.name}</Text>
          <VIPBadge totalSpent={totalSpent} />
        </View>
        <Text style={styles.bio}>{user.bio}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Gallery Grid */}
      <View style={styles.galleryContainer}>
         <Text style={styles.sectionTitle}>Gallery</Text>
         <View style={styles.photoGrid}>
            {user.photos?.map((photo, index) => (
              <TouchableOpacity key={index} style={styles.photoWrapper} onPress={() => setSelectedPhoto(photo)}>
                 <Image source={{ uri: photo }} style={styles.photo} />
              </TouchableOpacity>
            ))}
            {[...Array(Math.max(0, 9 - (user.photos?.length || 0)))].map((_, i) => (
               <View key={`empty-${i}`} style={[styles.photoWrapper, styles.emptyPhoto]}>
                  <User color="#DDD" size={24} />
               </View>
            ))}
         </View>
      </View>

      <View style={styles.dashboard}>
        <TouchableOpacity style={styles.dashItem} onPress={() => navigation.navigate('GiftLedger', { type: 'received' })}>
          <Gift color={COLORS.primary} size={24} />
          <Text style={styles.dashValue}>{totalReceivedCount}</Text>
          <Text style={styles.dashLabel}>{isMale ? 'Gifts Received' : 'Total Earnings'}</Text>
        </TouchableOpacity>
        <View style={styles.dashItem}>
          <ArrowUpCircle color="#4CD964" size={24} />
          <Text style={styles.dashValue}>{upvotes}</Text>
          <Text style={styles.dashLabel}>Upvotes</Text>
        </View>
        <TouchableOpacity style={styles.dashItem} onPress={() => navigation.navigate('GiftLedger', { type: 'sent' })}>
          <ArrowUpCircle color="#007AFF" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={styles.dashValue}>{totalSpent}</Text>
          <Text style={styles.dashLabel}>{isMale ? 'Total Contribution' : 'Gifts Sent'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        {isMale && (
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('RechargeHub')}>
            <Coins color="#FFD700" size={24} />
            <Text style={styles.statValue}>{balance}</Text>
            <Text style={styles.statLabel}>Recharge</Text>
          </TouchableOpacity>
        )}
        {!isMale && (
           <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Wallet')}>
              <Coins color="#FFD700" size={24} />
              <Text style={styles.statValue}>{balance}</Text>
              <Text style={styles.statLabel}>Diamonds</Text>
           </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('VIPStore')}>
          <Award color="#FFD700" size={24} />
          <Text style={styles.statValue}>{totalSpent > 5000 ? 'Gold' : totalSpent > 1000 ? 'Silver' : 'Member'}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </TouchableOpacity>
      </View>

      {/* Trophy Cabinet */}
      <View style={styles.trophySection}>
        <Text style={styles.sectionTitle}>Trophy Cabinet</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trophyCabinet}>
          {trophyData.length > 0 ? trophyData.map((item) => (
            <View key={item.id} style={styles.trophyItem}>
              <View style={styles.trophyIcon}>
                <Award color={COLORS.primary} size={32} />
              </View>
              <Text style={styles.trophyCount}>x{item.count}</Text>
              <Text style={styles.trophyName} numberOfLines={1}>{item.name || 'Gift'}</Text>
            </View>
          )) : (
            <Text style={styles.emptyTrophyText}>No gifts received yet.</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.menu}>
        {[
          { icon: <Award size={20} color="#FFD700" />, label: 'Leaderboard', screen: 'Leaderboard' },
          { icon: <Settings size={20} color="#666" />, label: 'Settings', screen: 'Settings' },
          { icon: <Coins size={20} color="#FFD700" />, label: 'Recharge Hub', screen: 'RechargeHub' },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.menuItemLeft}>
              {item.icon}
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <ChevronRight size={20} color="#CCC" />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 50 }} />

      {/* Lightbox Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
         <View style={styles.lightbox}>
            <TouchableOpacity style={styles.closeLightbox} onPress={() => setSelectedPhoto(null)}>
               <X color="white" size={32} />
            </TouchableOpacity>
            <Image source={{ uri: selectedPhoto }} style={styles.lightboxImage} resizeMode="contain" />
         </View>
      </Modal>
    </View>
  );

  return (
    <FlatList
      data={[]}
      renderItem={null}
      ListHeaderComponent={renderHeader}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: COLORS.white },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  vipBadgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    elevation: 2,
  },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 24, fontWeight: 'bold', marginRight: 5 },
  bio: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 15, paddingHorizontal: 40, textAlign: 'center' },
  editButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  editButtonText: { color: COLORS.textSecondary },

  galleryContainer: { backgroundColor: 'white', marginTop: 10, paddingVertical: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  photoWrapper: { width: (width - 40) / 3, height: (width - 40) / 3, margin: 5, borderRadius: 10, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  emptyPhoto: { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderStyle: 'dashed' },

  dashboard: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingVertical: 20 },
  dashItem: { flex: 1, alignItems: 'center' },
  dashValue: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  dashLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },

  stats: { flexDirection: 'row', backgroundColor: COLORS.white, marginTop: 10, paddingVertical: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },

  trophySection: { marginTop: 10, backgroundColor: COLORS.white, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 15 },
  trophyCabinet: { flexDirection: 'row' },
  trophyItem: { alignItems: 'center', marginRight: 20, width: 80 },
  trophyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF5F7', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  trophyCount: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  trophyName: { fontSize: 12, color: COLORS.textSecondary },
  emptyTrophyText: { color: COLORS.textSecondary, fontStyle: 'italic' },

  menu: { marginTop: 20, backgroundColor: COLORS.white },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { marginLeft: 15, fontSize: 16 },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeLightbox: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  lightboxImage: { width: width, height: height * 0.8 }
});
export default MyProfileScreen;
