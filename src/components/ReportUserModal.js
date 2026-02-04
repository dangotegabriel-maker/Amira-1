// src/components/ReportUserModal.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { COLORS } from '../theme/COLORS';
import { X } from 'lucide-react-native';

const REASONS = [
  'Harassment',
  'Inappropriate Content',
  'Spam',
  'Fraud/Scam',
  'Underage',
  'Other'
];

const ReportUserModal = ({ visible, onClose, onReport, userName }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');

  const handleReport = () => {
    if (selectedReason) {
      onReport(selectedReason, additionalInfo);
      onClose();
    }
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
            <Text style={styles.title}>Report {userName}</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.text} size={24} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Select a reason for reporting:</Text>

          <FlatList
            data={REASONS}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.reasonItem,
                  selectedReason === item && styles.reasonItemSelected
                ]}
                onPress={() => setSelectedReason(item)}
              >
                <Text style={[
                  styles.reasonText,
                  selectedReason === item && styles.reasonTextSelected
                ]}>{item}</Text>
              </TouchableOpacity>
            )}
            style={styles.reasonList}
          />

          <TextInput
            style={styles.input}
            placeholder="Tell us more (optional)..."
            multiline
            numberOfLines={4}
            value={additionalInfo}
            onChangeText={setAdditionalInfo}
          />

          <TouchableOpacity
            style={[styles.reportButton, !selectedReason && styles.reportButtonDisabled]}
            disabled={!selectedReason}
            onPress={handleReport}
          >
            <Text style={styles.reportButtonText}>Send Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 15,
  },
  reasonList: {
    marginBottom: 15,
  },
  reasonItem: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 10,
  },
  reasonItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  reasonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  reasonTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  reportButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  reportButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  reportButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReportUserModal;
