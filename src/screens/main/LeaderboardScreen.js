import React from 'react';
import {View,Text,StyleSheet,TouchableOpacity} from 'react-native';
import {COLORS} from '../../theme/COLORS';
import {ChevronLeft} from 'lucide-react-native';
const LeaderboardScreen=({navigation})=><View style={styles.container}><View style={styles.header}><TouchableOpacity onPress={()=>navigation.goBack()}><ChevronLeft color="white" size={28}/></TouchableOpacity><Text style={styles.title}>Top Gifters</Text><View style={{width:28}}/></View><View style={styles.empty}><Text style={styles.emptyText}>Gift rankings are currently unavailable.</Text></View></View>;
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8F8F8'},header:{backgroundColor:COLORS.primary,paddingTop:60,paddingBottom:20,paddingHorizontal:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{color:'white',fontSize:24,fontWeight:'bold'},empty:{margin:20,padding:24,backgroundColor:'white',borderRadius:16},emptyText:{color:'#777',textAlign:'center'}});
export default LeaderboardScreen;
