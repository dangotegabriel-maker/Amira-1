import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MoreVertical, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { messagingService } from '../../services/messagingService';
import { blockService } from '../../services/blockService';
import { reportService } from '../../services/reportService';
import ReportUserModal from '../../components/ReportUserModal';

const toMillis = (value) => {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
};

const ChatDetailScreen = ({ route, navigation }) => {
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const receiverId = route.params?.userId;
  const name = route.params?.name || 'Conversation';

  const conversationId =
    user?.uid && receiverId
      ? messagingService.getConversationId(user.uid, receiverId)
      : '';

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationExists, setConversationExists] = useState(false);
  const [sending, setSending] = useState(false);

  const [blocked, setBlocked] = useState({
    blocked: false,
    blockedByMe: false,
  });

  const [reportOpen, setReportOpen] = useState(false);

  const list = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('UserProfile', {
              userId: receiverId,
            })
          }
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: COLORS.text,
            }}
          >
            {name}
          </Text>
        </TouchableOpacity>
      ),

      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            Alert.alert(name, 'Choose an action.', [
              {
                text: blocked.blockedByMe ? 'Unblock' : 'Block',
                style: 'destructive',
                onPress: () => toggleBlock(),
              },
              {
                text: 'Report',
                onPress: () => setReportOpen(true),
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ])
          }
        >
          <MoreVertical color={COLORS.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, name, receiverId, blocked]);

  useEffect(() => {
    if (!conversationId) return undefined;

    let active = true;

    blockService
      .getRelationship(receiverId)
      .then(setBlocked)
      .catch(() => {});

    messagingService
      .prepareConversation(receiverId)
      .then((result) => {
        if (!active) return;

        setConversationExists(result.exists);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;

        setLoading(false);

        Alert.alert(
          'Conversation unavailable',
          error.message
        );
      });

    return () => {
      active = false;
    };
  }, [conversationId, receiverId]);

  useEffect(() => {
    if (!conversationId || !conversationExists) {
      return undefined;
    }

    return messagingService.subscribeMessages(
      conversationId,
      (items) => {
        setMessages(items);
        setLoading(false);

        messagingService
          .markRead(conversationId)
          .catch(() => {});
      },
      () => setLoading(false)
    );
  }, [conversationId, conversationExists]);

  useEffect(() => {
    if (!conversationId || !conversationExists) {
      return undefined;
    }

    return messagingService.subscribeConversation(
      conversationId,
      (value) => {
        setConversation(value);
      },
      () => {}
    );
  }, [conversationId, conversationExists]);

  const send = async () => {
    if (sending || !text.trim()) return;

    setSending(true);

    try {
      await messagingService.sendText(
        receiverId,
        text,
        conversationExists
      );

      setConversationExists(true);
      setText('');
    } catch (error) {
      Alert.alert(
        'Message not sent',
        error.message
      );
    } finally {
      setSending(false);
    }
  };

  const toggleBlock = async () => {
    try {
      if (blocked.blockedByMe) {
        await blockService.unblock(receiverId);

        setBlocked({
          blocked: false,
          blockedByMe: false,
          blockedMe: false,
        });
      } else {
        await blockService.block(receiverId);

        setBlocked({
          ...blocked,
          blocked: true,
          blockedByMe: true,
        });
      }
    } catch (error) {
      Alert.alert(
        'Unable to update block',
        error.message
      );
    }
  };

  const isMessageRead = (item) => {
    if (item.senderId !== user.uid) {
      return false;
    }

    const recipientReadAt =
      conversation?.lastReadAt?.[receiverId];

    const messageCreatedAt = item.createdAt;

    if (!recipientReadAt || !messageCreatedAt) {
      return false;
    }

    return (
      toMillis(recipientReadAt) >=
      toMillis(messageCreatedAt)
    );
  };

  const bottomPadding = Math.max(
    insets.bottom,
    10
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
      keyboardVerticalOffset={
        Platform.OS === 'ios' ? 90 : 0
      }
    >
      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 70 }}
          color={COLORS.primary}
        />
      ) : (
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() =>
            list.current?.scrollToEnd({
              animated: true,
            })
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              No messages yet. Say hello when you are ready.
            </Text>
          }
          renderItem={({ item }) => {
            const mine =
              item.senderId === user.uid;

            const read =
              mine && isMessageRead(item);

            return (
              <View
                style={[
                  styles.bubble,
                  mine
                    ? styles.mine
                    : styles.theirs,
                ]}
              >
                <Text
                  style={[
                    styles.body,
                    mine && styles.mineBody,
                  ]}
                >
                  {mine && (
                    <Text style={styles.receipt}>
                      {read ? '✓✓' : '✓'}
                      {'  '}
                    </Text>
                  )}

                  {item.text}
                </Text>
              </View>
            );
          }}
        />
      )}

      <View
        style={[
          styles.composer,
          {
            paddingBottom: bottomPadding,
          },
        ]}
      >
        {blocked.blocked ? (
          <Text style={styles.blocked}>
            {blocked.blockedByMe
              ? 'You blocked this user. Unblock to message.'
              : 'Messaging is unavailable for this conversation.'}
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#A6A6AD"
              multiline
              maxLength={2000}
            />

            <TouchableOpacity
              style={[
                styles.send,
                (!text.trim() || sending) &&
                  styles.sendDisabled,
              ]}
              disabled={
                sending || !text.trim()
              }
              onPress={send}
            >
              {sending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Send
                  color="white"
                  size={19}
                />
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <ReportUserModal
        visible={reportOpen}
        onClose={() =>
          setReportOpen(false)
        }
        userName={name}
        onReport={async (
          reason,
          details
        ) => {
          await reportService.submit({
            reportedUserId: receiverId,
            contextType: 'conversation',
            contextId: conversationId,
            reason,
            details,
          });

          Alert.alert(
            'Report received',
            'Thank you. Our moderation team will review it.'
          );
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F9',
  },

  list: {
    padding: 14,
    paddingBottom: 20,
    flexGrow: 1,
  },

  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 90,
  },

  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    marginBottom: 9,
  },

  mine: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 5,
  },

  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 5,
  },

  body: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 21,
  },

  mineBody: {
    color: 'white',
  },

  receipt: {
    color: '#FFE4EA',
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: -1,
  },

  composer: {
    backgroundColor: 'white',
    paddingTop: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },

  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    backgroundColor: '#F1F1F4',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 16,
  },

  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendDisabled: {
    opacity: 0.65,
  },

  blocked: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textSecondary,
    padding: 10,
  },
});

export default ChatDetailScreen;