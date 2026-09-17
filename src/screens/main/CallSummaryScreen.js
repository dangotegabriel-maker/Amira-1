import React, { useEffect, useState } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Star, UserPlus, Home, Check } from 'lucide-react-native';
import { hapticService } from '../../services/hapticService';
import { followService } from '../../services/followService';
import { callReviewService } from '../../services/callReviewService';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const CallSummaryScreen = ({ route, navigation }) => {
  const { callId, duration, coinsSpent, targetUserId, targetUserName, targetUserPhoto, isConsumer } = route.params;
  const [rating, setRating] = useState(0);
  const [relationship, setRelationship] = useState(null);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !targetUserId) return undefined;
    return followService.subscribeRelationship(targetUserId, setRelationship, () => setRelationship(null));
  }, [focused, targetUserId]);
  useEffect(() => {
    if (!callId || !focused) return undefined;
    let active = true;
    callReviewService.status(callId).then((value) => { if (active) { setReview(value); setRating(value.rating || 0); } }).catch(() => {});
    return () => { active = false; };
  }, [callId, focused]);
  const isFollowing = relationship?.following;
  const handleFollow = async () => {
    if (!relationship?.valid || relationship.blocked || relationship.following || busy) return;
    setBusy(true);
    try { await followService.follow(targetUserId); }
    catch (error) { Alert.alert('Unable to follow', error.message); }
    finally { setBusy(false); }
  };
  const handleRating = (value) => { if (!review?.rating && !busy) { hapticService.lightImpact(); setRating(value); } };
  const submitReview = async () => {
    if (!rating || busy) return;
    setBusy(true);
    try { const result = await callReviewService.submit(callId, rating); setReview({ eligible: true, rating: result.rating }); }
    catch (error) { Alert.alert('Review not saved', error.message); }
    finally { setBusy(false); }
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
          {isConsumer === true && <View style={styles.statBox}>
            <Text style={styles.statLabel}>Credits used</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{coinsSpent ?? 0}</Text>
          </View>}
        </View>

        <View style={styles.interactionSection}>
          {review?.eligible && <><Text style={styles.sectionTitle}>{review.rating ? 'Thank you for your review' : 'How was your call?'}</Text>
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

          {!review.rating && <TouchableOpacity disabled={!rating || busy} onPress={submitReview}><Text style={{ color: COLORS.primary, marginBottom: 20 }}>Submit review</Text></TouchableOpacity>}</>}
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={handleFollow}
            disabled={!relationship?.valid || relationship?.blocked || isFollowing || busy}
          >
            {isFollowing ? <Check color="white" size={20} /> : <UserPlus color="white" size={20} />}
            <Text style={styles.followBtnText}>{relationship?.blocked ? 'Unavailable' : relationship?.label || 'Checking relationship...'}</Text>
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
  scrollContent: { paddingBottom: 140, paddingTop: 80, paddingHorizontal: 30, alignItems: 'center' },
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
