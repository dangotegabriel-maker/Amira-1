import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Video, Send, Mic, Plus, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const ChatDetailScreen = ({ route, navigation }) => {
  const { name } = route.params || { name: 'Chat' };
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const [messages, setMessages] = useState([
    { id: '1', text: 'Hey! How are you?', sender: 'them', time: '10:30 AM' },
    { id: '2', text: "I'm good, thanks! You?", sender: 'me', time: '10:31 AM' },
    { id: '3', text: 'Doing great! Want to catch up later?', sender: 'them', time: '10:32 AM' },
  ]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={{ marginRight: 15 }} onPress={() => {}}>
          <Video color={COLORS.primary} size={24} />
        </TouchableOpacity>
      ),
      title: name,
    });
  }, [navigation, name]);

  const handleSend = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setMessage('');
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.messageList} contentContainerStyle={{ paddingVertical: 20 }}>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <Mic color={COLORS.primary} size={20} />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
        )}
        {messages.map((msg) => (
          <View key={msg.id} style={[
            styles.bubbleContainer,
            msg.sender === 'me' ? styles.myBubbleContainer : styles.theirBubbleContainer
          ]}>
            <View style={[
              styles.bubble,
              msg.sender === 'me' ? styles.myBubble : styles.theirBubble
            ]}>
              {msg.text ? (
                <Text style={[
                  styles.messageText,
                  msg.sender === 'me' ? styles.myMessageText : styles.theirMessageText
                ]}>
                  {msg.text}
                </Text>
              ) : (
                <Image source={{ uri: msg.image }} style={styles.bubbleImage} />
              )}
            </View>
            <Text style={styles.timestamp}>{msg.time}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
          <Plus color={COLORS.textSecondary} size={24} />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            multiline
          />
        </View>
        {message.trim() ? (
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
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
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  inputBar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10
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
