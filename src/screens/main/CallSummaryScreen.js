import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Star, UserPlus, Home, Check } from 'lucide-react-native';
import { hapticService } from '../../services/hapticService';
import { dbService } from '../../services/firebaseService';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const CallSummaryScreen = ({ route, navigation }) => {
  const { duration, coinsSpent, diamondsEarned, targetUserId, targetUserName, targetUserPhoto, isMale } = route.params;
  const [rating, setRating] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = async () => {
    hapticService.lightImpact();
    setIsFollowing(true);
    // Mock follow logic
    console.log(`Following user: ${targetUserId}`);
  };

  const handleRating = (r) => {
    hapticService.lightImpact();
    setRating(r);
    console.log(`Rated user ${targetUserId} with ${r} stars`);
  };

  const formatDuration = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Call Summary</Text>

        <View style={styles.avatarContainer}>
          <Image source={targetUserPhoto} style={styles.avatar} contentFit="cover" />
          <Text style={styles.userName}>{targetUserName}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{isMale ? 'Coins Spent' : 'Diamonds Earned'}</Text>
            <Text style={[styles.statValue, { color: isMale ? COLORS.primary : '#4CD964' }]}>
              {isMale ? `🪙 ${coinsSpent}` : `💎 ${diamondsEarned}`}
            </Text>
          </View>
        </View>

        <View style={styles.interactionSection}>
          <Text style={styles.sectionTitle}>How was your call?</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleRating(star)}>
                <Star
                  size={40}
                  color={star <= rating ? '#FFD700' : '#DDD'}
                  fill={star <= rating ? '#FFD700' : 'transparent'}
                  style={{ marginHorizontal: 5 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={handleFollow}
            disabled={isFollowing}
          >
            {isFollowing ? <Check color="white" size={20} /> : <UserPlus color="white" size={20} />}
            <Text style={styles.followBtnText}>{isFollowing ? 'Following' : `Follow ${targetUserName}`}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
      >
        <Home color="white" size={24} />
        <Text style={styles.homeBtnText}>Back to Discovery</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { paddingTop: 80, paddingHorizontal: 30, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 40 },
  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEE', marginBottom: 15 },
  userName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  statsContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', backgroundColor: '#F8F8F8', borderRadius: 20, padding: 20, marginBottom: 40 },
  statBox: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  interactionSection: { width: '100%', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 20 },
  ratingRow: { flexDirection: 'row', marginBottom: 30 },
  followBtn: { width: '100%', height: 55, backgroundColor: COLORS.primary, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  followingBtn: { backgroundColor: '#4CD964' },
  followBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  homeBtn: { position: 'absolute', bottom: 40, left: 30, right: 30, height: 55, backgroundColor: '#111', borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  homeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 }
});

export default CallSummaryScreen;
