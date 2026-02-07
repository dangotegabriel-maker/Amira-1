import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions, Modal } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Settings, Award, ChevronRight, Coins, Gift, ArrowUpCircle, Eye, Clock, User as UserIcon, X } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { getGiftAsset } from '../../services/giftingService';
import { hapticService } from '../../services/hapticService';
import { useIsFocused } from '@react-navigation/native';
import VIPBadge from '../../components/VIPBadge';
import GlowAvatar from '../../components/GlowAvatar';
import { Image } from 'expo-image';

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

  const menuItems = [
    { icon: <Award size={20} color="#FFD700" />, label: 'Global Leaderboard', screen: 'Leaderboard' },
    { icon: <Gift size={20} color={COLORS.primary} />, label: 'My Gift Cabinet', screen: 'GiftLedger', params: { type: 'received' } },
    ...(isMale ? [{ icon: <Coins size={20} color="#FFD700" />, label: 'Recharge Hub', screen: 'RechargeHub' }] : []),
    { icon: <Award size={20} color={COLORS.primary} />, label: 'VIP Store', screen: 'VIPStore' },
    { icon: <Settings size={20} color="#666" />, label: 'Settings', screen: 'Settings' },
  ];

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
          onPress={() => { hapticService.lightImpact(); navigation.navigate('EditProfile'); }}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Gallery Grid */}
      <View style={styles.galleryContainer}>
         <Text style={styles.sectionTitle}>My Gallery</Text>
         <View style={styles.photoGrid}>
            {user.photos?.map((photo, index) => (
              <TouchableOpacity key={index} style={styles.photoWrapper} onPress={() => { hapticService.lightImpact(); setSelectedPhoto(photo); }}>
                 <Image source={photo} style={styles.photo} cachePolicy="memory-disk" />
              </TouchableOpacity>
            ))}
            {[...Array(Math.max(0, 9 - (user.photos?.length || 0)))].map((_, i) => (
               <View key={`empty-${i}`} style={[styles.photoWrapper, styles.emptyPhoto]}>
                  <UserIcon color="#DDD" size={24} />
               </View>
            ))}
         </View>
      </View>

      <View style={styles.dashboard}>
        <TouchableOpacity style={styles.dashItem} onPress={() => navigation.navigate('GiftLedger', { type: 'received' })}>
          <Gift color={COLORS.primary} size={24} />
          <Text style={styles.dashValue}>{totalReceivedCount}</Text>
          <Text style={styles.dashLabel}>{isMale ? 'Gifts Received' : 'Total Love'}</Text>
        </TouchableOpacity>
        <View style={styles.dashItem}>
          <ArrowUpCircle color="#4CD964" size={24} />
          <Text style={styles.dashValue}>{upvotes}</Text>
          <Text style={styles.dashLabel}>Upvotes</Text>
        </View>
        <TouchableOpacity style={styles.dashItem} onPress={() => navigation.navigate('GiftLedger', { type: 'sent' })}>
          <ArrowUpCircle color="#007AFF" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={styles.dashValue}>{totalSpent}</Text>
          <Text style={styles.dashLabel}>{isMale ? 'Total Contributed' : 'Gifts Sent'}</Text>
        </TouchableOpacity>
      </View>

      {/* Menu List */}
      <View style={styles.menuSection}>
         {menuItems.map((item, i) => (
           <TouchableOpacity
             key={i}
             style={styles.menuItem}
             onPress={() => { hapticService.lightImpact(); navigation.navigate(item.screen, item.params); }}
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
            <Image source={selectedPhoto} style={styles.lightboxImage} contentFit="contain" />
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

  dashboard: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingVertical: 20, marginTop: 10 },
  dashItem: { flex: 1, alignItems: 'center' },
  dashValue: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  dashLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },

  menuSection: { marginTop: 10, backgroundColor: COLORS.white },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { marginLeft: 15, fontSize: 16, fontWeight: '500', color: COLORS.text },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 15 },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeLightbox: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  lightboxImage: { width: width, height: height * 0.8 }
});
export default MyProfileScreen;
