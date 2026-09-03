import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from './firebaseService';
import { groupCallContacts } from '../utils/socialDomain';
export const CALL_STATUSES=Object.freeze(['initiated','ringing','accepted','connected','ended','missed','rejected','failed','cancelled']);
export const buildCallHistoryRecord=(call)=>({callId:call.id||call.callId,callerId:call.callerId,receiverId:call.receiverId,participantIds:call.participantIds,status:call.status,durationSeconds:call.durationSeconds||0,billedCredits:call.billedCredits||0,endReason:call.endReason||null});
export const callHistoryService={groupContacts:groupCallContacts,list:async()=>{const uid=auth.currentUser?.uid;if(!uid)return[];const snapshot=await getDocs(query(collection(db,'callHistory'),where('participantIds','array-contains',uid),orderBy('createdAt','desc'),limit(200)));return snapshot.docs.map((entry)=>({id:entry.id,...entry.data()}));},record:async()=>{throw new Error('Call history finalization requires the trusted call backend.');}};
