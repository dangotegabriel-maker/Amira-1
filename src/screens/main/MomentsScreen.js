import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from "react-native";
import { COLORS } from '../../theme/COLORS';
import { Heart, MessageCircle, Share2, EyeOff } from 'lucide-react-native';
import { TapGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { hapticService } from '../../services/hapticService';
import { useGifting } from '../../context/GiftingContext';
import { socketService } from '../../services/socketService';

const MomentsScreen = () => {
  const { triggerGiftOverlay } = useGifting();

  const posts = [
    { id: '1', user: 'Alex', content: 'Beautiful sunset!', sensitive: false, userId: 'u1' },
    { id: '2', user: 'Sam', content: 'Check this out', sensitive: true, userId: 'u2' },
  ];

  const onDoubleTap = (userId) => (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      console.log(`Double tap on moment by ${userId}! Sending Finger Heart 🫰`);
      const heartGift = { id: 'p2', name: 'Finger Heart', cost: 5, icon: '🫰' };

      // Trigger sensory effects
      triggerGiftOverlay(heartGift.id, 'You', 1);
      socketService.sendGift(userId, { giftId: heartGift.id, combo: 1 });
      hapticService.success();
    }
  };

  const renderItem = ({ item }) => (
    <GestureHandlerRootView>
      <TapGestureHandler
        onHandlerStateChange={onDoubleTap(item.userId)}
        numberOfTaps={2}
      >
        <View style={styles.post}>
          <View style={styles.header}>
            <View style={styles.avatar} />
            <Text style={styles.username}>{item.user}</Text>
          </View>

          {item.sensitive ? (
            <View style={styles.sensitiveContent}>
              <EyeOff color={COLORS.white} size={48} />
              <Text style={styles.sensitiveText}>Sensitive Content</Text>
              <TouchableOpacity style={styles.viewButton} onPress={() => hapticService.lightImpact()}>
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder} />
          )}

          <View style={styles.footer}>
            <Text style={styles.content}>{item.content}</Text>
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
      <FlatList data={posts} renderItem={renderItem} keyExtractor={item => item.id} />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  topHeader: { height: 100, backgroundColor: COLORS.white, justifyContent: 'flex-end', paddingBottom: 15, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  post: { backgroundColor: COLORS.white, marginBottom: 10, paddingVertical: 15 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DDD' },
  username: { marginLeft: 10, fontWeight: 'bold', fontSize: 16 },
  imagePlaceholder: { width: '100%', height: 300, backgroundColor: '#EEE' },
  sensitiveContent: { width: '100%', height: 300, backgroundColor: '#555', justifyContent: 'center', alignItems: 'center' },
  sensitiveText: { color: COLORS.white, marginTop: 10, fontSize: 18, fontWeight: 'bold' },
  viewButton: { marginTop: 15, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  viewButtonText: { color: COLORS.white, fontWeight: 'bold' },
  footer: { paddingHorizontal: 15, marginTop: 10 },
  content: { fontSize: 16, marginBottom: 10 },
  actions: { flexDirection: 'row' },
  actionIcon: { marginRight: 20 },
});
export default MomentsScreen;
