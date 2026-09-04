import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../theme/COLORS';
import { callService } from '../services/callService';
import { dbService } from '../services/firebaseService';

const IncomingCallCard = ({ call, navigation, onDismiss }) => {
  const [caller, setCaller] = useState(null);
  useEffect(() => { dbService.getUserProfile(call.callerId).then(setCaller).catch(()=>{}); }, [call.callerId]);
  const decline = async () => { await callService.respond({callId:call.callId||call.id,action:'decline'}); onDismiss?.(); };
  const accept = async () => {
    const accepted = await callService.respond({callId:call.callId||call.id,action:'accept'});
    navigation.navigate('VideoCall', { call:{...call,...accepted}, creator:caller }); onDismiss?.();
  };
  return <View style={styles.overlay}><View style={styles.card}>{caller?.profilePic&&<Image source={{uri:caller.profilePic}} style={styles.avatar}/>}<Text style={styles.label}>Incoming video call</Text><Text style={styles.name}>{caller?.username || 'Amira member'}</Text>{caller?.countryName&&<Text style={styles.country}>{caller.countryName}</Text>}<View style={styles.actions}><TouchableOpacity style={styles.decline} onPress={decline}><Text style={styles.white}>Decline</Text></TouchableOpacity><TouchableOpacity style={styles.accept} onPress={accept}><Text style={styles.white}>Accept</Text></TouchableOpacity></View></View></View>;
};
const styles=StyleSheet.create({overlay:{...StyleSheet.absoluteFillObject,zIndex:20,backgroundColor:'rgba(0,0,0,.55)',alignItems:'center',justifyContent:'center'},card:{width:'88%',backgroundColor:'white',borderRadius:24,padding:24,alignItems:'center'},avatar:{width:88,height:88,borderRadius:44,marginBottom:14},label:{color:COLORS.primary,fontWeight:'900'},name:{fontSize:25,fontWeight:'900',color:COLORS.text,marginTop:5},country:{color:COLORS.textSecondary,marginTop:3},actions:{flexDirection:'row',gap:12,marginTop:22},decline:{backgroundColor:'#DC2626',borderRadius:22,paddingVertical:13,paddingHorizontal:28},accept:{backgroundColor:'#16A34A',borderRadius:22,paddingVertical:13,paddingHorizontal:30},white:{color:'white',fontWeight:'900'}});
export default IncomingCallCard;
