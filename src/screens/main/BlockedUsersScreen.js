import React, { useCallback, useState } from 'react';
import {ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View, FlatList} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {blockService} from '../../services/blockService';
import {publicIdentityService} from '../../services/publicIdentityService';
import {useUser} from '../../context/UserContext';
import {COLORS} from '../../theme/COLORS';
const BlockedUsersScreen=()=>{
 const {user}=useUser(); const [userRecord,setUserRecord]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
 const users=userRecord?.ownerUid===user?.uid ? userRecord.items : [];
 const setUsers=items=>setUserRecord(previous=>({ownerUid:user?.uid,items:typeof items==='function'?items(previous?.ownerUid===user?.uid?previous.items:[]):items}));
 useFocusEffect(useCallback(()=>{let active=true;setUsers([]);setLoading(true);setError('');
 publicIdentityService.blocked().then(items=>{if(active)setUsers(items);}).catch(()=>{if(active)setError('Blocked users could not be loaded.');}).finally(()=>{if(active)setLoading(false);});
 return ()=>{active=false;};},[user?.uid,version]));
 if(loading)return <ActivityIndicator style={{marginTop:80}} color={COLORS.primary}/>;
 return <FlatList style={styles.container} contentContainerStyle={styles.content} data={users} keyExtractor={item=>item.uid}
 ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{error||'No blocked users'}</Text>{error?<TouchableOpacity onPress={()=>setVersion(n=>n+1)}><Text>Retry</Text></TouchableOpacity>:<Text style={styles.muted}>People you block will appear here. Showing up to 50 accounts.</Text>}</View>}
 renderItem={({item})=><View style={styles.row}>{item.profilePic?<Image source={{uri:item.profilePic}} style={styles.avatar}/>:<View style={[styles.avatar,styles.placeholder]}/>}<Text style={styles.name}>{item.username||'Identity unavailable'}</Text><TouchableOpacity style={styles.button} onPress={async()=>{try{await blockService.unblock(item.uid);setUsers(current=>current.filter(person=>person.uid!==item.uid));}catch(_){Alert.alert('Unable to unblock','Please retry.');}}}><Text style={styles.buttonText}>Unblock</Text></TouchableOpacity></View>}/>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F7F7F9'},content:{padding:14,flexGrow:1},row:{backgroundColor:'white',borderRadius:17,padding:12,marginBottom:9,flexDirection:'row',alignItems:'center',gap:11},avatar:{width:50,height:50,borderRadius:25},placeholder:{backgroundColor:'#E9D5FF',alignItems:'center',justifyContent:'center'},name:{flex:1,fontSize:16,fontWeight:'800',color:COLORS.text},button:{borderWidth:1,borderColor:COLORS.primary,borderRadius:18,paddingHorizontal:13,paddingVertical:8},buttonText:{color:COLORS.primary,fontWeight:'800'},empty:{alignItems:'center',marginTop:100},emptyTitle:{fontSize:20,fontWeight:'900',color:COLORS.text},muted:{color:COLORS.textSecondary,marginTop:7}});export default BlockedUsersScreen;
