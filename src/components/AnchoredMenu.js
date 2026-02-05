// src/components/AnchoredMenu.js
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { COLORS } from '../theme/COLORS';

const { width, height } = Dimensions.get('window');

const AnchoredMenu = ({ visible, onClose, options, anchorPosition }) => {
  if (!anchorPosition) return null;

  // Calculate position to ensure it stays on screen
  const menuWidth = 200;
  const menuHeight = options.length * 48;

  let top = anchorPosition.y + 10;
  let left = anchorPosition.x - menuWidth + 20;

  // Adjust if too close to edges
  if (left < 10) left = 10;
  if (left + menuWidth > width - 10) left = width - menuWidth - 10;
  if (top + menuHeight > height - 50) top = height - menuHeight - 50;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.menu, { top, left, width: menuWidth }]}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  index !== options.length - 1 && styles.border,
                  option.destructive && styles.destructive
                ]}
                onPress={() => {
                  option.onPress();
                  onClose();
                }}
              >
                <Text style={[styles.optionText, option.destructive && styles.destructiveText]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  destructiveText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
});

export default AnchoredMenu;
