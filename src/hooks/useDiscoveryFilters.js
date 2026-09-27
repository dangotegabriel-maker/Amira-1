import {useCallback,useSyncExternalStore} from 'react';
import {useUser} from '../context/UserContext';
import {getSessionDiscoveryFilters,setSessionDiscoveryFilters,subscribeDiscoveryFilters} from '../services/discoveryFilterStore';
export {EMPTY_DISCOVERY_FILTERS,setSessionDiscoveryFilters} from '../services/discoveryFilterStore';
export const useDiscoveryFilters=()=>{
 const {user}=useUser(),uid=user?.uid||'';
 const snapshot=useCallback(()=>getSessionDiscoveryFilters(uid),[uid]);
 const filters=useSyncExternalStore(subscribeDiscoveryFilters,snapshot,snapshot);
 const setFilters=useCallback(value=>setSessionDiscoveryFilters(uid,value),[uid]);
 return [filters,setFilters];
};
