import {useCallback,useSyncExternalStore} from 'react';
import {useUser} from '../context/UserContext';
export const EMPTY_DISCOVERY_FILTERS=Object.freeze({country:null,language:'',minAge:'',maxAge:'',onlineOnly:false,interests:[]});
const sessions=new Map(),listeners=new Set();
const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
export const setSessionDiscoveryFilters=(uid,value)=>{sessions.set(uid,value);listeners.forEach(listener=>listener());};
export const useDiscoveryFilters=()=>{
 const {user}=useUser(),uid=user?.uid||'';
 const snapshot=useCallback(()=>sessions.get(uid)||EMPTY_DISCOVERY_FILTERS,[uid]);
 const filters=useSyncExternalStore(subscribe,snapshot,snapshot);
 const setFilters=useCallback(value=>setSessionDiscoveryFilters(uid,value),[uid]);
 return [filters,setFilters];
};
