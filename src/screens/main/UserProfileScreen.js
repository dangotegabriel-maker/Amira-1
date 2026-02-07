// src/screens/main/UserProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Award, ChevronLeft, Coins, Gift, ArrowUpCircle, MessageCircle } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { socketService } from '../../services/socketService';
import { getGiftAsset } from '../../services/giftingService';
import VIPBadge from '../../components/VIPBadge';
import GiftingLeaderboard from '../../components/GiftingLeaderboard';
import GlowAvatar from '../../components/GlowAvatar';

const { width } = Dimensions.get('window');

const UserProfileScreen = ({ route, navigation }) => {
  const { userId, name, totalSpent = 0, isOnline = false, isRankOne = false } = route.params;
  const [upvotes, setUpvotes] = useState(Math.floor(Math.random() * 100)); // Mock
  const [totalReceivedCount, setTotalReceivedCount] = useState(Math.floor(Math.random() * 50)); // Mock

  // Mock received gifts for this user
  const receivedGifts = {
    'p1': Math.floor(Math.random() * 10),
    'l11': Math.floor(Math.random() * 2)
  };

  useEffect(() => {
    // Trigger Profile View Event
    socketService.emitProfileView('current_user_id', userId);
    // In a real app, we'd also call backend to record view
  }, [userId]);

  const trophyData = Object.entries(receivedGifts).map(([id, count]) => {
    const asset = getGiftAsset(id);
    return { id, count, name: asset.name };
  });

  const handleUpvote = async () => {
    // In a real app, send to backend
    setUpvotes(prev => prev + 1);
    console.log(`Upvoted user: ${userId}`);
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
           <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <View style={styles.avatarContainer}>
          <GlowAvatar size={100} isRankOne={isRankOne} isOnline={isOnline} />
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
          <VIPBadge totalSpent={totalSpent} />
        </View>
        <Text style={styles.bio}>Just here to meet amazing people and collect rare gifts! ✨</Text>

        <View style={styles.actionRow}>
           <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('ChatDetail', { name, userId, totalSpent })}>
              <MessageCircle color="white" size={20} />
              <Text style={styles.primaryActionText}>Message</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.secondaryAction} onPress={handleUpvote}>
              <ArrowUpCircle color={COLORS.primary} size={20} />
              <Text style={styles.secondaryActionText}>Upvote</Text>
           </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dashboard}>
        <View style={styles.dashItem}>
          <Gift color={COLORS.primary} size={24} />
          <Text style={styles.dashValue}>{totalReceivedCount}</Text>
          <Text style={styles.dashLabel}>Gifts Received</Text>
        </View>
        <View style={styles.dashItem}>
          <ArrowUpCircle color="#4CD964" size={24} />
          <Text style={styles.dashValue}>{upvotes}</Text>
          <Text style={styles.dashLabel}>Upvotes</Text>
        </View>
        <View style={styles.dashItem}>
          <ArrowUpCircle color="#007AFF" size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={styles.dashValue}>{totalSpent}</Text>
          <Text style={styles.dashLabel}>Gifts Sent</Text>
        </View>
      </View>

      {/* Trophy Cabinet */}
      <View style={styles.trophySection}>
        <Text style={styles.sectionTitle}>{name}'s Trophy Cabinet</Text>
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

      <View style={styles.leaderboardSection}>
         <Text style={styles.sectionTitle}>Top Contributors</Text>
         <GiftingLeaderboard />
      </View>

      <View style={{ height: 50 }} />
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

  dashboard: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingVertical: 20, marginTop: 20 },
  dashItem: { flex: 1, alignItems: 'center' },
  dashValue: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  dashLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '500' },

  trophySection: { marginTop: 10, backgroundColor: COLORS.white, padding: 20 },
  leaderboardSection: { marginTop: 10, paddingHorizontal: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 10 },
  trophyCabinet: { flexDirection: 'row' },
  trophyItem: { alignItems: 'center', marginRight: 20, width: 80 },
  trophyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF5F7', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  trophyCount: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  trophyName: { fontSize: 12, color: COLORS.textSecondary },
  emptyTrophyText: { color: COLORS.textSecondary, fontStyle: 'italic' },
});

export default UserProfileScreen;
