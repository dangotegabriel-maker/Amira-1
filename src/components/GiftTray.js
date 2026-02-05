// src/components/GiftTray.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Animated, Dimensions, Platform } from 'react-native';
import { COLORS } from '../theme/COLORS';
import { X, Coins, PlusCircle } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { ledgerService } from '../services/ledgerService';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const GIFTS = {
  Popular: [
    { id: 'p1', name: 'Heart', cost: 1, icon: '❤️' },
    { id: 'p2', name: 'Rose', cost: 2, icon: '🌹' },
    { id: 'p3', name: 'Lollipop', cost: 5, icon: '🍭' },
    { id: 'p4', name: 'Coffee', cost: 10, icon: '☕' },
    { id: 'p5', name: 'Ice Cream', cost: 15, icon: '🍦' },
    { id: 'p6', name: 'Cupcake', cost: 20, icon: '🧁' },
    { id: 'p7', name: 'Beer', cost: 25, icon: '🍺' },
    { id: 'p8', name: 'Wine', cost: 30, icon: '🍷' },
    { id: 'p9', name: 'Pizza', cost: 40, icon: '🍕' },
    { id: 'p10', name: 'Burger', cost: 50, icon: '🍔' },
    { id: 'p11', name: 'Firework', cost: 75, icon: '🎆' },
    { id: 'p12', name: 'Rocket', cost: 99, icon: '🚀' },
  ],
  Glamour: [
    { id: 'g1', name: 'Unicorn', cost: 100, icon: '🦄' },
    { id: 'g2', name: 'Dragon', cost: 250, icon: '🐉' },
    { id: 'g3', name: 'Phoenix', cost: 500, icon: '🐦' },
    { id: 'g4', name: 'Alien', cost: 750, icon: '👽' },
    { id: 'g5', name: 'Ghost', cost: 1000, icon: '👻' },
    { id: 'g6', name: 'Robot', cost: 1250, icon: '🤖' },
    { id: 'g7', name: 'Wizard', cost: 1500, icon: '🧙' },
    { id: 'g8', name: 'Mermaid', cost: 2000, icon: '🧜' },
    { id: 'g9', name: 'Genie', cost: 2500, icon: '🧞' },
    { id: 'g10', name: 'Vampire', cost: 3000, icon: '🧛' },
    { id: 'g11', name: 'Zombie', cost: 3500, icon: '🧟' },
    { id: 'g12', name: 'Monster', cost: 4000, icon: '👹' },
  ],
  Luxury: [
    { id: 'l1', name: 'Ring', cost: 500, icon: '💍' },
    { id: 'l2', name: 'Watch', cost: 750, icon: '⌚' },
    { id: 'l3', name: 'Perfume', cost: 1000, icon: '💨' },
    { id: 'l4', name: 'Handbag', cost: 1500, icon: '👜' },
    { id: 'l5', name: 'Car', cost: 2500, icon: '🚗' },
    { id: 'l6', name: 'Sportscar', cost: 5000, icon: '🏎️' },
    { id: 'l7', name: 'Yacht', cost: 7500, icon: '🛥️' },
    { id: 'l8', name: 'Helicopter', cost: 10000, icon: '🚁' },
    { id: 'l9', name: 'Private Jet', cost: 15000, icon: '🛩️' },
    { id: 'l10', name: 'Mansion', cost: 20000, icon: '🏡' },
    { id: 'l11', name: 'Island', cost: 22500, icon: '🏝️' },
    { id: 'l12', name: 'Castle', cost: 25000, icon: '🏰' },
  ]
};

const GiftTray = ({ visible, onClose, onGiftSent }) => {
  const [category, setCategory] = useState('Popular');
  const [balance, setBalance] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [lastGiftId, setLastGiftId] = useState(null);

  const navigation = useNavigation();
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
      Animated.spring(scaleAnim, { toValue: 1.2 + (comboCount * 0.05), useNativeDriver: true }),
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

  const handleRecharge = () => {
    onClose();
    navigation.navigate('RechargeHub');
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
            <Text style={styles.title}>Send Gift</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.white} size={24} />
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
                <View style={styles.giftIconContainer}>
                  <Text style={styles.giftIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.giftName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.costBadge}>
                  <Coins color="#FFD700" size={10} />
                  <Text style={styles.costText}>{item.cost}</Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.giftList}
            contentContainerStyle={{ paddingBottom: 20 }}
          />

          <View style={styles.footer}>
             <TouchableOpacity style={styles.rechargeButton} onPress={handleRecharge}>
                <PlusCircle color={COLORS.primary} size={20} />
                <Text style={styles.rechargeText}>Recharge Coins</Text>
             </TouchableOpacity>
          </View>

          {comboCount > 0 && (
            <Animated.View style={[styles.comboOverlay, { transform: [{ scale: scaleAnim }] }]} pointerEvents="none">
               <Text style={styles.comboText}>x{comboCount}</Text>
               <LottieView
                  source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_st9bhz.json' }}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: height * 0.55,
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  balanceText: { color: '#FFD700', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },
  tabBar: { flexDirection: 'row', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  tab: { marginRight: 25, paddingBottom: 10 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { color: '#888', fontSize: 15, fontWeight: '600' },
  activeTabText: { color: COLORS.white },
  giftList: { flex: 1 },
  giftItem: { flex: 1, alignItems: 'center', margin: 5, paddingVertical: 10, borderRadius: 10 },
  giftIconContainer: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 25, marginBottom: 8 },
  giftIcon: { fontSize: 28 },
  giftName: { color: '#CCC', fontSize: 11, marginBottom: 4 },
  costBadge: { flexDirection: 'row', alignItems: 'center' },
  costText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold', marginLeft: 3 },
  footer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center'
  },
  rechargeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  rechargeText: { color: COLORS.white, fontWeight: 'bold', marginLeft: 8 },
  comboOverlay: { position: 'absolute', top: -120, alignSelf: 'center', alignItems: 'center' },
  comboText: { color: COLORS.primary, fontSize: 64, fontWeight: '900', fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 5 },
  lottie: { width: 120, height: 120 }
});

export default GiftTray;
