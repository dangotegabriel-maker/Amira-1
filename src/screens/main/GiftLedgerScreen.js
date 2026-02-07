// src/screens/main/GiftLedgerScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { ChevronLeft, Gift } from 'lucide-react-native';
import { ledgerService } from '../../services/ledgerService';
import { getGiftAsset } from '../../services/giftingService';

const GiftLedgerScreen = ({ route, navigation }) => {
  const { type } = route.params; // 'sent' or 'received'
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    loadGifts();
  }, []);

  const loadGifts = async () => {
    const allDetailed = await ledgerService.getDetailedGifts();
    const filtered = allDetailed.filter(g => g.type === type);
    setGifts(filtered);
  };

  const renderItem = ({ item }) => {
    const asset = getGiftAsset(item.giftId);
    return (
      <View style={styles.giftItem}>
        <View style={styles.iconContainer}>
           <Text style={styles.icon}>{asset.icon || '🎁'}</Text>
        </View>
        <View style={styles.giftInfo}>
           <Text style={styles.giftName}>{asset.name || 'Gift'}</Text>
           <Text style={styles.userText}>
              {type === 'sent' ? `To: ${item.otherUser}` : `From: ${item.otherUser}`}
           </Text>
        </View>
        <View style={styles.countContainer}>
           <Text style={styles.countText}>x{item.amount}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
           <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.title}>{type === 'sent' ? 'Gifts Sent' : 'Gifts Received'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={gifts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
           <View style={styles.emptyContainer}>
              <Gift color="#CCC" size={64} />
              <Text style={styles.emptyText}>No gifts found here.</Text>
           </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 15 },
  giftItem: {
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
  iconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF5F7', justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 24 },
  giftInfo: { flex: 1, marginLeft: 15 },
  giftName: { fontSize: 16, fontWeight: 'bold' },
  userText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  countContainer: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0F0F0', borderRadius: 15 },
  countText: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 15, fontSize: 16 },
});

export default GiftLedgerScreen;
