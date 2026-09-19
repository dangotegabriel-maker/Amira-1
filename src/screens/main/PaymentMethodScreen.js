import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';

const PaymentMethodScreen=({navigation})=><SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={()=>navigation.goBack()}><ChevronLeft color={COLORS.text} size={28}/></TouchableOpacity><Text style={styles.headerTitle}>Payment Method</Text><View style={{width:28}}/></View><View style={styles.content}><Text style={styles.title}>Payments are not available yet</Text><Text style={styles.text}>Secure recharge packages and server verification must be configured before a payment can be started.</Text></View></SafeAreaView>;
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8F8F8'},header:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:15,backgroundColor:COLORS.white},headerTitle:{fontSize:18,fontWeight:'bold'},content:{margin:20,padding:24,borderRadius:16,backgroundColor:COLORS.white},title:{fontSize:20,fontWeight:'800',color:COLORS.text},text:{fontSize:15,lineHeight:22,color:COLORS.textSecondary,marginTop:10}});
export default PaymentMethodScreen;
