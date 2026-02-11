import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Alert, ScrollView, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { X, Heart, Star, MoreHorizontal, Plus } from 'lucide-react-native';
import { moderationService } from '../../services/moderationService';
import { dbService } from '../../services/firebaseService';
import AnchoredMenu from '../../components/AnchoredMenu';
import GlowAvatar from '../../components/GlowAvatar';
import CardStack from '../../components/CardStack';
import { useNavigation } from '@react-navigation/native';
import { hapticService } from '../../services/hapticService';
import { useUser } from '../../context/UserContext';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const DiscoverScreen = () => {
  const navigation = useNavigation();
  const { user: currentUser, loading } = useUser();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Mock Discover Users
  const discoverUsers = [
    {
      id: 'f1', name: 'Jessica', age: 24, gender: 'female', bio: 'Loves hiking and coffee. Let\'s explore!',
      photos: [
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&h=600',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=600',
      ],
      isOnline: true, giftsReceived: 450, responseRate: 98, callPrice: 50
    },
    {
      id: 'f2', name: 'Emma', age: 22, gender: 'female', bio: 'Music is my life. 🎵',
      photos: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=600',
      ],
      isOnline: true, giftsReceived: 210, responseRate: 92, callPrice: 40
    }
  ];

  useEffect(() => {
    if (!loading && currentUser && !currentUser.gender) {
      navigation.navigate('GenderSetup');
    }
  }, [loading, currentUser]);

  const handleAddMoment = async () => {
     const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: true, quality: 0.8 });
     if (!result.canceled) {
        Alert.alert("Success", "Moment uploaded! It will expire in 24 hours.");
     }
  };

  const renderDiscoverCard = (user) => <DiscoverCard user={user} navigation={navigation} />;

  if (loading || !currentUser) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.title}>Discover</Text>
         <TouchableOpacity onPress={handleAddMoment}>
            <Plus color={COLORS.text} size={28} />
         </TouchableOpacity>
      </View>

      <CardStack
        data={discoverUsers}
        onSwipeLeft={(u) => console.log('Passed', u.name)}
        onSwipeRight={(u) => console.log('Liked', u.name)}
        renderCard={renderDiscoverCard}
      />
    </View>
  );
};

const DiscoverCard = ({ user, navigation }) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (user.photos.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setPhotoIndex((prev) => (prev + 1) % user.photos.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [user]);

  return (
    <TouchableOpacity
        activeOpacity={1}
        style={styles.cardInner}
        onPress={() => navigation.navigate('UserProfile', { userId: user.id, name: user.name })}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <Image source={user.photos[photoIndex]} style={styles.cardImage} contentFit="cover" cachePolicy="memory-disk" />
      </Animated.View>
      <View style={styles.cardOverlay}>
        <Text style={styles.cardName}>{user.name}, {user.age}</Text>
        <Text style={styles.cardBio} numberOfLines={2}>{user.bio}</Text>
        <View style={styles.tagRow}>
           <View style={styles.tag}><Text style={styles.tagText}>Active</Text></View>
           {user.isOnline && <View style={[styles.tag, { backgroundColor: '#4CD964' }]}><Text style={styles.tagText}>Online</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  cardInner: { flex: 1, backgroundColor: '#000' },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  cardName: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  cardBio: { color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  tagRow: { flexDirection: 'row', marginTop: 10 },
  tag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  tagText: { color: 'white', fontSize: 12, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default DiscoverScreen;
