import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { X, Heart, Star } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const DiscoverScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>User Image</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>Jessica, 24</Text>
          <Text style={styles.bio}>Loves hiking and coffee. Let's explore!</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.dislike]}>
          <X color="#FF3B30" size={32} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.superlike]}>
          <Star color="#007AFF" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.like]}>
          <Heart color="#4CD964" size={32} fill="#4CD964" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8', alignItems: 'center', paddingTop: 60 },
  card: { width: width * 0.9, height: '70%', backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 },
  imagePlaceholder: { flex: 1, backgroundColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#888', fontSize: 18 },
  cardInfo: { padding: 20 },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  bio: { fontSize: 16, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 30 },
  actionButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', marginHorizontal: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3 },
  dislike: { borderColor: '#FF3B30', borderWidth: 1 },
  superlike: { borderColor: '#007AFF', borderWidth: 1, width: 50, height: 50 },
  like: { borderColor: '#4CD964', borderWidth: 1 },
});
export default DiscoverScreen;
