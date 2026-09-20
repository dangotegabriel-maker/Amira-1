import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { MessageCircle, RefreshCw, Sparkles, UserRound, Video } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { discoveryService } from '../../services/discoveryService';
import {useDiscoveryFilters} from '../../hooks/useDiscoveryFilters';
import {filterDiscoveryHosts} from '../../utils/discoveryFilters';
import HostCard from '../../components/HostCard';
import { startVideoCall } from '../../services/callNavigationService';
import {quickMatchService} from '../../services/quickMatchService';

const MatchScreen = ({ navigation }) => {
  const { user } = useUser();
  const [filters]=useDiscoveryFilters(); const focused=useIsFocused();
  const seen=useRef([]),request=useRef(0);
  const [error,setError]=useState('');
  const [hosts, setHosts] = useState([]);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quick,setQuick]=useState(null);const [quickBusy,setQuickBusy]=useState(false);
  const quickNavigated=useRef(null);
  useEffect(()=>{if(!quick||!['searching','offering','accepted','connecting'].includes(quick.status))return undefined;let active=true;const sync=()=>quickMatchService.state().then(value=>{if(!active)return;setQuick(value);if(value.status==='connecting'&&value.callId&&quickNavigated.current!==value.callId){quickNavigated.current=value.callId;navigation.navigate('VideoCall',{call:value,creator:value.host});}}).catch(()=>{});const timer=setInterval(sync,3000);return()=>{active=false;clearInterval(timer)}},[quick?.requestId,quick?.status,navigation]);

  const findMatch = useCallback(async () => {
    const version=++request.current;setLoading(true);setError('');
    try {
      const eligible=filterDiscoveryHosts(await discoveryService.getApprovedHosts(),filters).filter(host=>host.hostStatus?.availability!=='busy');
      if(version!==request.current)return;
      setHosts(eligible);
      let nextMatch=discoveryService.getBestMatch(eligible,user,seen.current);
      if(!nextMatch){seen.current=[];nextMatch=discoveryService.getBestMatch(eligible,user,[]);}
      setMatch(nextMatch);
    } catch(e){if(version===request.current){setHosts([]);setMatch(null);setError('Matches could not be loaded. Try again.');}}
    finally {if(version===request.current)setLoading(false);}
  },[filters,user?.uid,user?.countryCode]);
  useFocusEffect(useCallback(()=>{findMatch();return()=>{request.current++;};},[findMatch]));

  const next = () => {
    if (!match) return findMatch([]);
    const nextSkipped = [...seen.current, match.uid];
    seen.current=nextSkipped;
    const nextMatch = discoveryService.getBestMatch(hosts, user, nextSkipped);
    if (nextMatch) { setMatch(nextMatch); }
    else { seen.current=[]; setMatch(discoveryService.getBestMatch(hosts, user, [])); }
  };

  if (loading) return <View style={styles.center}><Sparkles color={COLORS.primary} size={44} /><Text style={styles.finding}>Finding someone for you...</Text><ActivityIndicator color={COLORS.primary} /></View>;
  if (!match) return <View style={styles.center}><Sparkles color={COLORS.primary} size={44} /><Text style={styles.emptyTitle}>No eligible Hosts right now</Text><Text style={styles.emptyText}>{error||'Try changing your Home filters or come back later.'}</Text><TouchableOpacity style={styles.primary} onPress={() => findMatch([])}><RefreshCw color="white" /><Text style={styles.primaryText}>Try Again</Text></TouchableOpacity></View>;

  const openProfile=()=>navigation.navigate('UserProfile',{userId:match.uid});
  const message=()=>navigation.navigate('ChatDetail',{userId:match.uid,name:match.username});
  const startQuick=async()=>{if(quickBusy)return;setQuickBusy(true);try{const value=await quickMatchService.start();setQuick(value);if(value.status==='connecting'&&value.callId)navigation.navigate('VideoCall',{call:value,creator:value.host});}catch(e){setQuick({status:'unavailable',message:e.message});}finally{setQuickBusy(false)}};
  const cancelQuick=async()=>{if(!quick?.requestId)return;setQuickBusy(true);try{setQuick(await quickMatchService.cancel(quick.requestId));}finally{setQuickBusy(false)}};
  const quickText={offering:'Waiting for a Host response…',searching:'Finding someone…',connecting:'Connecting…',no_match:'No one is available right now. Try again later.',cancelled:'Quick Match cancelled.',unavailable:quick?.message}[quick?.status];
  return <View style={styles.container}><Text style={styles.title}>Your Amira Match</Text><Text style={styles.subtitle}>Discover someone new and start a conversation.</Text><View style={styles.quickBox}><Text style={styles.quickTitle}>Quick Match</Text><Text style={styles.quickCopy}>{quickText||'Uses 1 Quick Match. Includes a 20 sec connected intro, then your Free Video Time. Before connection, the matched Host rate is protected for the call; paid time continues automatically in 10-second increments while you have enough Credits.'}</Text>{quick&&['searching','offering','connecting'].includes(quick.status)?<TouchableOpacity onPress={cancelQuick} disabled={quickBusy}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>:<TouchableOpacity style={styles.quickButton} onPress={startQuick} disabled={quickBusy}><Text style={styles.white}>{quickBusy?'Starting…':'Start Quick Match'}</Text></TouchableOpacity>}</View><HostCard host={match} compact autoCycle={focused} onPress={openProfile} onCallPress={() => startVideoCall({ navigation, creator: match })} /><View style={styles.actions}><TouchableOpacity style={styles.secondary} onPress={openProfile}><UserRound color={COLORS.primary} /><Text style={styles.secondaryText}>Profile</Text></TouchableOpacity><TouchableOpacity style={styles.secondary} onPress={message}><MessageCircle color={COLORS.primary} /><Text style={styles.secondaryText}>Message</Text></TouchableOpacity><TouchableOpacity disabled={match.hostStatus?.availability!=='online'||!match.hostProfile?.videoRateCredits} style={styles.secondary} onPress={() => startVideoCall({ navigation, creator: match })}><Video color={COLORS.primary} /><Text style={styles.secondaryText}>Video</Text></TouchableOpacity></View><TouchableOpacity style={styles.primary} onPress={next}><RefreshCw color="white" /><Text style={styles.primaryText}>Next Match</Text></TouchableOpacity></View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9', padding: 20, paddingTop: 58 }, center: { flex: 1, backgroundColor: '#F7F7F9', alignItems: 'center', justifyContent: 'center', padding: 30 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '900' }, subtitle: { color: COLORS.textSecondary, marginTop: 5, marginBottom: 18, lineHeight: 19 }, finding: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginVertical: 18 }, emptyTitle: { color: COLORS.text, fontSize: 23, fontWeight: '900', marginTop: 16 }, emptyText: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 18 },
  quickBox:{backgroundColor:'white',borderRadius:18,padding:14,marginBottom:14},quickTitle:{fontSize:18,fontWeight:'900',color:COLORS.text},quickCopy:{color:COLORS.textSecondary,marginVertical:7},quickButton:{backgroundColor:COLORS.primary,borderRadius:18,padding:11,alignItems:'center'},white:{color:'white',fontWeight:'900'},cancel:{color:'#DC2626',fontWeight:'900'},
  actions: { flexDirection: 'row', gap: 8 }, secondary: { flex: 1, minHeight: 58, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: COLORS.text, fontSize: 11, fontWeight: '800', marginTop: 3 }, primary: { minHeight: 56, borderRadius: 28, backgroundColor: COLORS.primary, marginTop: 16, paddingHorizontal: 24, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: 'white', fontSize: 16, fontWeight: '900' },
});
export default MatchScreen;
