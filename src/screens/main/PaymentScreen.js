import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';

const PaymentScreen=({navigation})=><SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={()=>navigation.goBack()}><ChevronLeft color={COLORS.text} size={28}/></TouchableOpacity><Text style={styles.headerTitle}>Secure Payment</Text><View style={{width:28}}/></View><Text style={styles.message}>Payments are not available in this version.</Text></SafeAreaView>;
const styles=StyleSheet.create({container:{flex:1,backgroundColor:COLORS.white},header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:15,borderBottomWidth:1,borderBottomColor:'#EEE'},headerTitle:{fontSize:18,fontWeight:'bold'},message:{margin:30,textAlign:'center',fontSize:17,color:COLORS.textSecondary}});
export default PaymentScreen;
