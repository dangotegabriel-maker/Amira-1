'use strict';
const { eventId, approvedHost } = require('./messageEntitlements');
const REVIEW_TAGS = Object.freeze(['Friendly', 'Good conversation', 'Respectful']);
const eligibleCallReview = (call, uid) => Boolean(call && call.callerId === uid
  && call.status === 'ended' && call.connectedAtMs > 0 && call.durationSeconds > 0
  && call.participantIds?.includes(call.receiverId));

const createCallReviews = ({ db, FieldValue, HttpsError }) => {
  const refs = (uid, callId) => {
    if (typeof callId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(callId)) throw new HttpsError('invalid-argument', 'Invalid call.');
    return [db.doc(`calls/${callId}`), db.doc(`callReviews/${eventId('call_review', callId, uid)}`)];
  };
  const status = async (uid, callId) => {
    const [call, review] = await Promise.all(refs(uid, callId).map((ref) => ref.get()));
    if (!call.data()?.participantIds?.includes(uid)) throw new HttpsError('permission-denied', 'Call unavailable.');
    return { eligible: eligibleCallReview(call.data(), uid), rating: review.data()?.rating || null };
  };
  const submit = async (uid, data = {}) => {
    const { callId, rating, tags = [] } = data;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !Array.isArray(tags)
      || tags.length > REVIEW_TAGS.length || tags.some((tag) => !REVIEW_TAGS.includes(tag))) throw new HttpsError('invalid-argument', 'Choose a rating from 1 to 5 and supported tags.');
    const [callRef, reviewRef] = refs(uid, callId);
    return db.runTransaction(async (tx) => {
      const [callSnap, previous] = await Promise.all([tx.get(callRef), tx.get(reviewRef)]);
      const call = callSnap.data();
      if (!eligibleCallReview(call, uid)) throw new HttpsError('permission-denied', 'Only your completed video calls can be reviewed.');
      if (previous.exists) {
        if (previous.data().rating !== rating) throw new HttpsError('already-exists', 'This call has already been reviewed.');
        return { rating, idempotent: true };
      }
      const reputationRef = db.doc(`hostReputation/${call.receiverId}`);
      const [host, reputation, block, reverseBlock] = await Promise.all([
        tx.get(db.doc(`users/${call.receiverId}`)), tx.get(reputationRef),
        tx.get(db.doc(`users/${uid}/blocked/${call.receiverId}`)), tx.get(db.doc(`users/${call.receiverId}/blocked/${uid}`)),
      ]);
      if (!approvedHost(host.data()) || block.exists || reverseBlock.exists) throw new HttpsError('permission-denied', 'Review unavailable.');
      const count = (reputation.data()?.reviewCount || 0) + 1;
      const sum = (reputation.data()?.ratingSum || 0) + rating;
      const tagCounts = { ...(reputation.data()?.tagCounts || {}) };
      for (const tag of new Set(tags)) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      const now = FieldValue.serverTimestamp();
      tx.create(reviewRef, { callId, reviewerUid: uid, hostUid: call.receiverId, rating,
        tags: [...new Set(tags)], createdAt: now, eligibilityVersion: 'completed-call-v1' });
      tx.set(reputationRef, { hostUid: call.receiverId, reviewCount: count, ratingSum: sum, averageRating: sum / count, tagCounts, updatedAt: now });
      return { rating, idempotent: false };
    });
  };
  return { status, submit };
};
module.exports = { createCallReviews, eligibleCallReview, REVIEW_TAGS };
