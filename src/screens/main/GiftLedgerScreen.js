import React from 'react';
import {View,Text,StyleSheet,TouchableOpacity} from 'react-native';
import {COLORS} from '../../theme/COLORS';
import {ChevronLeft,Gift} from 'lucide-react-native';
const GiftLedgerScreen=({route,navigation})=>{const type=route.params.type;return <View style={styles.container}><View style={styles.header}><TouchableOpacity onPress={()=>navigation.goBack()}><ChevronLeft color={COLORS.text} size={28}/></TouchableOpacity><Text style={styles.title}>{type==='sent'?'Gifts Sent':'Gifts Received'}</Text><View style={{width:28}}/></View><View style={styles.empty}><Gift color="#CCC" size={64}/><Text style={styles.emptyText}>Authoritative Gift history is not available here yet.</Text></View></View>;};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8F8F8'},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:15,paddingTop:50,paddingBottom:15,backgroundColor:'white',borderBottomWidth:1,borderBottomColor:'#EEE'},title:{fontSize:18,fontWeight:'bold'},empty:{alignItems:'center',marginTop:100,paddingHorizontal:30},emptyText:{color:'#999',marginTop:15,fontSize:16,textAlign:'center'}});
export default GiftLedgerScreen;
