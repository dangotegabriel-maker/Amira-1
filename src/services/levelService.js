import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseService';
import './callService';
const functions=getFunctions(app,'us-central1');
const invoke=async(name,data={})=>(await httpsCallable(functions,name)(data)).data;
export const levelService={getOwn:()=>invoke('getMyAmiraLevel'),getConsumer:(consumerUid)=>invoke('getConsumerAmiraLevel',{consumerUid}),claim:(level)=>invoke('claimAmiraLevelMilestone',{level})};
