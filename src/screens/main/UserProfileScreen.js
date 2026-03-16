import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions, Modal, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Award, ChevronLeft, Gift, ArrowUpCircle, MessageCircle, Phone, Heart, X, Coins, ChevronRight } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { socketService } from '../../services/socketService';
import { hapticService } from '../../services/hapticService';
import VIPBadge from '../../components/VIPBadge';
import GiftingLeaderboard from '../../components/GiftingLeaderboard';
import GlowAvatar from '../../components/GlowAvatar';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

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

const UserProfileScreen = ({ route, navigation }) => {
  const { userId, name } = route.params;
  const [currentUser, setCurrentUser] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showLowBalance, setShowLowBalance] = useState(false);

  useEffect(() => {
    loadData();
    socketService.emitProfileView('current_user_id', userId);
  }, [userId]);

  const loadData = async () => {
    const p = await dbService.getUserProfile('current_user_id');
    const t = await dbService.getUserProfile(userId);
    setCurrentUser(p);
    setTargetUser(t);
  };

  if (!targetUser || !currentUser) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );

  const isFemaleProfile = targetUser.gender === 'female';
  const isMaleViewer = currentUser.gender === 'male';

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
           <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>

        <GlowAvatar size={100} isOnline={true} />

        <View style={styles.nameContainer}>
          <Text style={styles.name}>{targetUser.name}</Text>
          <VIPBadge totalSpent={6000} />
        </View>
        <Text style={styles.bio}>{targetUser.bio}</Text>

        <View style={styles.actionRow}>
           {isMaleViewer && isFemaleProfile ? (
             <>
               <TouchableOpacity style={styles.primaryAction} onPress={async () => {
                 const currentCoins = await ledgerService.getBalance();
                 const price = targetUser.call_price || 50;
                 if (currentCoins < price) {
                   setShowLowBalance(true);
                   return;
                 }
                 navigation.navigate('VideoCall', { name: targetUser.name, userId: targetUser.uid });
               }}>
                  <Phone color="white" size={20} />
                  <Text style={styles.primaryActionText}>Call Now</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.secondaryAction}>
                  <Gift color={COLORS.primary} size={20} />
                  <Text style={styles.secondaryActionText}>Gift</Text>
               </TouchableOpacity>
             </>
           ) : (
             <>
               <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('ChatDetail', { name: targetUser.name, userId: targetUser.uid })}>
                  <MessageCircle color="white" size={20} />
                  <Text style={styles.primaryActionText}>Message</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.secondaryAction}>
                  <Heart color={COLORS.primary} size={20} />
                  <Text style={styles.secondaryActionText}>Follow</Text>
               </TouchableOpacity>
             </>
           )}
        </View>
      </View>

      <View style={styles.galleryContainer}>
         <Text style={styles.sectionTitle}>Gallery</Text>
         <View style={styles.photoGrid}>
            {targetUser.photos?.map((photo, index) => (
              <TouchableOpacity key={index} style={styles.photoWrapper} onPress={() => setSelectedPhoto(photo)}>
                 <Image source={photo} style={styles.photo} />
              </TouchableOpacity>
            ))}
         </View>
      </View>

      <GiftingLeaderboard />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={renderHeader}
        style={styles.container}
      />
      <LowBalanceSheet
        visible={showLowBalance}
        onClose={() => setShowLowBalance(false)}
        navigation={navigation}
        required={targetUser?.call_price || 50}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { alignItems: 'center', paddingVertical: 40, backgroundColor: 'white' },
  backButton: { position: 'absolute', top: 50, left: 20 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
  name: { fontSize: 24, fontWeight: 'bold' },
  bio: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5, paddingHorizontal: 40, textAlign: 'center' },
  actionRow: { flexDirection: 'row', width: '80%', justifyContent: 'space-between', marginTop: 20 },
  primaryAction: { flex: 1, height: 45, backgroundColor: COLORS.primary, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  primaryActionText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  secondaryAction: { flex: 1, height: 45, backgroundColor: '#FFF5F7', borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary },
  secondaryActionText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },
  galleryContainer: { backgroundColor: 'white', marginTop: 10, paddingVertical: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  photoWrapper: { width: (width - 40) / 3, height: (width - 40) / 3, margin: 5, borderRadius: 10, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8' },
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

export default UserProfileScreen;
