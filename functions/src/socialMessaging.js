'use strict';
const {isConsumer, accountRole}=require('./accountRole');
const M = require('./messageEntitlements');
const { nonnegativeInteger } = require('./economyDomain');
const validFollow = (a, b, data, aUid, bUid) => Boolean(data && (
  (isConsumer(a) && M.approvedHost(b) && data.consumerId === aUid && data.hostId === bUid)
  || (M.approvedHost(a) && isConsumer(b) && data.sourceId === aUid && data.targetId === bUid && data.sourceRole === 'host' && data.targetRole === 'consumer')
));
const summary = (uid, profile) => ({ uid, username: profile.username || '', profilePic: profile.profilePic || '', role: accountRole(profile) });
const createSocialMessaging = ({ db, FieldValue, HttpsError }) => {
  const id = (value) => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new HttpsError('invalid-argument', 'Invalid identifier.');
    return value;
  };
  const pair = (a, b) => {
    id(a); id(b);
    if (a === b) throw new HttpsError('invalid-argument', 'Choose another user.');
    return [a, b].sort();
  };
  const readPair = async (tx, a, b) => {
    const [first, second, blocked, reverseBlocked] = await Promise.all([
      tx.get(db.doc(`users/${a}`)), tx.get(db.doc(`users/${b}`)),
      tx.get(db.doc(`users/${a}/blocked/${b}`)), tx.get(db.doc(`users/${b}/blocked/${a}`)),
    ]);
    if (!first.exists || !second.exists) throw new HttpsError('not-found', 'Profile unavailable.');
    if (blocked.exists || reverseBlocked.exists) throw new HttpsError('permission-denied', 'Interaction unavailable because of a block.');
    return [first.data(), second.data()];
  };
  const validateConversation = (base, participants) => {
    if (base && (base.participantIds?.length !== 2 || !participants.every((uid) => base.participantIds.includes(uid)))) {
      throw new HttpsError('failed-precondition', 'Conversation participants do not match.');
    }
  };
  const conversationPatch = (base, participants, profiles, message, now, sender) => {
    const unreadCounts = { ...(base?.unreadCounts || {}) };
    for (const uid of participants) unreadCounts[uid] = message.type !== 'text' ? (unreadCounts[uid] || 0) : uid === sender ? 0 : (unreadCounts[uid] || 0) + 1;
    return { id: participants.join('__'), participantIds: participants,
      participants: base?.participants || Object.fromEntries(participants.map((uid, i) => [uid, summary(uid, profiles[i])])),
      lastMessage: message, lastMessageAt: now, unreadCounts,
      lastReadAt: { ...Object.fromEntries(participants.map((uid) => [uid, null])), ...(base?.lastReadAt || {}), ...(sender ? { [sender]: now } : {}) },
      createdAt: base?.createdAt || now, updatedAt: now };
  };
  const sendText = async (uid, data = {}) => {
    const receiverId = id(data.receiverId), requestId = id(data.messageId), participants = pair(uid, receiverId);
    if (data.type !== undefined && data.type !== 'text') throw new HttpsError('invalid-argument', 'Only text messages are supported.');
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text || text.length > 2000) throw new HttpsError('invalid-argument', 'Messages must contain 1–2,000 characters.');
    const conversationId = participants.join('__'), messageId = M.eventId('text', uid, requestId);
    return db.runTransaction(async (tx) => {
      const profiles = await readPair(tx, ...participants), sender = profiles[participants.indexOf(uid)];
      const receiver = profiles[participants.indexOf(receiverId)];
      if (M.approvedHost(sender) && !isConsumer(receiver)) throw new HttpsError('permission-denied', 'Hosts can message consumers only.');
      if (!isConsumer(receiver) && !M.approvedHost(receiver)) throw new HttpsError('permission-denied', 'Recipient is unavailable.');
      const conversationRef = db.doc(`conversations/${conversationId}`), messageRef = db.doc(`conversations/${conversationId}/messages/${messageId}`);
      const rewardRef = db.doc(`consumerRewards/${uid}`);
      const windowRef = db.doc(`consumerRewards/${uid}/chatWindows/${conversationId}`);
      const [conversation, existing, rewards, config, window, outgoing, incoming] = await Promise.all([
        tx.get(conversationRef), tx.get(messageRef), tx.get(rewardRef), tx.get(db.doc('economyConfig/current')),
        tx.get(windowRef), tx.get(db.doc(`users/${uid}/following/${receiverId}`)), tx.get(db.doc(`users/${receiverId}/following/${uid}`)),
      ]);
      validateConversation(conversation.data(), participants);
      if (existing.exists) {
        if (existing.data().text !== text || existing.data().senderId !== uid) throw new HttpsError('already-exists', 'This send identifier was already used.');
        return { conversationId, messageId, idempotent: true };
      }
      const serverNowMs = Date.now();
      const friends = validFollow(sender, receiver, outgoing.data(), uid, receiverId)
        && validFollow(receiver, sender, incoming.data(), receiverId, uid);
      const policy = M.messagePolicy(config.data()), decision = M.resolveMessagingEntitlement(sender, rewards.data(), policy, { friends, window: window.data(), nowMs: serverNowMs });
      if (!decision.allowed) throw new HttpsError(decision.source === 'ineligible_role' ? 'permission-denied' : 'resource-exhausted',
        'You need a Chat Pass to continue this conversation.', { reason: decision.source === 'ineligible_role' ? 'ineligible_role' : 'insufficient_chat_passes' });
      const now = FieldValue.serverTimestamp();
      if (decision.consume) {
        const balance = nonnegativeInteger(rewards.data().freeMessages - 1);
        tx.set(rewardRef, { freeMessages: balance, updatedAt: now }, { merge: true });
        const windowId = M.eventId('chat_window', conversationId, messageId);
        tx.set(windowRef, { consumerUid: uid, conversationId, otherUid: receiverId, openedAt: new Date(serverNowMs), expiresAt: new Date(serverNowMs + M.CHAT_WINDOW_MS), source: 'chat_pass', sourceTransactionId: windowId, windowId, updatedAt: now });
        tx.create(db.doc(`consumerRewards/${uid}/messageTransactions/${windowId}`),
          M.transactionData({ uid, delta: -1, balance, source: 'chat_window', sourceId: messageId, conversationId, messageId, otherUid: receiverId, windowId, policyVersion: policy.version, createdAt: now }));
      }
      const message = { text, senderId: uid, type: 'text', createdAt: now };
      tx.create(messageRef, { ...message, id: messageId, conversationId, receiverId, status: 'sent' });
      tx.set(conversationRef, conversationPatch(conversation.data(), participants, profiles, message, now, uid));
      return { conversationId, messageId, idempotent: false, windowOpened: decision.consume === 1 };
    });
  };
  const getChatAccess = async (uid, otherUid) => {
    const participants = pair(uid, otherUid), conversationId = participants.join('__');
    return db.runTransaction(async (tx) => {
      const [sender, receiver] = await readPair(tx, uid, otherUid);
      const [rewards, window, outgoing, incoming, config] = await Promise.all([
        tx.get(db.doc(`consumerRewards/${uid}`)), tx.get(db.doc(`consumerRewards/${uid}/chatWindows/${conversationId}`)),
        tx.get(db.doc(`users/${uid}/following/${otherUid}`)), tx.get(db.doc(`users/${otherUid}/following/${uid}`)), tx.get(db.doc('economyConfig/current')),
      ]);
      const friends = validFollow(sender, receiver, outgoing.data(), uid, otherUid) && validFollow(receiver, sender, incoming.data(), otherUid, uid);
      const serverNowMs = Date.now();
      const decision = M.resolveMessagingEntitlement(sender, rewards.data(), M.messagePolicy(config.data()), { friends, window: window.data(), nowMs: serverNowMs });
      return { ...decision, friends, balance: M.chatPassBalance(rewards.data()), expiresAtMs: M.millis(window.data()?.expiresAt), serverNowMs };
    });
  };
  const syncFriendship = async (a, b) => {
    const participants = pair(a, b), conversationId = participants.join('__'), friendshipId = M.eventId('friendship', participants);
    return db.runTransaction(async (tx) => {
      const profiles = await readPair(tx, ...participants);
      const [first, second, event, config, conversation] = await Promise.all([
        tx.get(db.doc(`users/${participants[0]}/following/${participants[1]}`)),
        tx.get(db.doc(`users/${participants[1]}/following/${participants[0]}`)),
        tx.get(db.doc(`friendships/${friendshipId}`)), tx.get(db.doc('economyConfig/current')),
        tx.get(db.doc(`conversations/${conversationId}`)),
      ]);
      const mutual = validFollow(profiles[0], profiles[1], first.data(), ...participants)
        && validFollow(profiles[1], profiles[0], second.data(), participants[1], participants[0]);
      if (!mutual || event.exists) return { friends: mutual, created: false };
      validateConversation(conversation.data(), participants);
      const policy = M.messagePolicy(config.data());
      const grants = await Promise.all(participants.map((uid) => M.prepareMessageGrant({ tx, db, FieldValue, uid,
        amount: policy.friendshipMessages, source: 'friendship', sourceId: friendshipId, policyVersion: policy.version })));
      const now = FieldValue.serverTimestamp(), messageId = `friendship_${friendshipId}`;
      const message = { type: 'friendship_created', text: 'You are now friends 🎉', createdAt: now, senderId: null };
      grants.forEach((grant) => grant());
      tx.create(db.doc(`friendships/${friendshipId}`), { participantIds: participants, conversationId, messageId, createdAt: now, policyVersion: policy.version });
      tx.create(db.doc(`conversations/${conversationId}/messages/${messageId}`), { ...message, id: messageId, conversationId, participantIds: participants, status: 'sent' });
      tx.set(db.doc(`conversations/${conversationId}`), conversationPatch(conversation.data(), participants, profiles, message, now));
      return { friends: true, created: true };
    });
  };
  const trackProfileView = async (viewerUid, ownerUid) => {
    id(ownerUid);
    if (viewerUid === ownerUid) return { counted: false };
    return db.runTransaction(async (tx) => {
      const profiles = await readPair(tx, viewerUid, ownerUid);
      if (profiles.some((p) => p.isProfileComplete === false || p.isDemo)) return { counted: false };
      const ref = db.doc(`users/${ownerUid}/profileViews/${viewerUid}`), view = await tx.get(ref);
      if (view.exists && Date.now() - M.millis(view.data().lastViewedAt) < 30 * 60 * 1000) return { counted: false };
      const now = FieldValue.serverTimestamp();
      tx.set(ref, { viewerUid, firstViewedAt: view.data()?.firstViewedAt || now, lastViewedAt: now,
        viewCount: (view.data()?.viewCount || 0) + 1 });
      if (!view.exists) tx.update(db.doc(`users/${ownerUid}`), { 'profileViewStats.recentCount': (profiles[1].profileViewStats?.recentCount || 0) + 1 });
      return { counted: true };
    });
  };
  const listProfileViews = async (uid) => {
    const profile = (await db.doc(`users/${uid}`).get()).data();
    const reveal = M.approvedHost(profile) || (M.activeVip(profile) && ['VIP_1', 'VIP_2', 'VIP_3'].includes(profile.vip.tier));
    const snapshot = await db.collection(`users/${uid}/profileViews`).orderBy('lastViewedAt', 'desc').limit(100).get();
    const views = (await Promise.all(snapshot.docs.map(async (entry) => {
      const view = entry.data();
      const [blocked, reverse] = await Promise.all([db.doc(`users/${uid}/blocked/${view.viewerUid}`).get(), db.doc(`users/${view.viewerUid}/blocked/${uid}`).get()]);
      return blocked.exists || reverse.exists ? null : { viewerUid: view.viewerUid, viewCount: view.viewCount,
        firstViewedAtMs: M.millis(view.firstViewedAt), lastViewedAtMs: M.millis(view.lastViewedAt) };
    }))).filter(Boolean);
    return { count: views.length, reveal, views: reveal ? views : [] };
  };
  return { getChatAccess, sendText, syncFriendship, trackProfileView, listProfileViews };
};
module.exports = { createSocialMessaging, validFollow };
