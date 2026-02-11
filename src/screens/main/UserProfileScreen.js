import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, ActivityIndicator } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { ChevronLeft, Gift, ArrowUpCircle, MessageCircle, Phone, Heart, ShieldCheck, BadgeCheck } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { dbService } from '../../services/firebaseService';
import { socketService } from '../../services/socketService';
import { hapticService } from '../../services/hapticService';
import { useUser } from '../../context/UserContext';
import { Image } from 'expo-image';
import GlowAvatar from '../../components/GlowAvatar';

const { width, height } = Dimensions.get('window');

const UserProfileScreen = ({ route, navigation }) => {
  const { userId, name } = route.params;
  const { user: currentUser } = useUser();
  const [targetUser, setTargetUser] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadTargetUser();
    socketService.emitProfileView('current_user_id', userId);
  }, [userId]);

  const loadTargetUser = async () => {
    // Mocking fetching another user's profile
    const p = await dbService.getUserProfile(userId);
    setTargetUser(p);
  };

  useEffect(() => {
    if (!targetUser || !targetUser.photos || targetUser.photos.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setPhotoIndex((prev) => (prev + 1) % targetUser.photos.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [targetUser]);

  if (!targetUser || !currentUser) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );

  const isFemale = targetUser.gender === 'female';
  const isMaleViewer = currentUser.gender === 'male';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
         {/* Hero Section: 9-photo gallery rotating */}
         <View style={styles.hero}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
               <Image source={targetUser.photos?.[photoIndex]} style={styles.heroImg} contentFit="cover" cachePolicy="memory-disk" />
            </Animated.View>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
               <ChevronLeft color="white" size={28} />
            </TouchableOpacity>
            <View style={styles.heroOverlay}>
               <View style={styles.nameRow}>
                  <Text style={styles.name}>{targetUser.name}</Text>
                  {targetUser.is_verified !== false && <BadgeCheck color="#007AFF" size={20} style={{ marginLeft: 5 }} fill="white" />}
               </View>
               <View style={styles.tagRow}>
                  {['Travel', 'Music', 'Fitness'].map(t => (
                    <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
                  ))}
               </View>
            </View>
         </View>

         <View style={styles.content}>
            <Text style={styles.bio}>{targetUser.bio || 'No bio yet'}</Text>

            <View style={styles.publicStats}>
               {isFemale ? (
                 <>
                    <View style={styles.pubStatBox}>
                       <Text style={styles.pubStatVal}>💎 {Math.floor(Math.random() * 10000)}</Text>
                       <Text style={styles.pubStatLab}>Love Index</Text>
                    </View>
                    <View style={styles.pubStatBox}>
                       <Text style={styles.pubStatVal}>98%</Text>
                       <Text style={styles.pubStatLab}>Response</Text>
                    </View>
                    <View style={styles.pubStatBox}>
                       <Text style={styles.pubStatVal}>50 🪙/m</Text>
                       <Text style={styles.pubStatLab}>Call Price</Text>
                    </View>
                 </>
               ) : (
                 <>
                    <View style={styles.pubStatBox}>
                       <Text style={styles.pubStatVal}>Emperor</Text>
                       <Text style={styles.pubStatLab}>Wealth Rank</Text>
                    </View>
                    <View style={styles.pubStatBox}>
                       <GlowAvatar size={40} xp={15000} isOnline={true} />
                       <Text style={styles.pubStatLab}>Spending Aura</Text>
                    </View>
                    <View style={styles.pubStatBox}>
                       <Text style={styles.pubStatVal}>4.5k</Text>
                       <Text style={styles.pubStatLab}>Gifts Sent</Text>
                    </View>
                 </>
               )}
            </View>

            <View style={styles.actionRow}>
               {isMaleViewer && isFemale ? (
                 <>
                   <TouchableOpacity style={styles.callBtn} onPress={() => navigation.navigate('VideoCall', { name: targetUser.name, userId: targetUser.uid })}>
                      <Phone color="white" size={20} />
                      <Text style={styles.callBtnText}>Call Now</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.giftBtn} onPress={() => hapticService.lightImpact()}>
                      <Gift color={COLORS.primary} size={24} />
                   </TouchableOpacity>
                 </>
               ) : (
                 <TouchableOpacity style={styles.messageBtn} onPress={() => navigation.navigate('ChatDetail', { name: targetUser.name, userId: targetUser.uid })}>
                    <MessageCircle color="white" size={20} />
                    <Text style={styles.callBtnText}>Message</Text>
                 </TouchableOpacity>
               )}
            </View>
         </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  hero: { width: '100%', height: height * 0.55, backgroundColor: '#000' },
  heroImg: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 5 },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 25, backgroundColor: 'rgba(0,0,0,0.4)' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  tagRow: { flexDirection: 'row', marginTop: 10 },
  tag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15, marginRight: 8 },
  tagText: { color: 'white', fontSize: 12, fontWeight: '600' },
  content: { padding: 25 },
  bio: { fontSize: 16, color: '#444', lineHeight: 24, marginBottom: 30 },
  publicStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9F9F9', padding: 20, borderRadius: 20, marginBottom: 30 },
  pubStatBox: { alignItems: 'center', flex: 1 },
  pubStatVal: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  pubStatLab: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  callBtn: { flex: 1, backgroundColor: COLORS.primary, height: 55, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  callBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginLeft: 10 },
  giftBtn: { width: 55, height: 55, borderRadius: 30, backgroundColor: '#FFF5F7', borderWidth: 1, borderColor: COLORS.primary, marginLeft: 15, justifyContent: 'center', alignItems: 'center' },
  messageBtn: { flex: 1, backgroundColor: COLORS.secondary, height: 55, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default UserProfileScreen;
