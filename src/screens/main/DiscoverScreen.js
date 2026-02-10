import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Alert, ScrollView } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { X, Heart, Star, MoreHorizontal, Plus } from 'lucide-react-native';
import { moderationService } from '../../services/moderationService';
import { dbService } from '../../services/firebaseService';
import AnchoredMenu from '../../components/AnchoredMenu';
import GlowAvatar from '../../components/GlowAvatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useNavigation } from '@react-navigation/native';
import { hapticService } from '../../services/hapticService';
import { Image } from 'expo-image';
import { useUser } from '../../context/UserContext';

const { width } = Dimensions.get('window');

const DiscoverScreen = () => {
  const navigation = useNavigation();
  const { user: currentUser, loading } = useUser();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const likeScale = useRef(new Animated.Value(1)).current;
  const dislikeScale = useRef(new Animated.Value(1)).current;
  const superlikeScale = useRef(new Animated.Value(1)).current;

  // Mock Discover Users with priority data
  const discoverUsers = [
    {
      id: 'f1',
      name: 'Jessica',
      age: 24,
      gender: 'female',
      bio: 'Loves hiking and coffee. Let\'s explore!',
      photos: [
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=600',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=600',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&h=600',
      ],
      isOnline: true,
      responseRate: 98,
      giftsReceived: 450
    },
    {
      id: 'f2',
      name: 'Emma',
      age: 22,
      gender: 'female',
      bio: 'Music is my life. 🎵',
      photos: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=600',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=600',
      ],
      isOnline: true,
      responseRate: 92,
      giftsReceived: 210
    }
  ];


  // Auto-rotating gallery logic with Cinematic Cross-Fade
  useEffect(() => {
    if (!targetDisplayUser || targetDisplayUser.photos.length <= 1) return;

    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % targetDisplayUser.photos.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [currentUser, currentPhotoIndex]);

  const animateButton = (scaleValue) => {
    Animated.sequence([
      Animated.spring(scaleValue, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      Animated.spring(scaleValue, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const handleLike = () => {
    animateButton(likeScale);
    hapticService.mediumImpact();
  };

  const handleDislike = () => {
    animateButton(dislikeScale);
    hapticService.lightImpact();
  };

  const handleSuperlike = () => {
    animateButton(superlikeScale);
    hapticService.heavyImpact();
  };

  const handleBlock = async (name, userId) => {
    await moderationService.blockUser('current_user_id', userId);
    Alert.alert("Blocked", `${name} has been blocked.`);
  };

  const menuOptions = selectedUser ? [
    { label: "Report", onPress: () => console.log(`Report ${selectedUser.name}`) },
    { label: "Block", onPress: () => handleBlock(selectedUser.name, selectedUser.id), destructive: true },
  ] : [];

  useEffect(() => {
    if (!loading && currentUser && !currentUser.gender) {
      navigation.navigate('GenderSetup');
    }
  }, [loading, currentUser]);

  if (loading || !currentUser) return <LoadingSpinner />;

  // PRIORITY ALGORITHM: For Males, show females with highest giftsReceived/responseRate first
  const sortedUsers = [...discoverUsers]
    .filter(u => u.gender !== currentUser.gender)
    .sort((a, b) => (b.giftsReceived + b.responseRate) - (a.giftsReceived + a.responseRate));

  const targetDisplayUser = sortedUsers[0] || discoverUsers[0];

  const stories = [
    { id: '1', name: 'My Story', isMe: true },
    { id: '2', name: 'Jessica', isOnline: true },
    { id: '3', name: 'Mark', isOnline: true, isBusy: true },
    { id: '4', name: 'Sarah', isOnline: true },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
          {stories.map(story => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={() => !story.isMe && navigation.navigate('UserProfile', { userId: story.id, name: story.name, isOnline: story.isOnline })}
            >
              <View style={[styles.storyAvatar, story.isMe && styles.myStory]}>
                <GlowAvatar size={56} isOnline={story.isOnline && !story.isMe} isBusy={story.isBusy}>
                   {story.isMe && (
                      <View style={styles.addStoryBadge}>
                        <Plus color={COLORS.white} size={10} />
                      </View>
                    )}
                </GlowAvatar>
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

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('UserProfile', {
           userId: targetDisplayUser.id,
           name: targetDisplayUser.name,
           totalSpent: 6000,
           isOnline: targetDisplayUser.isOnline
        })}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
           <Image
             source={targetDisplayUser.photos[currentPhotoIndex]}
             style={styles.cardImage}
             contentFit="cover"
             cachePolicy="memory-disk"
           />
        </Animated.View>

        <View style={styles.cardOverlay}>
           <View style={styles.cardInfo}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.name}>{targetDisplayUser.name}, {targetDisplayUser.age}</Text>
                  {targetDisplayUser.isOnline && <View style={styles.onlineDot} />}
               </View>
               <TouchableOpacity
                 onPress={(e) => {
                   const { pageX, pageY } = e.nativeEvent;
                   setMenuPosition({ x: pageX, y: pageY });
                   setSelectedUser(targetDisplayUser);
                   setIsMenuVisible(true);
                   hapticService.lightImpact();
                 }}
               >
                 <MoreHorizontal color="white" size={24} />
               </TouchableOpacity>
             </View>
             <Text style={styles.bio}>{targetDisplayUser.bio}</Text>
           </View>
        </View>
      </TouchableOpacity>

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
  storyAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  addStoryBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white, zIndex: 10 },
  storyName: { fontSize: 11, color: COLORS.textSecondary, marginTop: 5 },

  card: { width: width * 0.9, height: '60%', backgroundColor: '#000', borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, marginTop: 20, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', justifyContent: 'flex-end' },
  cardInfo: { padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  name: { fontSize: 24, fontWeight: 'bold', color: 'white', marginRight: 8 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CD964', marginTop: 5 },
  bio: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 5 },

  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 30 },
  actionButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginHorizontal: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3 },
  dislike: { borderColor: '#FF3B30', borderWidth: 1 },
  superlike: { borderColor: '#007AFF', borderWidth: 1, width: 50, height: 50 },
  like: { borderColor: '#4CD964', borderWidth: 1 },
});

export default DiscoverScreen;
