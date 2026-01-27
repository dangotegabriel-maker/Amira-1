import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Search, UserPlus } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const TABS = ['Active', 'Unreplied', 'Calls', 'Notices', 'Contacts'];

const MessageHomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef(null);

  const handleTabPress = (index) => {
    setActiveTab(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const handleScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    setActiveTab(index);
  };

  // Mock Data
  const contacts = [
    { id: '1', name: 'Jessica', depth: 'Inner Circle', lastSeen: '2m ago' },
    { id: '2', name: 'Mark', depth: 'Friends', lastSeen: '1h ago' },
    { id: '3', name: 'Sarah', depth: 'Inner Circle', lastSeen: 'Now' },
    { id: '4', name: 'David', depth: 'Friends', lastSeen: '3h ago' },
    { id: '5', name: 'Emma', depth: 'Inner Circle', lastSeen: '5m ago' },
    { id: '6', name: 'Michael', depth: 'Friends', lastSeen: 'Yesterday' },
  ];

  const [contactFilter, setContactFilter] = useState('All');

  const filteredContacts = contacts.filter(c =>
    contactFilter === 'All' || c.depth === contactFilter
  );

  const renderActive = () => (
    <View style={styles.page}>
      <FlatList
        data={[{ id: '1', name: 'Jessica', msg: 'Hey!', time: '10:30 AM' }]}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('ChatDetail', { name: item.name })}
          >
            <View style={styles.avatar} />
            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemTime}>{item.time}</Text>
              </View>
              <Text style={styles.itemSubtext}>{item.msg}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderContacts = () => (
    <View style={styles.page}>
      <View style={styles.filterBar}>
        {['All', 'Inner Circle', 'Friends'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, contactFilter === f && styles.filterChipActive]}
            onPress={() => setContactFilter(f)}
          >
            <Text style={[styles.filterText, contactFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredContacts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.avatar} />
            <View style={styles.itemContent}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSubtext}>{item.depth} • {item.lastSeen}</Text>
            </View>
            <TouchableOpacity style={styles.chatIcon}>
               <UserPlus size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity>
          <Search color={COLORS.text} size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === index && styles.activeTab]}
              onPress={() => handleTabPress(index)}
            >
              <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {renderActive()}
        <View style={styles.page}><Text style={styles.emptyText}>No unreplied messages</Text></View>
        <View style={styles.page}><Text style={styles.emptyText}>No recent calls</Text></View>
        <View style={styles.page}><Text style={styles.emptyText}>No new notices</Text></View>
        {renderContacts()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    height: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 15,
    paddingHorizontal: 20
  },
  title: { fontSize: 28, fontWeight: 'bold' },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 10
  },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 5
  },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 16, color: COLORS.textSecondary },
  activeTabText: { color: COLORS.primary, fontWeight: 'bold' },
  page: { width: width, flex: 1 },
  emptyText: { textAlign: 'center', marginTop: 100, color: COLORS.textSecondary, fontSize: 16 },
  listItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEE' },
  itemContent: { flex: 1, marginLeft: 15 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  itemName: { fontSize: 17, fontWeight: 'bold' },
  itemTime: { color: COLORS.textSecondary, fontSize: 13 },
  itemSubtext: { color: COLORS.textSecondary, fontSize: 15 },
  filterBar: { flexDirection: 'row', padding: 15, backgroundColor: '#F9F9F9', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 12, backgroundColor: '#E9E9EB', borderWidth: 1, borderColor: '#DDD' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: '#666', fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: COLORS.white, fontWeight: 'bold' },
  chatIcon: { padding: 8 }
});

export default MessageHomeScreen;
