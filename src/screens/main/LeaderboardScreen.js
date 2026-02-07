// src/screens/main/LeaderboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import GlowAvatar from '../../components/GlowAvatar';
import VIPBadge from '../../components/VIPBadge';
import { Trophy, ChevronLeft, Swords } from 'lucide-react-native';
import { hapticService } from '../../services/hapticService';
import { ledgerService } from '../../services/ledgerService';

const { width } = Dimensions.get('window');

const LeaderboardScreen = ({ navigation }) => {
  const [period, setPeriod] = useState('24h');
  const [wealthXP, setWealthXP] = useState(0);

  useEffect(() => {
    loadXP();
  }, []);

  const loadXP = async () => {
    const xp = await ledgerService.getWealthXP();
    setWealthXP(xp);
  };

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

  const currentLeader = mockData[period][0];
  const coinsToOvertake = Math.max(0, currentLeader.spent - wealthXP + 1);

  const renderItem = ({ item }) => (
    <View style={styles.rankItem}>
      <Text style={styles.rankNumber}>{item.rank}</Text>
      <GlowAvatar size={50} isRankOne={item.rank === 1} xp={item.spent} />
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
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
             <ChevronLeft color="white" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Top Gifters</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.tabs}>
          {['24h', '7d', '30d'].map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => { hapticService.lightImpact(); setPeriod(p); }}
              style={[styles.tab, period === p && styles.activeTab]}
            >
              <Text style={[styles.tabText, period === p && styles.activeTabText]}>{p.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Rivalry Section */}
      <View style={styles.rivalSection}>
         <View style={styles.rivalHeader}>
            <Swords color={COLORS.primary} size={20} />
            <Text style={styles.rivalTitle}>Current Rival: {currentLeader.name}</Text>
         </View>
         <Text style={styles.rivalDescription}>
            Spend <Text style={styles.rivalHighlight}>{coinsToOvertake.toLocaleString()} 🪙</Text> more to dethrone Rank #1!
         </Text>
         <TouchableOpacity
           style={styles.dethroneButton}
           onPress={() => { hapticService.heavyImpact(); navigation.navigate('RechargeHub'); }}
         >
            <Text style={styles.dethroneText}>Dethrone Now</Text>
         </TouchableOpacity>
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
  topRow: { flexDirection: 'row', width: '100%', paddingHorizontal: 20, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 5 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 15 },
  activeTab: { backgroundColor: 'white' },
  tabText: { color: 'white', fontWeight: 'bold' },
  activeTabText: { color: COLORS.primary },

  rivalSection: { backgroundColor: 'white', margin: 15, padding: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  rivalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rivalTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 10, color: '#333' },
  rivalDescription: { fontSize: 14, color: '#666', marginBottom: 15 },
  rivalHighlight: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  dethroneButton: { backgroundColor: '#111', height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  dethroneText: { color: 'white', fontWeight: 'bold' },

  listContent: { padding: 15, paddingTop: 0 },
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
