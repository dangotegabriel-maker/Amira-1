import React,{useCallback,useEffect,useState} from 'react';
import {Alert,Text,TouchableOpacity,View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {amiraIdentityService} from '../services/amiraIdentityService';
const {validAmiraId}=require('../../functions/src/amiraIdDomain');
export const AmiraIdentity=({own=false,uid,amiraId})=>{
 const focused=useIsFocused(),[id,setId]=useState(null),[loading,setLoading]=useState(own),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!own||!focused||!uid)return undefined;let active=true;setId(null);setLoading(true);amiraIdentityService.ensure().then(result=>{if(active)setId({uid,amiraId:validAmiraId(result.amiraId)?result.amiraId:null});}).catch(error=>{console.warn('Account identity unavailable.',error.code||'unknown');if(active)setId(null);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[own,uid,focused,retry]);
 const visible=own?(id?.uid===uid?id.amiraId:null):validAmiraId(amiraId)?amiraId:null;
 const copy=useCallback(async()=>{if(!validAmiraId(visible))return;try{const copied=await Clipboard.setStringAsync(visible);if(copied===false)throw new Error('Copy unavailable.');Alert.alert('Copied','Amira ID copied.');}catch(error){Alert.alert('Copy failed','Please try again.');}},[visible]);
 if(!own&&!visible)return null;
 return <View style={{padding:14,alignItems:'center'}}><Text>Amira ID</Text><Text>{loading&&own?'Loading...':visible||'Unavailable'}</Text>{visible?<TouchableOpacity accessibilityLabel="Copy Amira ID" onPress={copy}><Text>Copy</Text></TouchableOpacity>:own&&!loading?<TouchableOpacity onPress={()=>setRetry(value=>value+1)}><Text>Retry identity</Text></TouchableOpacity>:null}</View>;
};
