'use strict';
const crypto=require('node:crypto'),C=require('./creditDomain'),G=require('./giftDomain');
const {isConsumer,isApprovedHost,accountRole}=require('./accountRole');
const createGiftService=({db,FieldValue,HttpsError,now=()=>Date.now()})=>{
 const fail=(code,message,details)=>{throw new HttpsError(code,message,details);};
 const guard=(fn,code='failed-precondition')=>{try{return fn();}catch(error){fail(code,error.message);}};
 const text=(value,name)=>guard(()=>C.text(value,name),'invalid-argument');
 const pair=(a,b)=>[a,b].sort(),txId=(uid,requestId)=>crypto.createHash('sha256').update(JSON.stringify(['gift',uid,requestId])).digest('hex');
 const loadConfig=async()=>{const snap=await db.doc('giftConfig/current').get();return guard(()=>G.config(snap.data()));};
 const catalog=async(uid,input={})=>{text(uid,'Owner UID');if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)fail('invalid-argument','Invalid Gift catalogue request.');
  try{const cfg=await loadConfig();return {available:true,version:cfg.version,gifts:Object.values(cfg.gifts).filter(g=>g.enabled).sort((a,b)=>a.displayOrder-b.displayOrder).map(({economicsVersion,...g})=>g)};}catch(_){return {available:false,gifts:[]};}};
 const send=async(uid,input={})=>{
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['hostUid','giftId','source','requestId'].includes(k)))fail('invalid-argument','Invalid Gift request.');
  text(uid,'Consumer UID');const hostUid=text(input.hostUid,'Host UID'),giftId=text(input.giftId,'Gift ID'),requestId=text(input.requestId,'Request ID'),source=guard(()=>G.source(input.source),'invalid-argument');
  if(uid===hostUid)fail('permission-denied','Self-Gifting is unavailable.');const transactionId=txId(uid,requestId);
  return db.runTransaction(async tx=>{
   const refs={consumer:db.doc(`users/${uid}`),host:db.doc(`users/${hostUid}`),left:db.doc(`users/${uid}/blocked/${hostUid}`),right:db.doc(`users/${hostUid}/blocked/${uid}`),config:db.doc('giftConfig/current'),wallet:db.doc(`creditWallets/${uid}`),gift:db.doc(`giftTransactions/${transactionId}`),hostMoney:db.doc(`hostEarnings/${hostUid}`),hostRecord:db.doc(`hostEarnings/${hostUid}/giftTransactions/${transactionId}`),platform:db.doc('platformRevenue/creditsEquivalent'),aggregate:db.doc(`hostGiftAggregates/${hostUid}/types/${giftId}`)};
   const conversationId=pair(uid,hostUid).join('__'),messageRef=db.doc(`conversations/${conversationId}/messages/gift_${transactionId}`),conversationRef=db.doc(`conversations/${conversationId}`);
   const [consumerSnap,hostSnap,left,right,configSnap,walletSnap,existing,hostMoney,hostRecord,platform,aggregate,conversation,message]=await Promise.all(Object.values(refs).slice(0,12).map(ref=>tx.get(ref)).concat([tx.get(conversationRef),tx.get(messageRef)]));
   if(existing.exists){const prior=existing.data();if(prior.consumerUid!==uid||prior.requestId!==requestId)fail('already-exists','Gift request identity conflict.');return {transactionId,giftId:prior.giftId,chargedCredits:prior.priceCredits,idempotent:true};}
   const consumer=consumerSnap.data(),host=hostSnap.data();if(!consumerSnap.exists||!isConsumer(consumer)||consumer.isDemo)fail('permission-denied','Only Consumers can send Gifts.');if(!hostSnap.exists||!isApprovedHost(host)||host.isDemo)fail('permission-denied','Gift recipient is unavailable.');if(left.exists||right.exists)fail('permission-denied','Gifting is unavailable for this connection.');
   const cfg=guard(()=>G.config(configSnap.data())),gift=cfg.gifts[giftId];if(!gift?.enabled)fail('failed-precondition','Gifting is currently unavailable.',{reason:'gifting_unavailable'});
   const total=guard(()=>C.integer(consumer.wallet?.creditBalance,'Compatibility balance')),current=guard(()=>C.readWallet(walletSnap.exists?walletSnap.data():null,uid,total));
   let next;try{next=C.debitPurchasedGift(current,gift.priceCredits);}catch(_){fail('resource-exhausted','More purchased Credits are needed.',{reason:'insufficient_purchased_credits',requiredCredits:gift.priceCredits,eligiblePurchasedCredits:C.giftEligiblePurchased(current)});}
   const split=G.allocation(gift.priceCredits,cfg.economics.hostShareBasisPoints),timestamp=FieldValue.serverTimestamp(),openedAt=new Date(now());
   const ledgerRef=db.doc(`creditWallets/${uid}/ledger/gift_${transactionId}`),ledger=await tx.get(ledgerRef);if(ledger.exists||hostRecord.exists||message.exists)fail('failed-precondition','Gift accounting is inconsistent.');
   const snapshot={giftId,name:gift.name,asset:gift.asset,displayOrder:gift.displayOrder};
   tx.set(refs.wallet,{...next,updatedAt:timestamp});tx.update(refs.consumer,{'wallet.creditBalance':next.totalBalance});
   tx.create(ledgerRef,{ownerUid:uid,type:'gift_send',direction:'debit',credits:gift.priceCredits,bucket:'purchased',status:'succeeded',sourceReference:transactionId,idempotencyKey:`gift:${transactionId}`,balanceAfter:{total:next.totalBalance,purchased:next.purchasedCredits,bonus:next.bonusCredits,legacy:next.legacyCredits,unallocatedSpent:next.unallocatedSpentCredits},createdAt:timestamp,version:1});
   const record={transactionId,requestId,consumerUid:uid,hostUid,giftId,giftSnapshot:snapshot,priceCredits:gift.priceCredits,source,catalogVersion:cfg.version,economicsVersion:cfg.economics.version,hostCreditsEquivalent:split.hostCreditsEquivalent,platformCreditsEquivalent:split.platformCreditsEquivalent,creditLedgerEntryId:ledgerRef.id,hostEarningRecordId:refs.hostRecord.id,status:'succeeded',createdAt:timestamp,createdAtMs:openedAt.getTime(),version:1};
   tx.create(refs.gift,record);tx.create(refs.hostRecord,{...record,accountingStatus:'pending_internal',payoutEligible:false});
   tx.set(refs.hostMoney,{hostUid,pendingCreditsEquivalent:(hostMoney.data()?.pendingCreditsEquivalent||0)+split.hostCreditsEquivalent,giftPendingCreditsEquivalent:(hostMoney.data()?.giftPendingCreditsEquivalent||0)+split.hostCreditsEquivalent,lifetimeGiftCreditsEquivalent:(hostMoney.data()?.lifetimeGiftCreditsEquivalent||0)+split.hostCreditsEquivalent,updatedAt:timestamp},{merge:true});
   tx.set(refs.platform,{accruedCreditsEquivalent:(platform.data()?.accruedCreditsEquivalent||0)+split.platformCreditsEquivalent,giftCreditsEquivalent:(platform.data()?.giftCreditsEquivalent||0)+split.platformCreditsEquivalent,updatedAt:timestamp},{merge:true});
   tx.set(refs.aggregate,{hostUid,giftId,giftSnapshot:snapshot,count:(aggregate.data()?.count||0)+1,highestValueCredits:gift.priceCredits,updatedAt:timestamp},{merge:true});
   const participants=pair(uid,hostUid),base=conversation.data();if(base&&(base.participantIds?.length!==2||!participants.every(p=>base.participantIds.includes(p))))fail('failed-precondition','Conversation participants do not match.');
   const giftMessage={id:`gift_${transactionId}`,conversationId,type:'gift',senderId:uid,receiverId:hostUid,giftTransactionId:transactionId,giftSnapshot:snapshot,text:`Sent ${gift.name}`,status:'sent',createdAt:timestamp};
   const unread={...(base?.unreadCounts||{}),[uid]:0,[hostUid]:(base?.unreadCounts?.[hostUid]||0)+1},summaries=base?.participants||{[uid]:{uid,username:consumer.username||'',profilePic:consumer.profilePic||'',role:accountRole(consumer)},[hostUid]:{uid:hostUid,username:host.username||'',profilePic:host.profilePic||'',role:accountRole(host)}};
   tx.create(messageRef,giftMessage);tx.set(conversationRef,{id:conversationId,participantIds:participants,participants:summaries,lastMessage:{type:'gift',text:`Sent ${gift.name}`,senderId:uid,createdAt:timestamp},lastMessageAt:timestamp,unreadCounts:unread,lastReadAt:{...Object.fromEntries(participants.map(p=>[p,null])),...(base?.lastReadAt||{}),[uid]:timestamp},createdAt:base?.createdAt||timestamp,updatedAt:timestamp});
   return {transactionId,giftId,chargedCredits:gift.priceCredits,idempotent:false};
  });
 };
 const publicAggregates=async(hostUid)=>{text(hostUid,'Host UID');const host=await db.doc(`users/${hostUid}`).get();if(!host.exists||!isApprovedHost(host.data())||host.data().isDemo)fail('not-found','Host unavailable.');const page=await db.collection(`hostGiftAggregates/${hostUid}/types`).limit(25).get();return {gifts:page.docs.map(d=>({giftId:d.data().giftId,name:d.data().giftSnapshot?.name||'Gift',asset:d.data().giftSnapshot?.asset||{},count:d.data().count||0,valueOrder:d.data().highestValueCredits||0})).sort((a,b)=>b.valueOrder-a.valueOrder).slice(0,10).map(({valueOrder,...g})=>g)};};
 return {catalog,send,publicAggregates};
};
module.exports={createGiftService};
