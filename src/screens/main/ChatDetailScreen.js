import { withRouteSafety } from '../../navigation/routeSafety';
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
import { publicIdentityService } from '../../services/publicIdentityService';
import { isApprovedHost, isConsumer } from '../../models/userModel';
import { startVideoCall } from '../../services/callNavigationService';
import { COLORS } from '../../theme/COLORS';
import { useSessionGuard } from '../../hooks/useSessionGuard';
import { useUser } from '../../context/UserContext';
import { messagingService } from '../../services/messagingService';
import { blockService } from '../../services/blockService';
import { reportService } from '../../services/reportService';
import ReportUserModal from '../../components/ReportUserModal';
import GiftTray from '../../components/GiftTray';
import {sponsoredInviteService} from '../../services/sponsoredInviteService';

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
  const targetCurrent = useSessionGuard(route.params?.userId);
  const current = useSessionGuard(route.params?.userId, focused);
  const sendLock = useRef(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => { const sub = AppState.addEventListener('change', (state) => setAppActive(state === 'active')); return () => sub.remove(); }, []);
  const activity = useMessageActivity();
  const keyboard = useAndroidKeyboardOverlap();
  const [recipientRecord, setRecipientRecord] = useState(null);
  const recipient = recipientRecord?.actorUid === user?.uid && recipientRecord?.actorHost === isApprovedHost(user) && recipientRecord?.targetUid === route.params?.userId ? recipientRecord.profile : null;
  const setRecipient = profile => setRecipientRecord(profile ? {actorUid:user?.uid,actorHost:isApprovedHost(user),targetUid:receiverId,profile} : null);
  const [identityError,setIdentityError]=useState(false);
  const [identityVersion,setIdentityVersion]=useState(0);
  const [access, setAccess] = useState(null);
  const [accessVersion, setAccessVersion] = useState(0);
  const insets = useSafeAreaInsets();

  const receiverId = route.params?.userId;
  const name = recipient?.uid === receiverId ? recipient.username || 'Identity unavailable' : 'Conversation';

  const conversationId =
    user?.uid && receiverId
      ? messagingService.getConversationId(user.uid, receiverId)
      : '';

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [prepared, setPrepared] = useState(null);
  const conversationExists = prepared?.id === conversationId && prepared?.scope === current && prepared.exists;
  const setConversationExists = exists => setPrepared({ id: conversationId, scope: current, exists });
  const [sending, setSending] = useState(false);

  const [blocked, setBlocked] = useState({
    blocked: false,
    blockedByMe: false,
  });

  const [reportOpen, setReportOpen] = useState(false);
  const [giftOpen,setGiftOpen]=useState(false);

  const list = useRef(null);
  const pendingSend = useRef(null);
  useEffect(() => {
    setMessages([]); setConversation(null); setConversationExists(false); setAccess(null);
    setSending(false); sendLock.current = false;
    setBlocked({ blocked: true, blockedByMe: false }); setLoading(true);
  }, [conversationId, current]);
  useEffect(() => { setText(''); pendingSend.current = null; }, [conversationId, targetCurrent]);

  useEffect(() => {
    setRecipient(null); setIdentityError(false);
    if (!current() || !focused || !receiverId) return undefined;
    let alive = true;
    publicIdentityService.message(receiverId).then((profile) => { if (alive && current()) setRecipient(profile); }).catch(() => {if(alive && current()) setIdentityError(true);});
    activity.setActiveConversation(conversationId);
    const stop = followService.subscribeRelationship(receiverId, (value) => { if (!alive || !current()) return; setBlocked(value); setAccessVersion((n) => n + 1); }, () => { if (alive && current()) { setBlocked({blocked:true}); setAccess(null); } }, current);
    return () => { alive = false; activity.setActiveConversation(null); stop(); };
  }, [focused, receiverId, conversationId, identityVersion, user?.hostStatus?.isApproved, blocked.blocked, current]);
  useEffect(() => {
    setAccess(null);
    if (!current() || !focused || !isConsumer(user) || !receiverId || blocked.blocked) return undefined;
    let alive = true, timer;
    chatPassService.getAccess(receiverId).then((value) => {
      if (!alive || !current()) return;
      setAccess(value);
      if (value.expiresAtMs > value.serverNowMs) timer = setTimeout(() => { if (alive && current()) setAccessVersion((n) => n + 1); }, Math.min(2147483647, value.expiresAtMs - value.serverNowMs + 100));
    }).catch(() => { if (alive && current()) setAccess(null); });
    return () => { alive = false; clearTimeout(timer); };
  }, [focused, receiverId, user?.role, accessVersion, blocked.blocked, current]);
  const hostActions = isConsumer(user) && recipient?.uid === receiverId && isApprovedHost(recipient) && !blocked.blocked;
  const sponsoredAction=isApprovedHost(user)&&recipient?.uid===receiverId&&isConsumer(recipient)&&!blocked.blocked;
  const invite=async()=>{if(!current())return;try{const value=await sponsoredInviteService.send(receiverId,'messages');if(!current())return;Alert.alert(value.idempotent?'Invite already pending':'Invite sent',`${value.sponsoredSeconds} sponsored connected seconds. The Consumer must accept the disclosed terms.`);}catch(e){if(current())Alert.alert('Unable to invite',e.message);}};

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          accessibilityLabel={identityError ? 'Retry conversation identity' : 'Open profile'}
          onPress={() => identityError ? setIdentityVersion(n=>n+1) : recipient &&
            navigation.navigate('UserProfile', {
              userId: receiverId,
              ...(route.params?.activeCallId ? { activeCallId: route.params.activeCallId } : {}),
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
            {identityError ? 'Identity unavailable. Retry' : name}
          </Text>
        </TouchableOpacity>
      ),

      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {hostActions && <>
          <TouchableOpacity accessibilityLabel="Video call" onPress={() => startVideoCall({ navigation, isCurrent: current, creator: recipient })}><Video color={COLORS.primary} /></TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Gifts" onPress={() => setGiftOpen(true)}><Gift color={COLORS.primary} /></TouchableOpacity>
        </>}
        {sponsoredAction&&<TouchableOpacity accessibilityLabel="Video Call Invite" onPress={invite}><Video color={COLORS.primary}/></TouchableOpacity>}
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
  }, [navigation, name, receiverId, route.params?.activeCallId, blocked, hostActions, sponsoredAction, recipient, identityError, current]);

  useEffect(() => {
    if (!conversationId || !current()) return undefined;

    let active = true;

    blockService
      .getRelationship(receiverId)
      .then(value => { if (active && current()) setBlocked(value); })
      .catch(() => {});

    messagingService
      .prepareConversation(receiverId, current)
      .then((result) => {
        if (!active || !current()) return;

        setConversationExists(result.exists);
        setLoading(false);
      })
      .catch((error) => {
        if (!active || !current()) return;

        setLoading(false);

        Alert.alert(
          'Conversation unavailable',
          error.message
        );
      });

    return () => {
      active = false;
    };
  }, [conversationId, receiverId, current]);

  useEffect(() => {
    if (!conversationId || !conversationExists || !focused || !appActive) {
      return undefined;
    }

    return messagingService.subscribeMessages(
      conversationId,
      (items) => {
        if (!current()) return;
        setMessages(items);
        setLoading(false);

        messagingService
          .markRead(conversationId)
          .catch(() => {});
      },
      () => { if (current()) setLoading(false); }
    );
  }, [conversationId, conversationExists, focused, appActive, current]);

  useEffect(() => {
    if (!current() || !focused || !conversationId || !conversationExists) {
      return undefined;
    }

    return messagingService.subscribeConversation(
      conversationId,
      (value) => {
        if (current()) setConversation(value);
      },
      () => {}
    );
  }, [conversationId, conversationExists, focused, current]);

  const send = async () => {
    if (!current() || sendLock.current || !text.trim()) return;
    sendLock.current = true;

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

      if (!current()) return;
      setAccessVersion((n) => n + 1);
      setConversationExists(true);
      pendingSend.current = null;
      setText('');
    } catch (error) {
      if (!current()) return;
      if (['insufficient_messages', 'insufficient_chat_passes'].includes(error.details?.reason)) {
        Alert.alert('You need a Chat Pass to continue this conversation.', CHAT_PASS_COPY, [
          { text: 'View Rewards', onPress: () => current() && navigation.navigate('Rewards') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }
      if (error.details?.reason === 'insufficient_credits') {
        Alert.alert('Not enough Credits', 'This message was not sent. Recharge is not available yet.', [
          { text: 'View Recharge', onPress: () => current() && navigation.navigate('RechargeHub') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }
      if (error.details?.reason === 'paid_messaging_unavailable') {
        Alert.alert('Messaging access unavailable', 'Paid messaging does not have an approved price yet. Your message was not sent.');
        return;
      }
      Alert.alert(
        'Message not sent',
        error.message
      );
    } finally {
      if (current()) { sendLock.current = false; setSending(false); }
    }
  };

  const toggleBlock = async () => {
    if (!current()) return;
    try {
      if (blocked.blockedByMe) {
        await blockService.unblock(receiverId);
        if (!current()) return;

        setBlocked({
          blocked: false,
          blockedByMe: false,
          blockedMe: false,
        });
      } else {
        await blockService.block(receiverId);
        if (!current()) return;

        setBlocked({
          ...blocked,
          blocked: true,
          blockedByMe: true,
        });
      }
    } catch (error) {
      if (!current()) return;
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

    <GiftTray visible={giftOpen} onClose={()=>setGiftOpen(false)} hostUid={receiverId} source="messages"/>
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
          if (!current()) return;
          try { await reportService.submit({
            reportedUserId: receiverId,
            contextType: 'conversation',
            contextId: conversationId,
            reason,
            details,
          });
          if (!current()) return;

          Alert.alert(
            'Report received',
            'Thank you. Our moderation team will review it.'
          );
          } catch (_) { if (current()) Alert.alert('Report not sent', 'Please try again.'); }
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

export default withRouteSafety('ChatDetail', ChatDetailScreen);
