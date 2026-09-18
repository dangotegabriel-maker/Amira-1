import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
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
import { MoreVertical, Send, Video, Gift } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsFocused } from '@react-navigation/native';
import { useAndroidKeyboardOverlap } from '../../hooks/useAndroidKeyboardOverlap';
import { useMessageActivity } from '../../context/MessageActivityContext';
import { chatPassService, chatAccessLabel, CHAT_PASS_COPY } from '../../services/chatPassService';
import { followService } from '../../services/followService';
import { dbService } from '../../services/firebaseService';
import { isApprovedHost, isConsumer } from '../../models/userModel';
import { startVideoCall } from '../../services/callNavigationService';
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
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => { const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active')); return () => sub.remove(); }, []);
  const activity = useMessageActivity();
  const keyboard = useAndroidKeyboardOverlap();
  const [recipient, setRecipient] = useState(null);
  const [access, setAccess] = useState(null);
  const [accessVersion, setAccessVersion] = useState(0);
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
  const pendingSend = useRef(null);

  useEffect(() => {
    if (!focused || !receiverId) return undefined;
    let alive = true;
    dbService.getUserProfile(receiverId).then((profile) => { if (alive) setRecipient(profile); }).catch(() => {});
    activity.setActiveConversation(conversationId);
    const stop = followService.subscribeRelationship(receiverId, (value) => { setBlocked(value); setAccessVersion((n) => n + 1); }, () => {});
    return () => { alive = false; activity.setActiveConversation(null); stop(); };
  }, [focused, receiverId, conversationId]);
  useEffect(() => {
    if (!focused || !isConsumer(user) || !receiverId || blocked.blocked) return undefined;
    let alive = true, timer;
    chatPassService.getAccess(receiverId).then((value) => {
      if (!alive) return;
      setAccess(value);
      if (value.expiresAtMs > value.serverNowMs) timer = setTimeout(() => setAccessVersion((n) => n + 1), Math.min(2147483647, value.expiresAtMs - value.serverNowMs + 100));
    }).catch(() => { if (alive) setAccess(null); });
    return () => { alive = false; clearTimeout(timer); };
  }, [focused, receiverId, user?.role, accessVersion, blocked.blocked]);
  const hostActions = isConsumer(user) && recipient?.uid === receiverId && isApprovedHost(recipient) && !blocked.blocked;

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {hostActions && <>
          <TouchableOpacity accessibilityLabel="Video call" onPress={() => startVideoCall({ navigation, creator: recipient })}><Video color={COLORS.primary} /></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Gifts" onPress={() => Alert.alert('Gifts are coming soon', 'Gifting is not available yet. No Credits will be spent.')}><Gift color={COLORS.primary} /></TouchableOpacity>
        </>}
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
        </TouchableOpacity></View>
      ),
    });
  }, [navigation, name, receiverId, blocked, hostActions, recipient]);

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
    if (!conversationId || !conversationExists || !focused || !appActive) {
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
  }, [conversationId, conversationExists, focused, appActive]);

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
    if (!pendingSend.current || pendingSend.current.text !== text || pendingSend.current.receiverId !== receiverId) {
      pendingSend.current = { text, receiverId, id: messagingService.createMessageId() };
    }

    try {
      await messagingService.sendText(
        receiverId,
        text,
        conversationExists,
        pendingSend.current.id
      );

      setAccessVersion((n) => n + 1);
      setConversationExists(true);
      pendingSend.current = null;
      setText('');
    } catch (error) {
      if (['insufficient_messages', 'insufficient_chat_passes'].includes(error.details?.reason)) {
        Alert.alert('You need a Chat Pass to continue this conversation.', CHAT_PASS_COPY, [
          { text: 'View Rewards', onPress: () => navigation.navigate('Rewards') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }
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
    <View ref={keyboard.viewport} onLayout={keyboard.measure} style={styles.container}>
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: keyboard.overlap }]}
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
            if (item.type === 'friendship_created') return (
              <Text style={styles.systemMessage}>You and {name} are now friends 🎉</Text>
            );
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

      {isConsumer(user) && !blocked.blocked && <Text style={{ color: COLORS.textSecondary, fontSize: 12, paddingHorizontal: 14, paddingVertical: 6 }}>{chatAccessLabel(access)}</Text>}
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
              accessibilityLabel="Send message"
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
    </KeyboardAvoidingView></View>
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

  systemMessage: { alignSelf: 'center', color: COLORS.textSecondary, textAlign: 'center', marginVertical: 12, fontSize: 13 },

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
