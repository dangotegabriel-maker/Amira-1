// src/components/CallWaitingOverlay.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions } from "react-native";
import { BlurView } from 'expo-blur';
import { Phone, Bell, MessageSquare, X } from 'lucide-react-native';
import { COLORS } from '../theme/COLORS';
import { hapticService } from '../services/hapticService';
import { ledgerService } from '../services/ledgerService';

const { width, height } = Dimensions.get('window');

const CallWaitingOverlay = ({ user, onCancel, onNotify, onWhisper }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleWhisper = async () => {
    try {
      await ledgerService.spendCoins(1, user.id, 'whisper_nudge');
      hapticService.success();
      onWhisper();
    } catch (e) {
      hapticService.error();
      alert("Insufficient coins for a nudge!");
    }
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />

      <View style={styles.content}>
        <View style={styles.avatarContainer}>
           <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.avatar} />
           <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
           <View style={styles.busyBadge}>
              <Phone color="white" size={12} fill="white" />
           </View>
        </View>

        <Text style={styles.title}>{user.name} is in a call</Text>
        <Text style={styles.subtitle}>Don't worry, you can get their attention!</Text>

        <View style={styles.actions}>
           <TouchableOpacity style={styles.actionButton} onPress={onNotify}>
              <View style={[styles.iconCircle, { backgroundColor: '#5856D6' }]}>
                 <Bell color="white" size={24} />
              </View>
              <Text style={styles.actionLabel}>Notify Me</Text>
           </TouchableOpacity>

           <TouchableOpacity style={styles.actionButton} onPress={handleWhisper}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFD700' }]}>
                 <MessageSquare color="white" size={24} />
              </View>
              <Text style={styles.actionLabel}>Whisper (1🪙)</Text>
           </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
           <X color="white" size={28} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 100000, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '80%' },
  avatarContainer: { width: 120, height: 120, marginBottom: 30, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, zIndex: 2 },
  pulseCircle: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(245, 158, 11, 0.3)', zIndex: 1 },
  busyBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#F59E0B', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 3, borderWidth: 2, borderColor: 'white' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: 40 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  actionButton: { alignItems: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { color: 'white', fontSize: 12, fontWeight: '600' },
  closeButton: { marginTop: 60, padding: 10 }
});

export default CallWaitingOverlay;
