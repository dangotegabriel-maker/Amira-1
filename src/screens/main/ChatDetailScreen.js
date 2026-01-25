import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../theme/COLORS';
import { Video, Send } from 'lucide-react-native';

const ChatDetailScreen = ({ route, navigation }) => {
  const { name } = route.params || { name: 'Chat' };

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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messages}>
        <View style={styles.received}>
          <Text style={styles.messageText}>Hey! How are you?</Text>
        </View>
        <View style={styles.sent}>
          <Text style={[styles.messageText, { color: COLORS.white }]}>I'm good, thanks! You?</Text>
        </View>
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Type a message..." />
        <TouchableOpacity style={styles.sendButton}>
          <Send color={COLORS.white} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  messages: { flex: 1, padding: 15 },
  received: { backgroundColor: '#E9E9EB', padding: 12, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10, maxWidth: '80%' },
  sent: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 20, alignSelf: 'flex-end', marginBottom: 10, maxWidth: '80%' },
  messageText: { fontSize: 16 },
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: COLORS.white, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});
export default ChatDetailScreen;
