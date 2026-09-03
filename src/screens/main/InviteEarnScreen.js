import React from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Share2, Users } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { COLORS } from '../../theme/COLORS';

const InviteEarnScreen = () => {
  const { user } = useUser();
  const code = user?.referralCode || `AMIRA-${String(user?.uid || '').slice(0, 8).toUpperCase()}`;
  const link = `https://amira.app/invite/${encodeURIComponent(code)}`;
  const message = `Join me on Amira. Use my invitation code ${code}: ${link}`;
  const copy = async () => { await Clipboard.setStringAsync(code); Alert.alert('Copied', 'Your referral code was copied.'); };
  return <View style={styles.container}><View style={styles.hero}><Users color="white" size={42}/><Text style={styles.title}>Invite friends to Amira</Text><Text style={styles.body}>Share Amira with people you know. Rewards will be credited when eligible referrals qualify.</Text></View><View style={styles.card}><Text style={styles.label}>YOUR REFERRAL CODE</Text><Text style={styles.code}>{code}</Text><TouchableOpacity style={styles.secondary} onPress={copy}><Copy color={COLORS.primary}/><Text style={styles.secondaryText}>Copy Code</Text></TouchableOpacity><TouchableOpacity style={styles.primary} onPress={()=>Share.share({message})}><Share2 color="white"/><Text style={styles.primaryText}>Invite Friends</Text></TouchableOpacity></View><Text style={styles.note}>Referral qualification and rewards are verified securely. No reward is added merely by sharing a link.</Text></View>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F7F7F9',padding:18},hero:{backgroundColor:COLORS.primary,borderRadius:24,padding:24,marginTop:12},title:{color:'white',fontSize:26,fontWeight:'900',marginTop:16},body:{color:'white',opacity:.9,lineHeight:21,marginTop:9},card:{backgroundColor:'white',borderRadius:22,padding:22,marginTop:18},label:{color:COLORS.textSecondary,fontSize:11,fontWeight:'900',letterSpacing:1},code:{fontSize:25,fontWeight:'900',color:COLORS.text,marginVertical:18},primary:{minHeight:52,borderRadius:26,backgroundColor:COLORS.primary,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,marginTop:10},primaryText:{color:'white',fontWeight:'900'},secondary:{minHeight:52,borderRadius:26,borderWidth:1,borderColor:'#E5E5EA',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9},secondaryText:{color:COLORS.primary,fontWeight:'900'},note:{color:COLORS.textSecondary,lineHeight:20,textAlign:'center',margin:20}});export default InviteEarnScreen;
