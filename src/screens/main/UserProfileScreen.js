// src/screens/main/UserProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions, Modal } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Award, ChevronLeft, Gift, ArrowUpCircle, MessageCircle, Phone, Heart, X, User as UserIcon } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { socketService } from '../../services/socketService';
import { getGiftAsset } from '../../services/giftingService';
import { hapticService } from '../../services/hapticService';
import VIPBadge from '../../components/VIPBadge';
import GiftingLeaderboard from '../../components/GiftingLeaderboard';
import GlowAvatar from '../../components/GlowAvatar';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

const UserProfileScreen = ({ route, navigation }) => {
  const { userId, name, totalSpent = 0, isOnline = false, isRankOne = false, isBusy = false } = route.params;
  const [currentUser, setCurrentUser] = useState(null);
  const [upvotes, setUpvotes] = useState(Math.floor(Math.random() * 100)); // Mock
  const [totalReceivedCount, setTotalReceivedCount] = useState(Math.floor(Math.random() * 50)); // Mock
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Mock profile data for this user
  const profileData = {
    gender: userId.startsWith('f') ? 'female' : 'male',
    bio: 'Just here to meet amazing people and collect rare gifts! ✨',
    photos: [
       'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=600',
       'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=600',
       'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&h=600',
    ]
  };

  useEffect(() => {
    loadCurrentUser();
    socketService.emitProfileView('current_user_id', userId);
  }, [userId]);

  const loadCurrentUser = async () => {
    const p = await dbService.getUserProfile('current_user_id');
    setCurrentUser(p);
  };

  const handleUpvote = async () => {
    setUpvotes(prev => prev + 1);
    hapticService.success();
  };

  if (!currentUser) return null;

  const isFemaleProfile = profileData.gender === 'female';
  const isMaleViewer = currentUser.gender === 'male';

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
           <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          <GlowAvatar size={100} isRankOne={isRankOne} isOnline={isOnline} isBusy={isBusy} />
        </View>

        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
          <VIPBadge totalSpent={totalSpent} />
        </View>
        <Text style={styles.bio}>{profileData.bio}</Text>

        <View style={styles.actionRow}>
           {/* Male view of Female: Call & Gift */}
           {isMaleViewer && isFemaleProfile ? (
             <>
               <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('VideoCall', { name, userId })}>
                  <Phone color="white" size={20} />
                  <Text style={styles.primaryActionText}>Call Now</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.secondaryAction} onPress={() => hapticService.lightImpact()}>
                  <Gift color={COLORS.primary} size={20} />
                  <Text style={styles.secondaryActionText}>Gift</Text>
               </TouchableOpacity>
             </>
           ) : (
             <>
               <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('ChatDetail', { name, userId, totalSpent })}>
                  <MessageCircle color="white" size={20} />
                  <Text style={styles.primaryActionText}>Message</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.secondaryAction} onPress={() => hapticService.lightImpact()}>
                  <Heart color={COLORS.primary} size={20} />
                  <Text style={styles.secondaryActionText}>Follow</Text>
               </TouchableOpacity>
             </>
           )}
        </View>
      </View>

      {/* Profile Photo Gallery */}
      <View style={styles.galleryContainer}>
         <Text style={styles.sectionTitle}>Gallery</Text>
         <View style={styles.photoGrid}>
            {profileData.photos.map((photo, index) => (
              <TouchableOpacity key={index} style={styles.photoWrapper} onPress={() => { hapticService.lightImpact(); setSelectedPhoto(photo); }}>
                 <Image source={photo} style={styles.photo} cachePolicy="memory-disk" />
              </TouchableOpacity>
            ))}
         </View>
      </View>

      <View style={styles.dashboard}>
        <View style={styles.dashItem}>
          <Gift color={COLORS.primary} size={24} />
          <Text style={styles.dashValue}>{totalReceivedCount}</Text>
          <Text style={styles.dashLabel}>{isFemaleProfile ? 'Total Love' : 'Gifts Received'}</Text>
        </View>
        <TouchableOpacity style={styles.dashItem} onPress={handleUpvote}>
          <ArrowUpCircle color="#4CD964" size={24} />
          <Text style={styles.dashValue}>{upvotes}</Text>
          <Text style={styles.dashLabel}>Upvotes</Text>
        </TouchableOpacity>
        <View style={styles.dashItem}>
          <ArrowUpCircle color="#007AFF" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={styles.dashValue}>{totalSpent}</Text>
          <Text style={styles.dashLabel}>{!isFemaleProfile ? 'Total Contributed' : 'Gifts Sent'}</Text>
        </View>
      </View>

      <View style={styles.leaderboardSection}>
         <Text style={styles.sectionTitle}>Top Contributors</Text>
         <GiftingLeaderboard />
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
  header: { alignItems: 'center', paddingVertical: 30, backgroundColor: COLORS.white, position: 'relative' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  avatarContainer: { marginBottom: 15, marginTop: 20 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 24, fontWeight: 'bold', marginRight: 5 },
  bio: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, paddingHorizontal: 40, textAlign: 'center' },

  actionRow: { flexDirection: 'row', width: '80%', justifyContent: 'space-between' },
  primaryAction: { flex: 1, height: 45, backgroundColor: COLORS.primary, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  primaryActionText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  secondaryAction: { flex: 1, height: 45, backgroundColor: '#FFF5F7', borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary },
  secondaryActionText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },

  galleryContainer: { backgroundColor: 'white', marginTop: 10, paddingVertical: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  photoWrapper: { width: (width - 40) / 3, height: (width - 40) / 3, margin: 5, borderRadius: 10, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },

  dashboard: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingVertical: 20, marginTop: 10 },
  dashItem: { flex: 1, alignItems: 'center' },
  dashValue: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  dashLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },

  leaderboardSection: { marginTop: 10, paddingHorizontal: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 15 },

  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeLightbox: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  lightboxImage: { width: width, height: height * 0.8 }
});

export default UserProfileScreen;
