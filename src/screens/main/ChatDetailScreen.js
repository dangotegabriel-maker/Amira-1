import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert, Keyboard, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Video, Send, Mic, Plus, Image as ImageIcon, MoreVertical, Gift, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { moderationService } from '../../services/moderationService';
import { translationService } from '../../services/translationService';
import { socketService } from '../../services/socketService';
import { soundService } from '../../services/soundService';
import { getGiftAsset } from '../../services/giftingService';
import { ledgerService } from '../../services/ledgerService';
import { useGifting } from '../../context/GiftingContext';
import ReportUserModal from '../../components/ReportUserModal';
import GiftTray from '../../components/GiftTray';
import AnchoredMenu from '../../components/AnchoredMenu';
import VIPBadge from '../../components/VIPBadge';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INITIAL_ICEBREAKERS = [
  "Hey! 👋",
  "Your profile is 🔥",
  "Wanna chat? 😊",
  "Gift for you? 🎁",
  "Hello from the other side! 🌎"
];

const ChatDetailScreen = ({ route, navigation }) => {
  const { name, userId = 'target_user_id', totalSpent = 0 } = route.params || { name: 'Chat' };
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isGiftTrayVisible, setIsGiftTrayVisible] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [showIcebreakers, setShowIcebreakers] = useState(true);

  const { triggerGiftOverlay } = useGifting();

  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([
    { id: '1', text: 'Hey! How are you?', sender: 'them', time: '10:30 AM', translatedText: null },
    { id: '2', text: "I'm good, thanks! You?", sender: 'me', time: '10:31 AM', translatedText: null },
    { id: '3', text: 'Doing great! Want to catch up later?', sender: 'them', time: '10:32 AM', translatedText: null },
  ]);

  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);

  useEffect(() => {
    checkAutoTranslate();

    // Initialize Zen Audio and preload common sounds
    soundService.init();
    soundService.preload([
      'https://www.soundjay.com/nature/wind-chime-1.mp3',
      'https://www.soundjay.com/magic/magic-chime-01.mp3',
      'https://www.soundjay.com/magic/magic-chime-03.mp3'
    ]);

    // Connect to socket
    socketService.connect('current_user_id');
    const handleIncomingGift = async (data) => {
      await ledgerService.recordReceivedGift(data.giftId);
      const giftAsset = getGiftAsset(data.giftId);
      const newMessage = {
        id: Date.now().toString(),
        text: `Received a ${giftAsset.name || 'gift'} 🎁`,
        sender: 'them',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, newMessage]);
    };

    socketService.on('gift_received', handleIncomingGift);

    return () => {
      socketService.off('gift_received', handleIncomingGift);
      socketService.disconnect();
    };
  }, []);

  const checkAutoTranslate = async () => {
    const enabled = await AsyncStorage.getItem('auto_translate');
    if (enabled === 'true') {
      setAutoTranslateEnabled(true);
      messages.forEach((msg, index) => {
        if (msg.sender === 'them' && !msg.translatedText) {
          handleTranslate(msg.id, msg.text, index);
        }
      });
    }
  };

  const handleTranslate = async (id, text, index) => {
    const translated = await translationService.translateMessage(text, 'en');
    setMessages(prev => prev.map((m, i) =>
      m.id === id ? { ...m, translatedText: translated } : m
    ));
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text }}>{name}</Text>
          <VIPBadge totalSpent={totalSpent} />
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ marginRight: 15 }} onPress={() => {}}>
            <Video color={COLORS.primary} size={24} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginRight: 15 }}
            onPress={(e) => {
              const { pageX, pageY } = e.nativeEvent;
              setMenuPosition({ x: pageX, y: pageY + 10 });
              setIsMenuVisible(true);
            }}
          >
            <MoreVertical color={COLORS.text} size={24} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, name, totalSpent]);

  const menuOptions = [
    { label: "Report User", onPress: () => setIsReportModalVisible(true) },
    { label: "Block User", onPress: confirmBlock, destructive: true },
  ];

  const confirmBlock = () => {
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${name}? You will no longer see their messages.`,
      [
        { text: "Cancel", style: 'cancel' },
        { text: "Block", onPress: handleBlock, style: 'destructive' }
      ]
    );
  };

  const handleBlock = async () => {
    await moderationService.blockUser('current_user_id', userId);
    Alert.alert("Success", `${name} has been blocked.`);
    navigation.goBack();
  };

  const handleReport = async (reason, info) => {
    const snapshot = messages.slice(-5);
    await moderationService.reportUser('current_user_id', userId, reason, snapshot);
    Alert.alert("Report Sent", "Our moderation team will review your report shortly.");
  };

  const handleGiftSent = (gift, combo) => {
    triggerGiftOverlay(gift.id, 'You', combo);
    socketService.sendGift(userId, { giftId: gift.id, combo });

    if (combo === 1) {
       const newMessage = {
         id: Date.now().toString(),
         text: `Sent a ${gift.name} ${gift.icon}`,
         sender: 'me',
         time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
       };
       setMessages(prev => [...prev, newMessage]);
    }
  };

  const handleSend = (textToSend) => {
    const finalMsg = typeof textToSend === 'string' ? textToSend : message;
    if (finalMsg.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: finalMsg,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setMessage('');
      if (typeof textToSend === 'string') {
        setShowIcebreakers(false); // Clear the chip row after quick reply
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newMessage = {
        id: Date.now().toString(),
        image: result.assets[0].uri,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
    }
  };

  const renderItem = ({ item: msg }) => (
    <View style={[
      styles.bubbleContainer,
      msg.sender === 'me' ? styles.myBubbleContainer : styles.theirBubbleContainer
    ]}>
      <View style={[
        styles.bubble,
        msg.sender === 'me' ? styles.myBubble : styles.theirBubble
      ]}>
        {msg.text ? (
          <View>
            <Text style={[
              styles.messageText,
              msg.sender === 'me' ? styles.myMessageText : styles.theirMessageText
            ]}>
              {msg.text}
            </Text>
            {msg.translatedText && (
              <View style={styles.translationContainer}>
                <View style={styles.translationDivider} />
                <Text style={[
                  styles.translatedText,
                  msg.sender === 'me' ? styles.myMessageText : styles.theirMessageText
                ]}>
                  {msg.translatedText}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Image source={{ uri: msg.image }} style={styles.bubbleImage} />
        )}
      </View>
      <Text style={styles.timestamp}>{msg.time}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.messageList}
          contentContainerStyle={{ paddingVertical: 20 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            isRecording ? (
              <View style={styles.recordingIndicator}>
                <Mic color={COLORS.primary} size={20} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
            ) : null
          }
        />

        <ReportUserModal
          visible={isReportModalVisible}
          onClose={() => setIsReportModalVisible(false)}
          onReport={handleReport}
          userName={name}
        />
        <GiftTray
          visible={isGiftTrayVisible}
          onClose={() => setIsGiftTrayVisible(false)}
          onGiftSent={handleGiftSent}
        />
        <AnchoredMenu
          visible={isMenuVisible}
          onClose={() => setIsMenuVisible(false)}
          options={menuOptions}
          anchorPosition={menuPosition}
        />

        <View style={styles.inputArea}>
           {showIcebreakers && (
             <View style={styles.icebreakerContainer}>
               <ScrollView
                 horizontal
                 showsHorizontalScrollIndicator={false}
                 style={styles.icebreakers}
                 contentContainerStyle={{ paddingHorizontal: 10 }}
               >
                  {INITIAL_ICEBREAKERS.map((text, i) => (
                    <TouchableOpacity key={i} style={styles.icebreakerChip} onPress={() => handleSend(text)}>
                       <Text style={styles.icebreakerText}>{text}</Text>
                    </TouchableOpacity>
                  ))}
               </ScrollView>
               <TouchableOpacity style={styles.closeIcebreakers} onPress={() => setShowIcebreakers(false)}>
                  <X size={14} color="#999" />
               </TouchableOpacity>
             </View>
           )}

           <View style={styles.inputBar}>
            <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
              <Plus color={COLORS.textSecondary} size={24} />
            </TouchableOpacity>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                value={message}
                onChangeText={(t) => {
                  setMessage(t);
                  if (t.length > 0) setShowIcebreakers(false);
                }}
                multiline
              />
            </View>
            {message.trim() ? (
              <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
                <Send color={COLORS.white} size={20} />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPressIn={() => setIsRecording(true)}
                  onPressOut={() => setIsRecording(false)}
                >
                  <Mic color={isRecording ? COLORS.primary : COLORS.textSecondary} size={24} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
                  <ImageIcon color={COLORS.textSecondary} size={24} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => setIsGiftTrayVisible(true)}>
                  <Gift color={COLORS.primary} size={24} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  messageList: { flex: 1, paddingHorizontal: 15 },
  bubbleContainer: { marginBottom: 15, maxWidth: '80%' },
  myBubbleContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirBubbleContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: COLORS.white },
  theirMessageText: { color: COLORS.text },
  bubbleImage: { width: 200, height: 150, borderRadius: 10 },
  translationContainer: { marginTop: 8 },
  translationDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginBottom: 5 },
  translatedText: { fontSize: 14, fontStyle: 'italic', opacity: 0.9 },
  timestamp: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4 },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E9',
    padding: 10,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'center'
  },
  recordingText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 10 },

  inputArea: { backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#EEE', paddingBottom: Platform.OS === 'ios' ? 30 : 10 },
  icebreakerContainer: { flexDirection: 'row', alignItems: 'center' },
  icebreakers: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  icebreakerChip: { backgroundColor: '#F0F0F0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  icebreakerText: { color: COLORS.text, fontSize: 13, fontWeight: '500' },
  closeIcebreakers: { padding: 10 },

  inputBar: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginHorizontal: 8,
    maxHeight: 100
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
    color: COLORS.text
  },
  iconButton: { padding: 8 },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
});

export default ChatDetailScreen;
