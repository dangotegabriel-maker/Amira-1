// src/screens/main/LeaderboardScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import GlowAvatar from '../../components/GlowAvatar';
import VIPBadge from '../../components/VIPBadge';
import { Trophy } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const LeaderboardScreen = () => {
  const [period, setPeriod] = useState('24h');

  const mockData = {
    '24h': [
      { id: '1', name: 'KingJames', spent: 15000, rank: 1 },
      { id: '2', name: 'QueenB', spent: 12000, rank: 2 },
      { id: '3', name: 'DiamondHustler', spent: 8000, rank: 3 },
      { id: '4', name: 'RichieRich', spent: 5000, rank: 4 },
      { id: '5', name: 'GifterPro', spent: 3000, rank: 5 },
    ],
    '7d': [
      { id: '1', name: 'QueenB', spent: 85000, rank: 1 },
      { id: '2', name: 'KingJames', spent: 72000, rank: 2 },
      { id: '3', name: 'WhaleWatcher', spent: 50000, rank: 3 },
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
      <GlowAvatar size={50} isRankOne={item.rank === 1} />
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
          size={24}
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
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 5 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 15 },
  activeTab: { backgroundColor: 'white' },
  tabText: { color: 'white', fontWeight: 'bold' },
  activeTabText: { color: COLORS.primary },
  listContent: { padding: 20 },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rankNumber: { fontSize: 18, fontWeight: 'bold', width: 30, color: COLORS.textSecondary },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userSpent: { color: COLORS.primary, fontWeight: 'bold', marginTop: 2 },
});

export default LeaderboardScreen;
