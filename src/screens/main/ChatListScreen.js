import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';

const ChatListScreen = ({ navigation }) => {
  const chats = [
    { id: '1', name: 'Jessica', lastMessage: 'Hey there!', time: '10:30 AM' },
    { id: '2', name: 'Mark', lastMessage: 'See you later', time: 'Yesterday' },
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatDetail', { name: item.name })}
    >
      <View style={styles.avatar} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList data={chats} renderItem={renderItem} keyExtractor={item => item.id} />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { height: 100, justifyContent: 'flex-end', paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  title: { fontSize: 28, fontWeight: 'bold' },
  chatItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEE' },
  chatInfo: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name: { fontSize: 18, fontWeight: 'bold' },
  time: { color: COLORS.textSecondary, fontSize: 14 },
  lastMessage: { color: COLORS.textSecondary, fontSize: 16 },
});
export default ChatListScreen;
