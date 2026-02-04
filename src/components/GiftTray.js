// src/components/GiftTray.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Animated, Dimensions } from 'react-native';
import { COLORS } from '../theme/COLORS';
import { X, Coins } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { ledgerService } from '../services/ledgerService';

const { height } = Dimensions.get('window');

const GIFTS = {
  Popular: [
    { id: 'p1', name: 'Rose', cost: 1, icon: '🌹' },
    { id: 'p2', name: 'Coffee', cost: 5, icon: '☕' },
    { id: 'p3', name: 'Heart', cost: 10, icon: '❤️' },
  ],
  Luxury: [
    { id: 'l1', name: 'Car', cost: 500, icon: '🚗' },
    { id: 'l2', name: 'Yacht', cost: 2000, icon: '🛥️' },
    { id: 'l3', name: 'Castle', cost: 5000, icon: '🏰' },
  ],
  Special: [
    { id: 's1', name: 'Universe', cost: 10000, icon: '🌌' },
    { id: 's2', name: 'Dragon', cost: 20000, icon: '🐉' },
  ]
};

const GiftTray = ({ visible, onClose, onGiftSent }) => {
  const [category, setCategory] = useState('Popular');
  const [balance, setBalance] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [lastGiftId, setLastGiftId] = useState(null);

  const comboTimer = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      loadBalance();
    }
  }, [visible]);

  const loadBalance = async () => {
    const b = await ledgerService.getBalance();
    setBalance(b);
  };

  const handleGiftTap = async (gift) => {
    if (balance < gift.cost) {
      alert("Insufficient coins! Please recharge.");
      return;
    }

    // Spend coins
    await ledgerService.spendCoins(gift.cost, 'target_user_id', gift.id);
    loadBalance();

    // Combo Logic
    if (lastGiftId === gift.id) {
      setComboCount(prev => prev + 1);
    } else {
      setComboCount(1);
      setLastGiftId(gift.id);
    }

    // Animation logic
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.2 + (comboCount * 0.1), useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    // Reset combo after 300ms of inactivity
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => {
      setComboCount(0);
      setLastGiftId(null);
    }, 300);

    onGiftSent(gift, comboCount + 1);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.balanceBadge}>
              <Coins color="#FFD700" size={16} />
              <Text style={styles.balanceText}>{balance}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.text} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            {Object.keys(GIFTS).map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.tab, category === cat && styles.activeTab]}
              >
                <Text style={[styles.tabText, category === cat && styles.activeTabText]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={GIFTS[category]}
            keyExtractor={item => item.id}
            numColumns={4}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.giftItem}
                onPress={() => handleGiftTap(item)}
              >
                <Text style={styles.giftIcon}>{item.icon}</Text>
                <Text style={styles.giftName}>{item.name}</Text>
                <View style={styles.costBadge}>
                  <Text style={styles.costText}>{item.cost}</Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.giftList}
          />

          {comboCount > 0 && (
            <Animated.View style={[styles.comboOverlay, { transform: [{ scale: scaleAnim }] }]}>
               <Text style={styles.comboText}>x{comboCount}</Text>
               <LottieView
                  source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_st9bhz.json' }} // Placeholder fire animation
                  autoPlay
                  loop
                  style={styles.lottie}
               />
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: height * 0.4, padding: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  balanceText: { color: '#FFD700', fontWeight: 'bold', marginLeft: 5 },
  tabBar: { flexDirection: 'row', marginBottom: 15 },
  tab: { marginRight: 20, paddingBottom: 5 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { color: '#888', fontSize: 16, fontWeight: '600' },
  activeTabText: { color: COLORS.white },
  giftList: { flex: 1 },
  giftItem: { flex: 1, alignItems: 'center', margin: 5, padding: 10 },
  giftIcon: { fontSize: 32, marginBottom: 5 },
  giftName: { color: '#EEE', fontSize: 12, marginBottom: 2 },
  costBadge: { flexDirection: 'row', alignItems: 'center' },
  costText: { color: '#FFD700', fontSize: 11, fontWeight: 'bold' },
  comboOverlay: { position: 'absolute', top: -100, alignSelf: 'center', alignItems: 'center' },
  comboText: { color: '#FFD700', fontSize: 48, fontWeight: '900', fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 },
  lottie: { width: 100, height: 100 }
});

export default GiftTray;
