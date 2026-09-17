import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebaseService';
import { messagingService } from '../services/messagingService';
import { blockService } from '../services/blockService';
import { useUser } from './UserContext';
import { incomingBanner, totalUnread, visibleConversations } from '../utils/messageActivity';

const Context = createContext({ unread: 0, setActiveConversation: () => {} });
export const useMessageActivity = () => useContext(Context);

export const MessageActivityProvider = ({ children }) => {
  const { user } = useUser();
  const navigation = useNavigation(), insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0), [banner, setBanner] = useState(null);
  const activeConversation = useRef(null), appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { appState.current = state; if (state !== 'active') setBanner(null); });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    setUnread(0); setBanner(null);
    if (!user?.uid) return undefined;
    const uid = user.uid;
    let items = [], mine = null, theirs = null, primed = false, serverReady = false, alive = true;
    const seen = new Map();
    const update = (newInbox = false) => {
      if (!alive || !mine || !theirs) return;
      const blocked = new Set([...mine, ...theirs]);
      const visible = visibleConversations(items, uid, blocked);
      setUnread(totalUnread(visible, uid));
      setBanner((current) => current && blocked.has(current.userId) ? null : current);
      if (!newInbox) return;
      let displayed = false;
      for (const item of items) {
        const timestamp = item.lastMessageAt?.toMillis?.() || 0;
        const previous = seen.get(item.id) || 0;
        seen.set(item.id, timestamp);
        if (!displayed && primed && visible.includes(item) && incomingBanner(item, uid, previous, activeConversation.current, appState.current === 'active')) {
          const sender = item.lastMessage.senderId;
          setBanner({ conversationId: item.id, userId: sender, name: item.participants?.[sender]?.username || 'Amira user', text: item.lastMessage.text });
          displayed = true;
        }
      }
      primed = true;
    };
    const failed = () => { mine = null; theirs = null; primed = false; setUnread(0); setBanner(null); };
    const stops = [
      onSnapshot(collection(db, 'users', uid, 'blocked'), (snapshot) => { mine = snapshot.docs.map((entry) => entry.id); update(); }, failed),
      onSnapshot(query(collectionGroup(db, 'blocked'), where('blockedUid', '==', uid)), (snapshot) => {
        theirs = snapshot.docs.map((entry) => entry.ref.parent.parent.id); update();
      }, failed),
      messagingService.subscribeInbox((next, metadata) => { items = next; if (!serverReady || metadata?.fromCache || !mine || !theirs) { for (const item of items) seen.set(item.id, item.lastMessageAt?.toMillis?.() || 0); primed = true; if (metadata?.fromCache === false) serverReady = true; update(); return; } update(true); }, failed, { all: true }),
    ];
    return () => { alive = false; stops.forEach((stop) => stop()); };
  }, [user?.uid]);
  useEffect(() => { if (!banner) return undefined; const timer = setTimeout(() => setBanner(null), 5000); return () => clearTimeout(timer); }, [banner]);
  const setActiveConversation = (id) => {
    activeConversation.current = id;
    setBanner((current) => current?.conversationId === id ? null : current);
  };
  const openBanner = async () => {
    const target = banner; setBanner(null);
    if (target && !(await blockService.getRelationship(target.userId)).blocked) navigation.navigate('ChatDetail', { userId: target.userId, name: target.name });
  };
  return <Context.Provider value={{ unread, setActiveConversation }}>
    <View style={{ flex: 1 }}>{children}
      {banner && <TouchableOpacity accessibilityLabel="Open incoming message" style={[styles.banner, { top: insets.top + 8 }]} onPress={() => openBanner().catch(() => {})}>
        <Text style={styles.name}>{banner.name}</Text><Text numberOfLines={2}>{banner.text}</Text>
      </TouchableOpacity>}
    </View>
  </Context.Provider>;
};
const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 12, right: 12, backgroundColor: 'white', borderColor: '#FF2D55', borderWidth: 1, borderRadius: 16, padding: 16, elevation: 8, zIndex: 100 },
  name: { fontWeight: '800', color: '#FF2D55', marginBottom: 4 },
});
