import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, MessageCircle, Phone } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { isApprovedHost } from '../../models/userModel';
import { messagingService } from '../../services/messagingService';
import { presenceService } from '../../services/presenceService';
import { noticeService } from '../../services/noticeService';
import { callHistoryService } from '../../services/callHistoryService';
import { publicIdentityService } from '../../services/publicIdentityService';
import { isConversationUnreplied, toDate } from '../../utils/socialDomain';
import {formatCallHistoryTime,normalizeCallHistoryRecords} from '../../utils/callHistory';

const TABS=['All','Online','Unreplied','Calls','Notices'];
const relative=(value)=>{const date=toDate(value);if(!date)return '';const seconds=Math.max(0,(Date.now()-date.getTime())/1000);if(seconds<60)return 'Now';if(seconds<3600)return `${Math.floor(seconds/60)}m`;if(seconds<86400)return `${Math.floor(seconds/3600)}h`;return `${Math.floor(seconds/86400)}d`;};
const MessageHomeScreen=({navigation, route})=>{const{user}=useUser();const[active,setActive]=useState('All');const[conversationRecord,setConversationRecord]=useState(null);const[presence,setPresence]=useState({});const[noticeRecord,setNoticeRecord]=useState(null);const[callRecord,setCallRecord]=useState(null);const[loading,setLoading]=useState(true);
const conversations=conversationRecord?.ownerUid===user.uid ? conversationRecord.items : [];
const notices=noticeRecord?.ownerUid===user.uid ? noticeRecord.items : [];
const setConversations=items=>setConversationRecord({ownerUid:user.uid,items});
const setNotices=items=>setNoticeRecord({ownerUid:user.uid,items});
const calls = callRecord?.ownerUid===user.uid ? callRecord.items : [];
const setCalls = value=>setCallRecord(current=>({ownerUid:user.uid,items:typeof value==='function'?value(current?.ownerUid===user.uid?current.items:[]):value}));
const [callsLoading,setCallsLoading]=useState(true);
const [callsError,setCallsError]=useState('');
const [callsLoadMoreError,setCallsLoadMoreError]=useState('');
const [callsVersion,setCallsVersion]=useState(0);
const [callsCursor,setCallsCursor]=useState(null);
const [callsHasMore,setCallsHasMore]=useState(false);
const [callsLoadingMore,setCallsLoadingMore]=useState(false);
const tabs = isApprovedHost(user) ? TABS.filter((tab) => tab !== 'Calls') : TABS;
// Consume the Activity shortcut so it works again after selecting another filter.
useEffect(() => {
  if (route.params?.view === 'Calls') {
    setActive('Calls');
    navigation.setParams({ view: undefined });
  }
}, [route.params?.view, navigation]);
useEffect(()=>{let alive=true;setConversations([]);setPresence({});setLoading(true);
const stop=messagingService.subscribeInbox(async(items)=>{if(!alive)return;setConversations(items);const others=items.map(item=>item.participantIds.find(id=>id!==user.uid)).filter(Boolean);const states=await Promise.all(others.map(async uid=>[uid,await presenceService.get(uid).catch(()=>null)]));if(alive){setPresence(Object.fromEntries(states));setLoading(false);}},()=>{if(alive)setLoading(false);});
return ()=>{alive=false;stop();};},[user.uid]);
useEffect(()=>{let alive=true;setNotices([]);const stop=noticeService.subscribe(items=>{if(alive)setNotices(items);},()=>{});return ()=>{alive=false;stop();};},[user.uid]);
useEffect(()=>{let alive=true;setCalls([]);setCallsCursor(null);setCallsHasMore(false);setCallsLoading(true);setCallsError('');setCallsLoadMoreError('');
callHistoryService.listPage().then(async page=>{
const normalized=normalizeCallHistoryRecords(page.records,user.uid);
const identities=await publicIdentityService.calls(normalized.map(item=>item.callId));
const byCall=new Map(identities.map(item=>[item.callId,item]));
const rows=normalized.map(item=>{const result=byCall.get(item.callId);return {...item,profile:result?.identity,canInteract:result?.canInteract===true};});
if(alive){setCalls(rows);setCallsCursor(page.cursor);setCallsHasMore(page.hasMore);}
}).catch(()=>{if(alive)setCallsError("Couldn't load call history.");}).finally(()=>{if(alive)setCallsLoading(false);});
return ()=>{alive=false;};},[user.uid,callsVersion]);
const loadMoreCalls=async()=>{if(!callsHasMore||callsLoadingMore||callsLoading)return;setCallsLoadingMore(true);setCallsLoadMoreError('');try{const page=await callHistoryService.listPage({cursor:callsCursor});const normalized=normalizeCallHistoryRecords(page.records,user.uid),identities=await publicIdentityService.calls(normalized.map(item=>item.callId)),byCall=new Map(identities.map(item=>[item.callId,item]));const next=normalized.map(item=>{const result=byCall.get(item.callId);return{...item,profile:result?.identity,canInteract:result?.canInteract===true};});setCalls(current=>{const byId=new Map(current.map(item=>[item.callId,item]));next.forEach(item=>byId.set(item.callId,item));return[...byId.values()].sort((a,b)=>(b.timestampMs||0)-(a.timestampMs||0)||a.callId.localeCompare(b.callId));});setCallsCursor(page.cursor);setCallsHasMore(page.hasMore);setCallsLoadMoreError('');}catch{setCallsLoadMoreError('Unable to load more call history.');}finally{setCallsLoadingMore(false);}};
const rows=useMemo(()=>active==='Online'?conversations.filter((item)=>presenceService.isOnline(presence[item.participantIds.find((id)=>id!==user.uid)])):active==='Unreplied'?conversations.filter((item)=>isConversationUnreplied(item,user.uid)):conversations,[active,conversations,presence,user.uid]);
const empty={All:'No conversations yet.',Online:'None of your conversations are online right now.',Unreplied:"You're all caught up.",Calls:'No video calls yet.',Notices:'No notices yet.'}[active];
const renderConversation=({item})=>{const otherUid=item.participantIds.find((id)=>id!==user.uid);const other=item.participants?.[otherUid]||{};const online=presenceService.isOnline(presence[otherUid]);const unread=item.unreadCounts?.[user.uid]||0;return <TouchableOpacity style={styles.row} onPress={()=>navigation.navigate('ChatDetail',{userId:otherUid,name:other.username})}>{other.profilePic?<Image source={{uri:other.profilePic}} style={styles.avatar}/>:<View style={styles.avatar}/>}<View style={styles.rowBody}><View style={styles.nameRow}><Text style={styles.name}>{other.username||'Amira user'}</Text>{online&&<View style={styles.online}/>}<Text style={styles.time}>{relative(item.lastMessageAt)}</Text></View><Text style={[styles.preview,unread&&styles.unreadText]} numberOfLines={1}>{item.lastMessage?.text||'Start a conversation'}</Text></View>{unread>0&&<View style={styles.badge}><Text style={styles.badgeText}>{unread>99?'99+':unread}</Text></View>}</TouchableOpacity>;};
const data=active==='Notices'?notices:active==='Calls'?calls:rows;
const renderCall=({item})=><TouchableOpacity disabled={!item.canInteract} style={styles.row} onPress={()=>navigation.navigate('ChatDetail',{userId:item.counterpartUid,name:item.profile?.username})}><Phone color={COLORS.primary}/><View style={styles.rowBody}><Text style={styles.name}>{item.profile?.username||'Amira user'}</Text><Text style={styles.preview}>{[item.label,item.duration,formatCallHistoryTime(item.timestamp)].filter(Boolean).join(' · ')}</Text></View></TouchableOpacity>;
const callsFooter=active==='Calls'?(callsLoadingMore?<ActivityIndicator color={COLORS.primary}/>:callsLoadMoreError?<View style={styles.paginationError}><Text style={styles.emptyText}>{callsLoadMoreError}</Text><TouchableOpacity onPress={loadMoreCalls}><Text>Retry older calls</Text></TouchableOpacity></View>:null):null;
return <View style={styles.container}><View style={styles.header}><Text style={styles.title}>Messages</Text><Text style={styles.subtitle}>Conversations and Amira updates</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>{tabs.map((tab)=><TouchableOpacity key={tab} style={[styles.tab,active===tab&&styles.active]} onPress={()=>setActive(tab)}><Text style={[styles.tabText,active===tab&&styles.activeText]}>{tab.toUpperCase()}</Text></TouchableOpacity>)}</ScrollView>{(active==='Calls'?callsLoading:loading&&active!=='Notices')?<ActivityIndicator style={{marginTop:80}} color={COLORS.primary}/>:<FlatList data={data} keyExtractor={(item)=>item.id||item.uid} contentContainerStyle={styles.list} onEndReached={active==='Calls'?loadMoreCalls:undefined} onEndReachedThreshold={0.4} refreshing={active==='Calls'?callsLoading:false} onRefresh={active==='Calls'?()=>setCallsVersion(n=>n+1):undefined} renderItem={active==='Notices'?({item})=><TouchableOpacity style={styles.notice} onPress={()=>noticeService.markRead(item.id)}><Bell color={item.isRead?COLORS.textSecondary:COLORS.primary}/><View style={styles.rowBody}><Text style={styles.name}>{item.title}</Text><Text style={styles.preview}>{item.body}</Text></View></TouchableOpacity>:active==='Calls'?renderCall:renderConversation} ListFooterComponent={callsFooter} ListEmptyComponent={<View style={styles.empty}>{active==='Notices'?<Bell color={COLORS.primary} size={40}/>:<MessageCircle color={COLORS.primary} size={40}/>}<Text style={styles.emptyText}>{active==='Calls'&&callsError?callsError:empty}</Text>{active==='Calls'&&callsError&&<TouchableOpacity onPress={()=>setCallsVersion(n=>n+1)}><Text>Retry</Text></TouchableOpacity>}</View>}/>}</View>};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F7F7F9'},header:{backgroundColor:'white',paddingTop:56,paddingHorizontal:18,paddingBottom:13},title:{fontSize:29,fontWeight:'900',color:COLORS.text},subtitle:{color:COLORS.textSecondary,marginTop:2},tabs:{backgroundColor:'white',maxHeight:50,paddingHorizontal:9},tab:{paddingHorizontal:13,paddingVertical:14},active:{borderBottomWidth:3,borderBottomColor:COLORS.primary},tabText:{fontSize:10,fontWeight:'900',color:COLORS.textSecondary},activeText:{color:COLORS.primary},list:{padding:12,flexGrow:1},row:{backgroundColor:'white',borderRadius:17,padding:12,marginBottom:8,flexDirection:'row',alignItems:'center',gap:11},avatar:{width:54,height:54,borderRadius:27,backgroundColor:'#DDD'},rowBody:{flex:1},nameRow:{flexDirection:'row',alignItems:'center'},name:{fontSize:16,fontWeight:'900',color:COLORS.text},online:{width:8,height:8,borderRadius:4,backgroundColor:'#16A34A',marginLeft:6},time:{marginLeft:'auto',color:COLORS.textSecondary,fontSize:11},preview:{color:COLORS.textSecondary,marginTop:4},unreadText:{color:COLORS.text,fontWeight:'700'},badge:{minWidth:23,height:23,borderRadius:12,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center'},badgeText:{color:'white',fontSize:10,fontWeight:'900'},notice:{backgroundColor:'white',borderRadius:17,padding:15,marginBottom:8,flexDirection:'row',gap:12},empty:{alignItems:'center',marginTop:90},paginationError:{alignItems:'center',paddingVertical:16,gap:8},emptyText:{color:COLORS.textSecondary,marginTop:12}});export default MessageHomeScreen;
