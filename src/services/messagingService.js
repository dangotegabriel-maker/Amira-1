import { collection, doc, getDoc, increment, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth, db, dbService } from './firebaseService';
import { blockService } from './blockService';
import { getDirectConversationId } from '../utils/socialDomain';

const summary = (user) => ({ uid: user.uid, username: user.username || '', profilePic: user.profilePic || '', role: user.role || '' });
export const messagingService = {
  getConversationId: getDirectConversationId,
  prepareConversation: async (receiverId) => {
    const sender = auth.currentUser;
    if (!sender?.uid || !receiverId || receiverId === sender.uid) throw new Error('Choose a valid recipient.');
    if ((await blockService.getRelationship(receiverId)).blocked) throw new Error('Messaging is unavailable because one of you has blocked the other.');
    const receiverProfile = await dbService.getUserProfile(receiverId);
    if (!receiverProfile) throw new Error('Recipient profile is unavailable.');
    const conversationId = getDirectConversationId(sender.uid, receiverId);
    const conversationRef = doc(db, 'conversations', conversationId);
    try {
      return { conversationId, exists: (await getDoc(conversationRef)).exists() };
    } catch (error) {
      // The deployed participant-only rule cannot authorize a read against a
      // document that does not exist yet. Treat that specific result as a new
      // chat; sendText will create the parent and first message atomically.
      if (error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied') {
        return { conversationId, exists: false };
      }
      throw error;
    }
  },
  subscribeInbox: (onValue, onError) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};
    return onSnapshot(query(collection(db, 'conversations'), where('participantIds', 'array-contains', uid), orderBy('lastMessageAt', 'desc'), limit(100)), (snapshot) => onValue(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))), onError);
  },
  subscribeMessages: (conversationId, onValue, onError) => onSnapshot(query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'), limit(250)), (snapshot) => onValue(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))), onError),
  sendText: async (receiverId, text) => {
    const sender = auth.currentUser;
    if (!sender?.uid) throw new Error('Sign in required.');
    const clean = String(text || '').trim();
    if (!clean) throw new Error('Write a message first.');
    if (clean.length > 2000) throw new Error('Messages can be up to 2,000 characters.');
    if (!receiverId || receiverId === sender.uid) throw new Error('Choose a valid recipient.');
    if ((await blockService.getRelationship(receiverId)).blocked) throw new Error('Messaging is unavailable because one of you has blocked the other.');
    const [senderProfile, receiverProfile] = await Promise.all([dbService.getUserProfile(sender.uid), dbService.getUserProfile(receiverId)]);
    if (!receiverProfile) throw new Error('Recipient profile is unavailable.');
    const conversationId = getDirectConversationId(sender.uid, receiverId);
    const conversationRef = doc(db, 'conversations', conversationId);
    const messageRef = doc(collection(conversationRef, 'messages'));
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(conversationRef);
      const base = existing.exists() ? existing.data() : {};
      const now = serverTimestamp();
      transaction.set(messageRef, { id: messageRef.id, conversationId, senderId: sender.uid, receiverId, type: 'text', text: clean, createdAt: now, status: 'sent' });
      transaction.set(conversationRef, {
        id: conversationId,
        participantIds: [sender.uid, receiverId].sort(),
        participants: base.participants || { [sender.uid]: summary(senderProfile || { uid: sender.uid }), [receiverId]: summary(receiverProfile) },
        lastMessage: { text: clean, senderId: sender.uid, type: 'text', createdAt: now }, lastMessageAt: now,
        unreadCounts: { ...(base.unreadCounts || {}), [sender.uid]: 0, [receiverId]: increment(1) },
        lastReadAt: { ...(base.lastReadAt || {}), [sender.uid]: now }, createdAt: base.createdAt || now, updatedAt: now,
      }, { merge: true });
    });
    return conversationId;
  },
  markRead: async (conversationId) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !conversationId) return;
    const conversationRef = doc(db, 'conversations', conversationId);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(conversationRef);
      if (!snapshot.exists() || !snapshot.data().participantIds?.includes(uid)) return;
      transaction.update(conversationRef, { [`unreadCounts.${uid}`]: 0, [`lastReadAt.${uid}`]: serverTimestamp(), updatedAt: serverTimestamp() });
    });
  },
};
