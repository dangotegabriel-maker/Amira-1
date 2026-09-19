import React from 'react';
import {View,Text,StyleSheet} from 'react-native';
const GiftingLeaderboard=()=> <View style={styles.container}><Text style={styles.title}>Top Gifters</Text><Text style={styles.empty}>Gift rankings are currently unavailable.</Text></View>;
const styles=StyleSheet.create({container:{backgroundColor:'white',borderRadius:20,padding:15,marginTop:10},title:{fontSize:18,fontWeight:'bold'},empty:{color:'#777',marginTop:12}});
export default GiftingLeaderboard;
