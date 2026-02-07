// src/components/NudgeInbox.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/COLORS';
import { MessageSquare, ChevronRight } from 'lucide-react-native';
import { hapticService } from '../services/hapticService';

const NudgeInbox = ({ navigation }) => {
  const [nudges, setNudges] = useState([
    { id: '1', name: 'Jessica', time: '5m ago' },
    { id: '2', name: 'Mark', time: '20m ago' },
  ]);

  if (nudges.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Nudges</Text>
      {nudges.map(nudge => (
        <TouchableOpacity
           key={nudge.id}
           style={styles.nudgeItem}
           onPress={() => {
              hapticService.lightImpact();
              navigation.navigate('UserProfile', { userId: nudge.id, name: nudge.name });
           }}
        >
          <View style={styles.iconContainer}>
             <MessageSquare color={COLORS.primary} size={16} />
          </View>
          <Text style={styles.nudgeText}>
             <Text style={{ fontWeight: 'bold' }}>{nudge.name}</Text> nudged you while you were busy.
          </Text>
          <Text style={styles.time}>{nudge.time}</Text>
          <ChevronRight color="#CCC" size={16} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: 'white', marginTop: 10 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  nudgeItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF5F7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  nudgeText: { flex: 1, fontSize: 13, color: '#555' },
  time: { fontSize: 11, color: '#999', marginRight: 8 },
});

export default NudgeInbox;
