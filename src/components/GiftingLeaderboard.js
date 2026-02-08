// src/components/GiftingLeaderboard.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { COLORS } from '../theme/COLORS';
import GlowAvatar from './GlowAvatar';
import VIPBadge from './VIPBadge';
import { Trophy } from 'lucide-react-native';

const GiftingLeaderboard = () => {
  const [period, setPeriod] = useState('24h');

  const mockData = {
    '24h': [
      { id: '1', name: 'KingJames', spent: 15000, rank: 1 },
      { id: '2', name: 'QueenB', spent: 12000, rank: 2 },
      { id: '3', name: 'DiamondHustler', spent: 8000, rank: 3 },
      { id: '4', name: 'RichieRich', spent: 5000, rank: 4 },
      { id: '5', name: 'GifterPro', spent: 3000, rank: 5 },
      { id: '6', name: 'EliteGifter', spent: 2500, rank: 6 },
      { id: '7', name: 'SocialFlexer', spent: 2000, rank: 7 },
      { id: '8', name: 'BigSpender', spent: 1500, rank: 8 },
    ],
    '7d': [
      { id: '1', name: 'QueenB', spent: 85000, rank: 1 },
      { id: '2', name: 'KingJames', spent: 72000, rank: 2 },
      { id: '3', name: 'WhaleWatcher', spent: 50000, rank: 3 },
      { id: '4', name: 'RichieRich', spent: 35000, rank: 4 },
    ],
    '30d': [
      { id: '1', name: 'CryptoGoddess', spent: 250000, rank: 1 },
      { id: '2', name: 'QueenB', spent: 185000, rank: 2 },
      { id: '3', name: 'KingJames', spent: 150000, rank: 3 },
    ]
  };

  const renderItem = ({ item }) => (
    <View style={styles.rankItem}>
      <Text style={styles.rankNumber}>{item.rank}</Text>
      <GlowAvatar size={40} isRankOne={item.rank === 1} xp={item.spent} />
      <View style={styles.userInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.userName}>{item.name}</Text>
          <VIPBadge totalSpent={item.spent} />
        </View>
        <Text style={styles.userSpent}>{item.spent.toLocaleString()} Coins</Text>
      </View>
      {item.rank <= 3 && (
        <Trophy
          color={item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : '#CD7F32'}
          size={18}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Gifters</Text>
        <View style={styles.tabs}>
          {['24h', '7d', '30d'].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.tab, period === p && styles.activeTab]}
            >
              <Text style={[styles.tabText, period === p && styles.activeTabText]}>{p.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={mockData[period]}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        initialNumToRender={5}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginTop: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 15, padding: 3 },
  tab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  activeTab: { backgroundColor: 'white', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  activeTabText: { color: COLORS.primary },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rankNumber: { fontSize: 14, fontWeight: 'bold', width: 25, color: COLORS.textSecondary },
  userInfo: { flex: 1, marginLeft: 10 },
  userName: { fontSize: 14, fontWeight: 'bold' },
  userSpent: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12, marginTop: 1 },
});

export default GiftingLeaderboard;
