import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { auth, db } from './firebaseService';
import { publicIdentityService } from './publicIdentityService';
import { blockService } from './blockService';
import { getDirectConversationId } from '../utils/socialDomain';

export const messagingService = {
  getConversationId: getDirectConversationId,

  prepareConversation: async (receiverId) => {
    const sender = auth.currentUser;

    if (!sender?.uid || !receiverId || receiverId === sender.uid) {
      throw new Error('Choose a valid recipient.');
    }

    if ((await blockService.getRelationship(receiverId)).blocked) {
      throw new Error(
        'Messaging is unavailable because one of you has blocked the other.'
      );
    }

    const receiverProfile = await publicIdentityService.message(receiverId);

    if (!receiverProfile) {
      throw new Error('Recipient profile is unavailable.');
    }

    const conversationId = getDirectConversationId(
      sender.uid,
      receiverId
    );

    const conversationRef = doc(
      db,
      'conversations',
      conversationId
    );

    try {
      return {
        conversationId,
        exists: (await getDoc(conversationRef)).exists(),
      };
    } catch (error) {
      // A participant-only read cannot authorize a document
      // that does not exist yet. Treat that specific result
      // as a new conversation.
      if (
        error?.code === 'permission-denied' ||
        error?.code === 'firestore/permission-denied'
      ) {
        return {
          conversationId,
          exists: false,
        };
      }

      throw error;
    }
  },

  subscribeInbox: (onValue, onError, { all = false } = {}) => {
    const uid = auth.currentUser?.uid;

    if (!uid) return () => {};

    return onSnapshot(
      query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', uid),
        orderBy('lastMessageAt', 'desc'),
        ...(all ? [] : [limit(100)])
      ),
      { includeMetadataChanges: true },
      (snapshot) =>
        onValue(
          snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data(),
          })),
          { fromCache: snapshot.metadata.fromCache }
        ),
      onError
    );
  },

  subscribeMessages: (conversationId, onValue, onError) =>
    onSnapshot(
      query(
        collection(
          db,
          'conversations',
          conversationId,
          'messages'
        ),
        orderBy('createdAt', 'asc'),
        limit(250)
      ),
      (snapshot) =>
        onValue(
          snapshot.docs.map((entry) => ({
            id: entry.id,
            ...entry.data(),
          }))
        ),
      onError
    ),

  subscribeConversation: (conversationId, onValue, onError) =>
  onSnapshot(
    doc(db, 'conversations', conversationId),
    (snapshot) =>
      onValue(
        snapshot.exists()
          ? { id: snapshot.id, ...snapshot.data() }
          : null
      ),
    onError
  ),

  createMessageId: () => doc(collection(db, 'messageRequests')).id,

  sendText: async (receiverId, text, conversationAlreadyExists = false, messageId) => {
    if (!auth.currentUser?.uid) throw new Error('Sign in required.');
    const { invokeSocial } = require('./socialBackend');
    const result = await invokeSocial('sendTextMessage', {
      receiverId, text, type: 'text',
      messageId: messageId || messagingService.createMessageId(),
    });
    return result.conversationId;
  },

  markRead: async (conversationId) => {
    const uid = auth.currentUser?.uid;

    if (!uid || !conversationId) return;

    const conversationRef = doc(
      db,
      'conversations',
      conversationId
    );

    await runTransaction(db, async (transaction) => {
      const snapshot =
        await transaction.get(conversationRef);

      if (
        !snapshot.exists() ||
        !snapshot.data().participantIds?.includes(uid)
      ) {
        return;
      }

      transaction.update(conversationRef, {
        [`unreadCounts.${uid}`]: 0,
        [`lastReadAt.${uid}`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  },
};
