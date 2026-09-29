import {useCallback,useSyncExternalStore} from 'react';
import {useUser} from '../context/UserContext';
import {getSessionDiscoveryFilters,setSessionDiscoveryFilters,subscribeDiscoveryFilters} from '../services/discoveryFilterStore';
export {EMPTY_DISCOVERY_FILTERS,setSessionDiscoveryFilters} from '../services/discoveryFilterStore';
export const useDiscoveryFilters=()=>{
 const {user,authenticatedSession}=useUser(),uid=user?.uid||'';
 const key=uid;
 const snapshot=useCallback(()=>getSessionDiscoveryFilters(key),[key]);
 const filters=useSyncExternalStore(subscribeDiscoveryFilters,snapshot,snapshot);
 const setFilters=useCallback(value=>{if(authenticatedSession?.isCurrent())setSessionDiscoveryFilters(key,value);},[key,authenticatedSession]);
 return [filters,setFilters];
};
