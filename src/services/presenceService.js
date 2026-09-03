import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AppState } from 'react-native';
import { auth, db } from './firebaseService';
import { isPresenceFresh, PRESENCE_FRESHNESS_MS } from '../utils/socialDomain';
let lastWrite=0;let subscription=null;
const write=async(state,force=false)=>{const uid=auth.currentUser?.uid;if(!uid)return;if(!force&&Date.now()-lastWrite<60000)return;lastWrite=Date.now();await setDoc(doc(db,'presence',uid),{uid,state,lastSeenAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});};
export const presenceService={freshnessMs:PRESENCE_FRESHNESS_MS,isOnline:isPresenceFresh,start:()=>{if(subscription)return()=>presenceService.stop();write('online',true).catch(()=>{});subscription=AppState.addEventListener('change',(state)=>write(state==='active'?'online':'offline',true).catch(()=>{}));return()=>presenceService.stop();},stop:()=>{subscription?.remove?.();subscription=null;write('offline',true).catch(()=>{});},get:async(uid)=>{const snapshot=await getDoc(doc(db,'presence',uid));return snapshot.exists()?snapshot.data():null;}};
