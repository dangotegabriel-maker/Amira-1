'use strict';
const {utcDateKey}=require('./callDomain');
const safe=value=>String(value).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,128);
const record=(tx,db,FieldValue,{consumerUid,criterion,eventId,occurredAtMs=Date.now(),metadata={}})=>{
 const dateKey=utcDateKey(new Date(occurredAtMs)),base={consumerUid,criterion,eventId:safe(eventId),occurredAt:FieldValue.serverTimestamp(),occurredAtMs,dateKey,...metadata};
 tx.set(db.doc(`consumerRewardEvidence/${consumerUid}/events/${safe(`${criterion}_all_${eventId}`)}`),{...base,period:'all'},{merge:false});
 tx.set(db.doc(`consumerRewardEvidence/${consumerUid}/events/${safe(`${criterion}_${dateKey}_${eventId}`)}`),{...base,period:dateKey},{merge:false});
};
module.exports={record};
