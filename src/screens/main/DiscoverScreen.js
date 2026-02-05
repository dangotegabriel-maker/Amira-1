import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { X, Heart, Star, MoreHorizontal } from 'lucide-react-native';
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

  const showOptions = (name, userId) => {
    Alert.alert(
      "User Options",
      `What would you like to do with ${name}?`,
      [
        { text: "Report", onPress: () => console.log("Report from Discover") },
        { text: "Block", onPress: () => handleBlock(name, userId), style: 'destructive' },
        { text: "Cancel", style: 'cancel' }
      ]
    );
  };

  const handleBlock = async (name, userId) => {
    await moderationService.blockUser('current_user_id', userId);
    Alert.alert("Blocked", `${name} has been blocked.`);
  };

  return (
    <View style={styles.container}>
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
  container: { flex: 1, backgroundColor: '#F8F8F8', alignItems: 'center', paddingTop: 60 },
  card: { width: width * 0.9, height: '70%', backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 },
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
