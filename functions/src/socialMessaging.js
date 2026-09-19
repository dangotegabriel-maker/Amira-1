'use strict';
const {isConsumer, accountRole}=require('./accountRole');
const M = require('./messageEntitlements');
const C = require('./creditDomain');
const { nonnegativeInteger } = require('./economyDomain');
const validFollow = (a, b, data, aUid, bUid) => Boolean(data && (
  (isConsumer(a) && M.approvedHost(b) && data.consumerId === aUid && data.hostId === bUid)
  || (M.approvedHost(a) && isConsumer(b) && data.sourceId === aUid && data.targetId === bUid && data.sourceRole === 'host' && data.targetRole === 'consumer')
));
const summary = (uid, profile) => ({ uid, username: profile.username || '', profilePic: profile.profilePic || '', role: accountRole(profile) });
const createSocialMessaging = ({ db, FieldValue, HttpsError, now: clock = () => Date.now() }) => {
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
  const reconcileNoReply = async (consumerUid, hostUid, nowMs=clock()) => {
    const conversationId=pair(consumerUid,hostUid).join('__'),windowRef=db.doc(`consumerRewards/${consumerUid}/chatWindows/${conversationId}`);
    return db.runTransaction(async tx=>{const windowSnap=await tx.get(windowRef),window=windowSnap.data();
      if(!windowSnap.exists||window.source!=='paid'||!window.unlockId)return {refunded:false};
      const unlockRef=db.doc(`messageAccess/${conversationId}/unlocks/${window.unlockId}`),unlockSnap=await tx.get(unlockRef),unlock=unlockSnap.data();
      if(!M.refundDue(unlock,nowMs))return {refunded:unlock?.status==='refunded',status:unlock?.status||null};
      const userRef=db.doc(`users/${consumerUid}`),walletRef=db.doc(`creditWallets/${consumerUid}`),ledgerRef=db.doc(`creditWallets/${consumerUid}/ledger/message_refund_${window.unlockId}`);
      const [user,walletSnap,ledger]=await Promise.all([tx.get(userRef),tx.get(walletRef),tx.get(ledgerRef)]);
      if(ledger.exists){tx.update(unlockRef,{status:'refunded',refundedAt:unlock.refundedAt||new Date(nowMs)});return {refunded:true,idempotent:true};}
      const total=C.integer(user.data()?.wallet?.creditBalance,'Compatibility balance'),current=C.readWallet(walletSnap.exists?walletSnap.data():null,consumerUid,total),next=C.refundUnallocated(current,unlock.chargeCredits);
      const timestamp=FieldValue.serverTimestamp();tx.set(walletRef,{...next,updatedAt:timestamp});tx.update(userRef,{'wallet.creditBalance':next.totalBalance});
      tx.create(ledgerRef,{ownerUid:consumerUid,type:'message_access_refund',direction:'credit',credits:unlock.chargeCredits,bucket:'unallocated_spend_reversal',status:'succeeded',sourceReference:window.unlockId,originalEntryId:`message_unlock_${window.unlockId}`,idempotencyKey:`message_refund:${window.unlockId}`,balanceAfter:{total:next.totalBalance,purchased:next.purchasedCredits,bonus:next.bonusCredits,legacy:next.legacyCredits,unallocatedSpent:next.unallocatedSpentCredits},createdAt:timestamp,version:1});
      tx.update(unlockRef,{status:'refunded',refundLedgerEntryId:ledgerRef.id,refundedAt:timestamp,updatedAt:timestamp});return {refunded:true,idempotent:false};
    });
  };
  const sendText = async (uid, data = {}) => {
    const receiverId = id(data.receiverId), requestId = id(data.messageId), participants = pair(uid, receiverId);
    if (data.type !== undefined && data.type !== 'text') throw new HttpsError('invalid-argument', 'Only text messages are supported.');
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text || text.length > 2000) throw new HttpsError('invalid-argument', 'Messages must contain 1–2,000 characters.');
    const conversationId = participants.join('__'), messageId = M.eventId('text', uid, requestId);
    const [actorPre,targetPre]=await Promise.all([db.doc(`users/${uid}`).get(),db.doc(`users/${receiverId}`).get()]);
    if(isConsumer(actorPre.data())&&M.approvedHost(targetPre.data()))await reconcileNoReply(uid,receiverId);
    else if(M.approvedHost(actorPre.data())&&isConsumer(targetPre.data()))await reconcileNoReply(receiverId,uid);
    return db.runTransaction(async (tx) => {
      const profiles = await readPair(tx, ...participants), sender = profiles[participants.indexOf(uid)];
      const receiver = profiles[participants.indexOf(receiverId)];
      if (M.approvedHost(sender) && !isConsumer(receiver)) throw new HttpsError('permission-denied', 'Hosts can message consumers only.');
      if (isConsumer(sender) && !M.approvedHost(receiver)) throw new HttpsError('permission-denied', 'Consumers can message approved Hosts only.');
      if (!isConsumer(receiver) && !M.approvedHost(receiver)) throw new HttpsError('permission-denied', 'Recipient is unavailable.');
      const conversationRef = db.doc(`conversations/${conversationId}`), messageRef = db.doc(`conversations/${conversationId}/messages/${messageId}`);
      const senderConsumer=isConsumer(sender),consumerUid=senderConsumer?uid:receiverId,hostUid=senderConsumer?receiverId:uid;
      const rewardRef = db.doc(`consumerRewards/${consumerUid}`),windowRef = db.doc(`consumerRewards/${consumerUid}/chatWindows/${conversationId}`);
      const [conversation, existing, rewards, config, window, outgoing, incoming, walletSnap] = await Promise.all([
        tx.get(conversationRef), tx.get(messageRef), tx.get(rewardRef), tx.get(db.doc('economyConfig/current')),
        tx.get(windowRef), tx.get(db.doc(`users/${uid}/following/${receiverId}`)), tx.get(db.doc(`users/${receiverId}/following/${uid}`)),tx.get(db.doc(`creditWallets/${consumerUid}`)),
      ]);
      validateConversation(conversation.data(), participants);
      if (existing.exists) {
        if (existing.data().text !== text || existing.data().senderId !== uid) throw new HttpsError('already-exists', 'This send identifier was already used.');
        return { conversationId, messageId, idempotent: true };
      }
      const serverNowMs = clock();
      const friends = validFollow(sender, receiver, outgoing.data(), uid, receiverId)
        && validFollow(receiver, sender, incoming.data(), receiverId, uid);
      const policy = M.messagePolicy(config.data()), decision = M.resolveMessagingEntitlement(sender, rewards.data(), policy, { friends, window: window.data(), nowMs: serverNowMs });
      const now = FieldValue.serverTimestamp();
      let paid=null;
      if (!decision.allowed) {
        if(decision.source==='ineligible_role')throw new HttpsError('permission-denied','Messaging is unavailable.');
        const paidPolicy=M.paidMessagingPolicy(config.data());
        if(!paidPolicy.enabled)throw new HttpsError('failed-precondition','Paid messaging is not available.',{reason:'paid_messaging_unavailable'});
        const total=C.integer(sender?.wallet?.creditBalance,'Compatibility balance');
        if(total<paidPolicy.priceCredits)throw new HttpsError('resource-exhausted','You need more Credits to unlock messaging.',{reason:'insufficient_credits',requiredCredits:paidPolicy.priceCredits,availableCredits:total});
        const unlockId=M.eventId('paid_access',conversationId,messageId),unlockRef=db.doc(`messageAccess/${conversationId}/unlocks/${unlockId}`),ledgerRef=db.doc(`creditWallets/${uid}/ledger/message_unlock_${unlockId}`);
        const [unlockExisting,ledgerExisting]=await Promise.all([tx.get(unlockRef),tx.get(ledgerRef)]);
        if(unlockExisting.exists||ledgerExisting.exists)throw new HttpsError('failed-precondition','Messaging unlock state is inconsistent.');
        const current=C.readWallet(walletSnap.exists?walletSnap.data():null,uid,total),next=C.debitUnallocated(current,paidPolicy.priceCredits);
        paid={unlockId,unlockRef,ledgerRef,next,price:paidPolicy.priceCredits,policy:paidPolicy};
      }
      if (decision.allowed && decision.consume) {
        const balance = nonnegativeInteger(rewards.data().freeMessages - 1);
        tx.set(rewardRef, { freeMessages: balance, updatedAt: now }, { merge: true });
        const windowId = M.eventId('chat_window', conversationId, messageId);
        tx.set(windowRef, { consumerUid: uid, hostUid:receiverId,conversationId, otherUid: receiverId, openedAt: new Date(serverNowMs), expiresAt: new Date(serverNowMs + M.CHAT_WINDOW_MS), source: 'free_message', sourceTransactionId: windowId, windowId, updatedAt: now });
        tx.create(db.doc(`consumerRewards/${uid}/messageTransactions/${windowId}`),
          M.transactionData({ uid, delta: -1, balance, source: 'chat_window', sourceId: messageId, conversationId, messageId, otherUid: receiverId, windowId, policyVersion: policy.version, createdAt: now }));
      }
      if(paid){
        const openedAt=new Date(serverNowMs),expiresAt=new Date(serverNowMs+M.CHAT_WINDOW_MS),refundDeadline=new Date(serverNowMs+M.NO_REPLY_MS);
        tx.set(db.doc(`creditWallets/${uid}`),{...paid.next,updatedAt:now});tx.update(db.doc(`users/${uid}`),{'wallet.creditBalance':paid.next.totalBalance});
        tx.create(paid.ledgerRef,{ownerUid:uid,type:'message_access_unlock',direction:'debit',credits:paid.price,bucket:'unallocated',status:'succeeded',sourceReference:paid.unlockId,idempotencyKey:`message_unlock:${paid.unlockId}`,balanceAfter:{total:paid.next.totalBalance,purchased:paid.next.purchasedCredits,bonus:paid.next.bonusCredits,legacy:paid.next.legacyCredits,unallocatedSpent:paid.next.unallocatedSpentCredits},createdAt:now,version:1});
        tx.create(paid.unlockRef,{unlockId:paid.unlockId,conversationId,consumerUid:uid,hostUid:receiverId,participantIds:participants,source:'paid',status:'awaiting_reply',chargeCredits:paid.price,chargeLedgerEntryId:paid.ledgerRef.id,openedAt,expiresAt,refundDeadline,genuineReplyAt:null,refundedAt:null,policyVersion:paid.policy.version,createdAt:now,updatedAt:now,version:1});
        tx.set(windowRef,{consumerUid:uid,hostUid:receiverId,conversationId,otherUid:receiverId,source:'paid',unlockId:paid.unlockId,openedAt,expiresAt,refundDeadline,updatedAt:now});
      }
      if(!senderConsumer&&window.data()?.source==='paid'&&window.data()?.unlockId){
        const unlockRef=db.doc(`messageAccess/${conversationId}/unlocks/${window.data().unlockId}`),unlockSnap=await tx.get(unlockRef),unlock=unlockSnap.data();
        if(M.timelyHostReply({unlock,authorUid:uid,type:'text',createdAtMs:serverNowMs}))tx.update(unlockRef,{status:'replied',genuineReplyAt:new Date(serverNowMs),replyMessageId:messageId,updatedAt:now});
      }
      const message = { text, senderId: uid, type: 'text', createdAt: now };
      tx.create(messageRef, { ...message, id: messageId, conversationId, receiverId, status: 'sent' });
      tx.set(conversationRef, conversationPatch(conversation.data(), participants, profiles, message, now, uid));
      return { conversationId, messageId, idempotent: false, windowOpened: decision.consume === 1||Boolean(paid),accessSource:paid?'paid':decision.source,chargedCredits:paid?.price||0 };
    });
  };
  const getChatAccess = async (uid, otherUid) => {
    const participants = pair(uid, otherUid), conversationId = participants.join('__');
    const result=await db.runTransaction(async (tx) => {
      const [sender, receiver] = await readPair(tx, uid, otherUid);
      const [rewards, window, outgoing, incoming, config] = await Promise.all([
        tx.get(db.doc(`consumerRewards/${uid}`)), tx.get(db.doc(`consumerRewards/${uid}/chatWindows/${conversationId}`)),
        tx.get(db.doc(`users/${uid}/following/${otherUid}`)), tx.get(db.doc(`users/${otherUid}/following/${uid}`)), tx.get(db.doc('economyConfig/current')),
      ]);
      const friends = validFollow(sender, receiver, outgoing.data(), uid, otherUid) && validFollow(receiver, sender, incoming.data(), otherUid, uid);
      const serverNowMs = clock();
      const decision = M.resolveMessagingEntitlement(sender, rewards.data(), M.messagePolicy(config.data()), { friends, window: window.data(), nowMs: serverNowMs });
      return { ...decision, friends, balance: M.chatPassBalance(rewards.data()), expiresAtMs: M.millis(window.data()?.expiresAt), serverNowMs,
        actorConsumer:isConsumer(sender),targetHost:M.approvedHost(receiver),paidMessaging:M.paidMessagingPolicy(config.data()),accessSource:window.data()?.source||null };
    });
    if(result.actorConsumer&&result.targetHost)await reconcileNoReply(uid,otherUid,result.serverNowMs);
    const {actorConsumer,targetHost,...safe}=result;return safe;
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
  const profileViews=require('./profileViews').createProfileViews({db,FieldValue,HttpsError});
  const trackProfileView=profileViews.track,listProfileViews=profileViews.list;
  return { getChatAccess, sendText, reconcileNoReply, syncFriendship, trackProfileView, listProfileViews };
};
module.exports = { createSocialMessaging, validFollow };
