import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Eye, Lock } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { profileViewService } from '../../services/profileViewService';
import { dbService } from '../../services/firebaseService';
import { canSeeProfileVisitors } from '../../services/vipService';
import { COLORS } from '../../theme/COLORS';

const WhoViewedMeScreen = ({ navigation }) => {
  const { user } = useUser();
  const [views, setViews] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const reveal = canSeeProfileVisitors(user);
  useEffect(() => {
    const work = reveal
      ? profileViewService.list(user.uid).then(async (items) => { setViews(await Promise.all(items.map(async (item) => ({ ...item, profile: await dbService.getUserProfile(item.viewerUid).catch(() => null) })))); setCount(items.length); })
      : profileViewService.getAggregateCount(user.uid).then(setCount);
    work.finally(() => setLoading(false));
  }, [user.uid, reveal]);
  if (loading) return <ActivityIndicator style={{ marginTop: 100 }} color={COLORS.primary} />;
  if (!count) return <View style={styles.center}><Eye color={COLORS.primary} size={45} /><Text style={styles.title}>No one has viewed your profile yet.</Text></View>;
  if (!reveal) return <View style={styles.center}><Lock color={COLORS.primary} size={48} /><Text style={styles.title}>{count} people viewed you</Text><Text style={styles.body}>You can see how many people viewed your profile. Upgrade to VIP to reveal who viewed you.</Text><TouchableOpacity style={styles.button} onPress={() => navigation.navigate('VipInfo')}><Text style={styles.buttonText}>Explore VIP</Text></TouchableOpacity></View>;
  return <FlatList style={styles.container} contentContainerStyle={{ padding: 14 }} data={views} keyExtractor={(item) => item.viewerUid} renderItem={({ item }) => <View style={styles.row}>{item.profile?.profilePic ? <Image source={{ uri: item.profile.profilePic }} style={styles.avatar} /> : <View style={styles.avatar} />}<View><Text style={styles.name}>{item.profile?.username || 'Amira user'}</Text><Text style={styles.meta}>{item.viewCount || 1} views</Text></View></View>} />;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F7F7F9'},center:{flex:1,backgroundColor:'#F7F7F9',alignItems:'center',justifyContent:'center',padding:30},title:{fontSize:22,fontWeight:'900',color:COLORS.text,textAlign:'center',marginTop:16},body:{color:COLORS.textSecondary,textAlign:'center',lineHeight:21,marginTop:10},button:{backgroundColor:COLORS.primary,paddingHorizontal:24,paddingVertical:14,borderRadius:24,marginTop:20},buttonText:{color:'white',fontWeight:'900'},row:{backgroundColor:'white',borderRadius:17,padding:12,marginBottom:9,flexDirection:'row',alignItems:'center',gap:11},avatar:{width:52,height:52,borderRadius:26,backgroundColor:'#DDD'},name:{fontWeight:'900',fontSize:16,color:COLORS.text},meta:{color:COLORS.textSecondary,marginTop:3}});
export default WhoViewedMeScreen;
