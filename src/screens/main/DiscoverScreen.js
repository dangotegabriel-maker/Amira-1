import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, PanResponder } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { X, Heart, MoreHorizontal } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { hapticService } from '../../services/hapticService';
import { useUser } from '../../context/UserContext';
import { Image } from 'expo-image';
import LoadingSpinner from '../../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * width;

const DiscoverScreen = () => {
  const navigation = useNavigation();
  const { user: currentUser, loading } = useUser();
  const [users, setUsers] = useState([
    {
      id: 'f1', name: 'Jessica', age: 24, gender: 'female', bio: 'Loves hiking and coffee. Let\'s explore!',
      photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=600'],
      isOnline: true
    },
    {
      id: 'f2', name: 'Emma', age: 22, gender: 'female', bio: 'Music is my life. 🎵',
      photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=600'],
      isOnline: true
    },
    {
      id: 'f3', name: 'Sophia', age: 26, gender: 'female', bio: 'Travel enthusiast ✈️',
      photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=600'],
      isOnline: true
    }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      }
    })
  ).current;

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? width + 100 : -width - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction) => {
    if (direction === 'right') {
      hapticService.mediumImpact();
    } else {
      hapticService.lightImpact();
    }
    setCurrentIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: false
    }).start();
  };

  if (loading || !currentUser) {
    return <LoadingSpinner />;
  }

  const renderCards = () => {
    if (currentIndex >= users.length) {
      return (
        <View style={styles.noMoreCards}>
          <Text style={styles.noMoreText}>No more users nearby</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => setCurrentIndex(0)}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return users.map((item, i) => {
      if (i < currentIndex) return null;

      if (i === currentIndex) {
        return (
          <Animated.View
            key={item.id}
            style={[styles.card, { transform: [...position.getTranslateTransform(), { rotate }] }]}
            {...panResponder.panHandlers}
          >
            <Image source={item.photos[0]} style={styles.cardImage} contentFit="cover" />
            <View style={styles.cardOverlay}>
              <View style={styles.cardInfo}>
                 <Text style={styles.name}>{item.name}, {item.age}</Text>
                 <Text style={styles.bio}>{item.bio}</Text>
              </View>
            </View>
          </Animated.View>
        );
      }

      return (
        <View key={item.id} style={[styles.card, { zIndex: -i }]}>
           <Image source={item.photos[0]} style={styles.cardImage} contentFit="cover" />
        </View>
      );
    }).reverse();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      <View style={styles.cardContainer}>
        {renderCards()}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.dislike]}
          onPress={() => forceSwipe('left')}
        >
          <X color="#FF3B30" size={32} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.like]}
          onPress={() => forceSwipe('right')}
        >
          <Heart color="#4CD964" size={32} fill="#4CD964" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  card: {
    width: width * 0.9,
    height: height * 0.6,
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  cardInfo: { padding: 20 },
  name: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  bio: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 5 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 30 },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  dislike: { borderColor: '#FF3B30', borderWidth: 1 },
  like: { borderColor: '#4CD964', borderWidth: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noMoreCards: { alignItems: 'center' },
  noMoreText: { fontSize: 18, color: COLORS.textSecondary, marginBottom: 20 },
  refreshBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 20 },
  refreshText: { color: 'white', fontWeight: 'bold' }
});

export default DiscoverScreen;
