import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
const COLORS=['#64748B','#2563EB','#0891B2','#0D9488','#16A34A','#65A30D','#CA8A04','#EA580C','#DC2626','#9333EA','#4F46E5'];
export const AmiraLevelBadge=({level=0,large=false})=>{
 const safe=Number.isInteger(level)&&level>=0&&level<=10?level:0;
 return <View style={[styles.badge,{borderColor:COLORS[safe]},large&&styles.large]} accessibilityLabel={`Amira Level ${safe}`}><Text style={[styles.text,{color:COLORS[safe]},large&&styles.largeText]}>Level {safe}</Text></View>;
};
const styles=StyleSheet.create({badge:{alignSelf:'flex-start',borderWidth:2,borderRadius:12,paddingHorizontal:10,paddingVertical:5,backgroundColor:'#F8FAFC'},text:{fontSize:12,fontWeight:'800'},large:{borderRadius:22,padding:22},largeText:{fontSize:28}});
