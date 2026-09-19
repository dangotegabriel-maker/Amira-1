'use strict';
const crypto = require('node:crypto');
const D = require('./creditDomain');
const L = require('./levelDomain');
const {isConsumer} = require('./accountRole');

const createCreditService = ({db, FieldValue, HttpsError, packages = {},
  createReference = () => `amr_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`}) => {
  const catalog = D.packageCatalog(packages);
  const fail = (code, message) => { throw new HttpsError(code, message); };
  const guard = (work, code = 'failed-precondition') => { try { return work(); } catch (error) { fail(code, error.message); } };
  const auth = (uid) => guard(() => D.text(uid, 'Owner UID'), 'unauthenticated');
  const compatibility = (user) => guard(() => D.integer(user?.wallet?.creditBalance, 'Compatibility balance'));
  const requireConsumer = (snapshot) => {
    if (!snapshot.exists || !isConsumer(snapshot.data()) || snapshot.data().isDemo) fail('permission-denied', 'Consumer wallet unavailable.');
    compatibility(snapshot.data());
    return snapshot.data();
  };
  const refs = (uid) => ({user:db.doc(`users/${uid}`),wallet:db.doc(`creditWallets/${uid}`)});
  const state = (snapshot, uid, user) => guard(() => D.readWallet(snapshot.exists ? snapshot.data() : null, uid, compatibility(user)));
  const wallet = async (uid, input = {}) => {
    auth(uid);guard(() => D.strictObject(input, [], 'Wallet request'), 'invalid-argument');
    return db.runTransaction(async tx => { const r=refs(uid),[user,walletSnap]=await Promise.all([tx.get(r.user),tx.get(r.wallet)]);
      const person=requireConsumer(user);return D.walletProjection(state(walletSnap,uid,person)); });
  };
  const history = async (uid, input = {}) => {
    auth(uid);guard(() => D.strictObject(input, [], 'History request'), 'invalid-argument');
    const user=await db.doc(`users/${uid}`).get();requireConsumer(user);
    const page=await db.collection(`creditWallets/${uid}/ledger`).orderBy('createdAt','desc').limit(100).get();
    return {entries:page.docs.map(entry=>D.safeLedgerEntry(entry.id,entry.data())),bounded:true,sourceLimit:100};
  };
  const initialize = async (uid, input = {}) => {
    auth(uid);guard(() => D.strictObject(input, ['packageId'], 'Recharge request'), 'invalid-argument');
    const selected=catalog[input.packageId];if(!selected)fail('failed-precondition','Recharge package unavailable.');
    const reference=guard(()=>D.text(createReference(),'Payment reference'));
    return db.runTransaction(async tx=>{const r=refs(uid),attemptRef=db.doc(`paymentAttempts/${reference}`);
      const [user,existing]=await Promise.all([tx.get(r.user),tx.get(attemptRef)]);requireConsumer(user);
      if(existing.exists)fail('already-exists','Payment reference collision.');
      const attempt={reference,ownerUid:uid,packageId:selected.id,amountMinor:selected.amountMinor,currency:selected.currency,
        creditGrant:selected.credits,status:'pending',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),version:1};
      tx.create(attemptRef,attempt);return {reference,packageId:selected.id,status:'pending',amountMinor:selected.amountMinor,currency:selected.currency};
    });
  };
  const verifiedResult = attempt => ({reference:attempt.reference,status:'succeeded',creditedCredits:attempt.creditGrant,
    totalCredits:attempt.resultingTotalCredits,idempotent:true});
  const verify = async (uid, input = {}, providerVerify) => {
    auth(uid);guard(() => D.strictObject(input, ['reference'], 'Verification request'), 'invalid-argument');
    const reference=guard(()=>D.text(input.reference,'Payment reference'),'invalid-argument');
    if(typeof providerVerify!=='function')fail('failed-precondition','Payment verification is not configured.');
    const before=await db.doc(`paymentAttempts/${reference}`).get();
    if(!before.exists)fail('not-found','Payment attempt not found.');
    if(before.data().ownerUid!==uid)fail('permission-denied','Payment attempt belongs to another account.');
    if(before.data().status==='succeeded')return verifiedResult(before.data());
    if(before.data().status==='reversed')fail('failed-precondition','Reversed payment cannot be credited again.');
    const markFailed=async reason=>db.runTransaction(async tx=>{const ref=db.doc(`paymentAttempts/${reference}`),snap=await tx.get(ref);
      if(snap.exists&&snap.data().ownerUid===uid&&!['succeeded','reversed'].includes(snap.data().status))tx.update(ref,{status:'failed',failureReason:reason,updatedAt:FieldValue.serverTimestamp()});});
    let proof;try{proof=await providerVerify({reference});}catch(_){await markFailed('provider_unavailable');fail('failed-precondition','Provider verification unavailable.');}
    let checked;try{checked=D.providerVerification(proof,before.data());}catch(error){await markFailed('verification_rejected');fail('failed-precondition',error.message);}
    return db.runTransaction(async tx=>{
      const attemptRef=db.doc(`paymentAttempts/${reference}`),r=refs(uid),levelRef=db.doc(`consumerLevels/${uid}`),
        purchaseRef=db.doc(`consumerLevels/${uid}/qualifyingPurchases/${reference}`),providerRef=db.doc(`paymentReferences/${checked.providerTransactionId}`),
        ledgerRef=db.doc(`creditWallets/${uid}/ledger/recharge_${reference}`);
      const [attemptSnap,userSnap,walletSnap,levelSnap,purchaseSnap,providerSnap,ledgerSnap]=await Promise.all([
        tx.get(attemptRef),tx.get(r.user),tx.get(r.wallet),tx.get(levelRef),tx.get(purchaseRef),tx.get(providerRef),tx.get(ledgerRef)]);
      if(!attemptSnap.exists||attemptSnap.data().ownerUid!==uid)fail('permission-denied','Payment ownership changed.');
      const attempt=attemptSnap.data();if(attempt.status==='succeeded')return verifiedResult(attempt);
      if(attempt.status==='reversed')fail('failed-precondition','Reversed payment cannot be credited again.');
      const selected=catalog[attempt.packageId];
      if(!selected||selected.amountMinor!==attempt.amountMinor||selected.currency!==attempt.currency||selected.credits!==attempt.creditGrant)fail('failed-precondition','Recharge package authority changed.');
      guard(()=>D.providerVerification(proof,attempt));
      if(providerSnap.exists)fail(providerSnap.data().ownerUid===uid&&providerSnap.data().reference===reference?'failed-precondition':'permission-denied','Provider transaction already consumed.');
      if(ledgerSnap.exists)fail('failed-precondition','Recharge ledger already exists without settlement.');
      const person=requireConsumer(userSnap),current=state(walletSnap,uid,person),next=D.grant(current,'purchased',attempt.creditGrant);
      let level;try{level=L.recordVerifiedPurchase(levelSnap.data(),purchaseSnap.data(),{verified:true,consumerUid:uid,purchaseId:reference,qualifyingCredits:attempt.creditGrant});}
      catch(error){fail('failed-precondition',error.message);}
      const now=FieldValue.serverTimestamp(),walletData={...next,updatedAt:now};
      tx.set(r.wallet,walletData);tx.update(r.user,{'wallet.creditBalance':next.totalBalance});tx.set(levelRef,level.account,{merge:true});
      tx.create(purchaseRef,{...level.purchase,createdAt:now});tx.create(providerRef,{ownerUid:uid,reference,createdAt:now,version:1});
      tx.create(ledgerRef,{ownerUid:uid,type:'recharge',direction:'credit',credits:attempt.creditGrant,bucket:'purchased',status:'succeeded',
        sourceReference:reference,idempotencyKey:`recharge:${reference}`,balanceAfter:{total:next.totalBalance,purchased:next.purchasedCredits,
          bonus:next.bonusCredits,legacy:next.legacyCredits,unallocatedSpent:next.unallocatedSpentCredits},createdAt:now,version:1});
      tx.update(attemptRef,{status:'succeeded',verifiedAt:now,updatedAt:now,resultingTotalCredits:next.totalBalance,ledgerEntryId:ledgerRef.id});
      return {reference,status:'succeeded',creditedCredits:attempt.creditGrant,totalCredits:next.totalBalance,idempotent:false};
    });
  };
  const grantBonus = async (uid, input = {}) => {
    auth(uid);guard(()=>D.strictObject(input,['eventId','credits','source'],'Bonus grant'),'invalid-argument');
    const eventId=guard(()=>D.text(input.eventId,'Bonus event'),'invalid-argument'),credits=guard(()=>D.integer(input.credits,'Bonus Credits',{positive:true}),'invalid-argument');
    if(typeof input.source!=='string'||!input.source.trim())fail('invalid-argument','Bonus source required.');
    return db.runTransaction(async tx=>{const r=refs(uid),ledgerRef=db.doc(`creditWallets/${uid}/ledger/bonus_${eventId}`);
      const [user,walletSnap,existing]=await Promise.all([tx.get(r.user),tx.get(r.wallet),tx.get(ledgerRef)]);const person=requireConsumer(user);
      if(existing.exists)return {idempotent:true,totalCredits:existing.data().balanceAfter.total};
      const next=D.grant(state(walletSnap,uid,person),'bonus',credits),now=FieldValue.serverTimestamp();
      tx.set(r.wallet,{...next,updatedAt:now});tx.update(r.user,{'wallet.creditBalance':next.totalBalance});
      tx.create(ledgerRef,{ownerUid:uid,type:'bonus_grant',direction:'credit',credits,bucket:'bonus',status:'succeeded',sourceReference:eventId,
        idempotencyKey:`bonus:${eventId}`,balanceAfter:{total:next.totalBalance,purchased:next.purchasedCredits,bonus:next.bonusCredits,
          legacy:next.legacyCredits,unallocatedSpent:next.unallocatedSpentCredits},createdAt:now,version:1});
      return {idempotent:false,totalCredits:next.totalBalance};
    });
  };
  const reverse = async (input = {}) => {
    guard(()=>D.strictObject(input,['reference','reversalId','verified','credits'],'Reversal'),'invalid-argument');
    const reference=guard(()=>D.text(input.reference,'Payment reference'),'invalid-argument'),reversalId=guard(()=>D.text(input.reversalId,'Reversal ID'),'invalid-argument');
    if(input.verified!==true)fail('failed-precondition','Reversal is not provider-verified.');
    const credits=guard(()=>D.integer(input.credits,'Reversal Credits',{positive:true}),'invalid-argument');
    return db.runTransaction(async tx=>{const attemptRef=db.doc(`paymentAttempts/${reference}`),attemptSnap=await tx.get(attemptRef);
      if(!attemptSnap.exists)fail('failed-precondition','Verified recharge required.');
      const attempt=attemptSnap.data();
      if(attempt.status==='reversed'&&attempt.reversalId===reversalId)return {idempotent:true,status:'reversed',reference};
      if(attempt.status!=='succeeded')fail('failed-precondition','Verified recharge required.');
      const uid=attempt.ownerUid;if(credits!==attempt.creditGrant)fail('failed-precondition','Only full recharge reversal is supported.');
      const r=refs(uid),levelRef=db.doc(`consumerLevels/${uid}`),purchaseRef=db.doc(`consumerLevels/${uid}/qualifyingPurchases/${reference}`),
        ledgerRef=db.doc(`creditWallets/${uid}/ledger/reversal_${reversalId}`);
      const [user,walletSnap,levelSnap,purchaseSnap,existing]=await Promise.all([tx.get(r.user),tx.get(r.wallet),tx.get(levelRef),tx.get(purchaseRef),tx.get(ledgerRef)]);
      if(existing.exists)return {idempotent:true,status:'reversed',reference};
      const person=requireConsumer(user),current=state(walletSnap,uid,person),next=guard(()=>D.reversePurchased(current,credits));
      let level;try{level=L.reverseVerifiedPurchase(levelSnap.data(),purchaseSnap.data(),{verified:true,consumerUid:uid,reversalId,qualifyingCredits:credits});}
      catch(error){fail('failed-precondition',error.message);}
      const now=FieldValue.serverTimestamp();tx.set(r.wallet,{...next,updatedAt:now});tx.set(levelRef,level.account,{merge:true});tx.set(purchaseRef,level.purchase);
      tx.create(ledgerRef,{ownerUid:uid,type:'recharge_reversal',direction:'debit',credits,bucket:'purchased_to_legacy',status:'succeeded',
        sourceReference:reversalId,originalEntryId:`recharge_${reference}`,idempotencyKey:`reversal:${reversalId}`,affectsSpendable:false,
        balanceAfter:{total:next.totalBalance,purchased:next.purchasedCredits,bonus:next.bonusCredits,legacy:next.legacyCredits,
          unallocatedSpent:next.unallocatedSpentCredits},createdAt:now,version:1});
      tx.update(attemptRef,{status:'reversed',reversalId,reversedAt:now,updatedAt:now});return {idempotent:false,status:'reversed',reference};
    });
  };
  return {wallet,history,initialize,verify,grantBonus,reverse,catalog};
};
module.exports={createCreditService};
