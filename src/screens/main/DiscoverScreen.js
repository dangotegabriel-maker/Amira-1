import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Alert, ScrollView, Image } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { X, Heart, Star, MoreHorizontal, Plus } from 'lucide-react-native';
import { moderationService } from '../../services/moderationService';
import AnchoredMenu from '../../components/AnchoredMenu';

const { width } = Dimensions.get('window');

const DiscoverScreen = () => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const likeScale = useRef(new Animated.Value(1)).current;
  const dislikeScale = useRef(new Animated.Value(1)).current;
  const superlikeScale = useRef(new Animated.Value(1)).current;

  const animateButton = (scaleValue) => {
    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 1.2,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLike = () => {
    animateButton(likeScale);
    console.log("Liked!");
    // In a real app, we might use a Toast library here. Using Alert as a fallback for visibility.
  };

  const handleDislike = () => {
    animateButton(dislikeScale);
    console.log("Disliked!");
  };

  const handleSuperlike = () => {
    animateButton(superlikeScale);
    console.log("Superliked!");
  };

  const handleBlock = async (name, userId) => {
    await moderationService.blockUser('current_user_id', userId);
    Alert.alert("Blocked", `${name} has been blocked.`);
  };

  const menuOptions = selectedUser ? [
    { label: "Report", onPress: () => console.log(`Report ${selectedUser.name}`) },
    { label: "Block", onPress: () => handleBlock(selectedUser.name, selectedUser.id), destructive: true },
  ] : [];

  const stories = [
    { id: '1', name: 'My Story', isMe: true },
    { id: '2', name: 'Jessica' },
    { id: '3', name: 'Mark' },
    { id: '4', name: 'Sarah' },
    { id: '5', name: 'David' },
    { id: '6', name: 'Emma' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
          {stories.map(story => (
            <TouchableOpacity key={story.id} style={styles.storyItem}>
              <View style={[styles.storyAvatar, story.isMe && styles.myStory]}>
                <View style={styles.avatarPlaceholder} />
                {story.isMe && (
                  <View style={styles.addStoryBadge}>
                    <Plus color={COLORS.white} size={10} />
                  </View>
                )}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{story.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <AnchoredMenu
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        options={menuOptions}
        anchorPosition={menuPosition}
      />
      <View style={styles.card}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>User Image</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.name}>Jessica, 24</Text>
            <TouchableOpacity
              onPress={(e) => {
                const { pageX, pageY } = e.nativeEvent;
                setMenuPosition({ x: pageX, y: pageY });
                setSelectedUser({ name: 'Jessica', id: '1' });
                setIsMenuVisible(true);
              }}
            >
              <MoreHorizontal color={COLORS.textSecondary} size={24} />
            </TouchableOpacity>
          </View>
          <Text style={styles.bio}>Loves hiking and coffee. Let's explore!</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Animated.View style={{ transform: [{ scale: dislikeScale }] }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dislike]}
            onPress={handleDislike}
          >
            <X color="#FF3B30" size={32} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: superlikeScale }] }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.superlike]}
            onPress={handleSuperlike}
          >
            <Star color="#007AFF" size={24} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.like]}
            onPress={handleLike}
          >
            <Heart color="#4CD964" size={32} fill="#4CD964" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8', alignItems: 'center' },
  storiesContainer: {
    width: '100%',
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingTop: 50
  },
  storiesScroll: { paddingHorizontal: 15 },
  storyItem: { alignItems: 'center', marginRight: 15, width: 65 },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 2,
    marginBottom: 5
  },
  myStory: { borderColor: '#DDD' },
  avatarPlaceholder: { flex: 1, backgroundColor: '#EEE', borderRadius: 28 },
  addStoryBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white
  },
  storyName: { fontSize: 11, color: COLORS.textSecondary },
  card: { width: width * 0.9, height: '60%', backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, marginTop: 20 },
  imagePlaceholder: { flex: 1, backgroundColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#888', fontSize: 18 },
  cardInfo: { padding: 20 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  bio: { fontSize: 16, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 30 },
  actionButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginHorizontal: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3 },
  dislike: { borderColor: '#FF3B30', borderWidth: 1 },
  superlike: { borderColor: '#007AFF', borderWidth: 1, width: 50, height: 50 },
  like: { borderColor: '#4CD964', borderWidth: 1 },
});

export default DiscoverScreen;
