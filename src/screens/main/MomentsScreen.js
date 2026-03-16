import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Heart, MessageCircle, Share2, EyeOff, Plus } from 'lucide-react-native';
import { TapGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { hapticService } from '../../services/hapticService';
import { useGifting } from '../../context/GiftingContext';
import { socketService } from '../../services/socketService';

const { width } = Dimensions.get('window');

const MomentsScreen = () => {
  const { triggerGiftOverlay } = useGifting();
  const [activeMoments, setActiveMoments] = useState([]);
  const [statusUsers, setStatusUsers] = useState([]);

  useEffect(() => {
    // Current time for expiry calculation
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const mockPosts = [
      {
        id: '1',
        user: 'Jessica',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100',
        content: 'Loving the beach! 🏖️',
        timestamp: now - (2 * 60 * 60 * 1000), // 2 hours ago
        isOnline: true,
        hasStory: true,
        userId: 'f1'
      },
      {
        id: '2',
        user: 'Emma',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
        content: 'New hair, who dis?',
        timestamp: now - (25 * 60 * 60 * 1000), // 25 hours ago (expired)
        isOnline: true,
        hasStory: true,
        userId: 'f2'
      },
      {
        id: '3',
        user: 'Sophia',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
        content: 'Coffee time ☕',
        timestamp: now - (10 * 60 * 60 * 1000), // 10 hours ago
        isOnline: false,
        hasStory: true,
        userId: 'f3'
      },
      {
        id: '4',
        user: 'Olivia',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        content: 'Working late...',
        timestamp: now - (23 * 60 * 60 * 1000), // 23 hours ago
        isOnline: true,
        hasStory: true,
        userId: 'f4'
      },
    ];

    // Filter posts to only show those within 24 hours
    const filtered = mockPosts.filter(post => (now - post.timestamp) < twentyFourHours);
    setActiveMoments(filtered);

    // Users for the status bar (WhatsApp style)
    const users = [
      { id: 'me', user: 'My Status', avatar: null, isMe: true },
      ...filtered.map(p => ({
        id: p.userId,
        user: p.user,
        avatar: p.avatar,
        isOnline: p.isOnline,
        hasStory: p.hasStory
      }))
    ];
    setStatusUsers(users);
  }, []);

  const onDoubleTap = (userId) => (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const heartGift = { id: 'p2', name: 'Finger Heart', cost: 5, icon: '🫰' };
      triggerGiftOverlay(heartGift.id, 'You', 1);
      socketService.sendGift(userId, { giftId: heartGift.id, combo: 1 });
      hapticService.success();
    }
  };

  const renderStatusBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.statusBar}
      contentContainerStyle={styles.statusContent}
    >
      {statusUsers.map((item) => (
        <TouchableOpacity key={item.id} style={styles.statusItem} onPress={() => hapticService.lightImpact()}>
          <View style={[
            styles.avatarContainer,
            item.hasStory && !item.isMe && styles.storyRing
          ]}>
            {item.isMe ? (
              <View style={styles.myStatusPlaceholder}>
                <Plus size={20} color="white" />
              </View>
            ) : (
              <Image source={{ uri: item.avatar }} style={styles.statusAvatar} />
            )}
            {item.isOnline && <View style={styles.statusOnlineDot} />}
          </View>
          <Text style={styles.statusName} numberOfLines={1}>
            {item.isMe ? 'My Status' : item.user}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderItem = ({ item }) => (
    <GestureHandlerRootView>
      <TapGestureHandler
        onHandlerStateChange={onDoubleTap(item.userId)}
        numberOfTaps={2}
      >
        <View style={styles.post}>
          <View style={styles.header}>
            <View style={styles.postAvatarContainer}>
              <Image source={{ uri: item.avatar }} style={styles.postAvatar} />
              {item.isOnline && <View style={styles.postOnlineDot} />}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.username}>{item.user}</Text>
              <Text style={styles.timeAgo}>
                {Math.floor((Date.now() - item.timestamp) / (1000 * 60 * 60))}h ago
              </Text>
            </View>
          </View>

          <View style={styles.imagePlaceholder}>
            <Image source={{ uri: item.avatar }} style={styles.postImage} blurRadius={2} />
            <View style={styles.imageOverlay}>
              <Text style={styles.content}>{item.content}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => hapticService.lightImpact()}>
                <Heart size={24} color={COLORS.text} style={styles.actionIcon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => hapticService.lightImpact()}>
                <MessageCircle size={24} color={COLORS.text} style={styles.actionIcon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => hapticService.lightImpact()}>
                <Share2 size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TapGestureHandler>
    </GestureHandlerRootView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.title}>Moments</Text>
      </View>
      <FlatList
        ListHeaderComponent={renderStatusBar}
        data={activeMoments}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  topHeader: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: 'white' },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  statusBar: { backgroundColor: 'white', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  statusContent: { paddingHorizontal: 15 },
  statusItem: { alignItems: 'center', marginRight: 20, width: 65 },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, padding: 2, justifyContent: 'center', alignItems: 'center' },
  storyRing: { borderWidth: 2, borderColor: '#FF2D55' }, // Amira Pink for stories
  statusAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEE' },
  myStatusPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  statusOnlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4CD964', borderWidth: 2, borderColor: 'white' },
  statusName: { fontSize: 11, color: COLORS.textSecondary, marginTop: 5, textAlign: 'center' },
  post: { backgroundColor: 'white', marginBottom: 10, paddingVertical: 15 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 12 },
  postAvatarContainer: { position: 'relative' },
  postAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEE' },
  postOnlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CD964', borderWidth: 2, borderColor: 'white' },
  headerText: { marginLeft: 12 },
  username: { fontWeight: 'bold', fontSize: 16, color: COLORS.text },
  timeAgo: { fontSize: 12, color: COLORS.textSecondary },
  imagePlaceholder: { width: '100%', height: 400, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  postImage: { width: '100%', height: '100%', opacity: 0.7 },
  imageOverlay: { position: 'absolute', padding: 20 },
  content: { fontSize: 22, color: 'white', fontWeight: 'bold', textAlign: 'center' },
  footer: { paddingHorizontal: 15, marginTop: 15 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { marginRight: 25 },
});

export default MomentsScreen;
