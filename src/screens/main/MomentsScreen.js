import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Heart, MessageCircle, Share2, EyeOff } from 'lucide-react-native';

const MomentsScreen = () => {
  const posts = [
    { id: '1', user: 'Alex', content: 'Beautiful sunset!', sensitive: false },
    { id: '2', user: 'Sam', content: 'Check this out', sensitive: true },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.post}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.username}>{item.user}</Text>
      </View>

      {item.sensitive ? (
        <View style={styles.sensitiveContent}>
          <EyeOff color={COLORS.white} size={48} />
          <Text style={styles.sensitiveText}>Sensitive Content</Text>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imagePlaceholder} />
      )}

      <View style={styles.footer}>
        <Text style={styles.content}>{item.content}</Text>
        <View style={styles.actions}>
          <Heart size={24} color={COLORS.text} style={styles.actionIcon} />
          <MessageCircle size={24} color={COLORS.text} style={styles.actionIcon} />
          <Share2 size={24} color={COLORS.text} />
        </View>
      </View>
    </View>
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
