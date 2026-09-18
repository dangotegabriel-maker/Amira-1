import React,{useCallback,useRef,useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {ActivityIndicator,StyleSheet,Text,TouchableOpacity,View} from 'react-native';
import {Eye,Lock} from 'lucide-react-native';
import {useUser} from '../../context/UserContext';
import {isConsumer} from '../../models/userModel';
import {profileViewService} from '../../services/profileViewService';
import {COLORS} from '../../theme/COLORS';
const WhoViewedMeScreen=()=>{
 const {user}=useUser(),consumer=isConsumer(user),version=useRef(0);
 const [count,setCount]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const load=useCallback(async()=>{if(!consumer||!user?.uid)return;const request=++version.current;setLoading(true);setError(false);try{const value=await profileViewService.getAggregateCount(user.uid);if(request===version.current)setCount(value);}catch(e){if(request===version.current){setCount(null);setError(true);}}finally{if(request===version.current)setLoading(false);}},[consumer,user?.uid]);
 useFocusEffect(useCallback(()=>{load();return()=>{version.current++;};},[load]));
 if(!consumer)return null;
 return <View style={styles.center}>{loading?<ActivityIndicator color={COLORS.primary}/>:error?<><Text style={styles.body}>Profile views could not be loaded.</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>Try Again</Text></TouchableOpacity></>:count===0?<><Eye color={COLORS.primary} size={44}/><Text style={styles.title}>No profile views yet.</Text></>:<><Lock color={COLORS.primary} size={44}/><Text style={styles.title}>{count} recent profile viewer{count===1?'':'s'}</Text><Text style={styles.body}>Viewer identities are coming later.</Text></>}</View>;
};
const styles=StyleSheet.create({center:{flex:1,backgroundColor:'#F7F7F9',alignItems:'center',justifyContent:'center',padding:28},title:{fontSize:22,fontWeight:'900',color:COLORS.text,textAlign:'center',marginTop:16},body:{color:COLORS.textSecondary,textAlign:'center',marginTop:12},retry:{color:COLORS.primary,fontWeight:'800',marginTop:18}});
export default WhoViewedMeScreen;
