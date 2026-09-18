import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,ScrollView,StyleSheet,Text,TouchableOpacity,View,useWindowDimensions} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {useUser} from '../../context/UserContext';
import {isConsumer} from '../../models/userModel';
import {levelService} from '../../services/levelService';
import {AmiraLevelBadge} from '../../components/AmiraLevelBadge';
import {COLORS} from '../../theme/COLORS';
const {LEVELS}=require('../../../functions/src/levelDomain');
const rewardCopy=(reward)=>[reward.freeMessages&&`${reward.freeMessages} Chat Passes`,reward.freeVideoSeconds&&`${reward.freeVideoSeconds}s Free Video Time`,reward.quickMatchCount&&`${reward.quickMatchCount} Quick Matches`].filter(Boolean).join(' + ');
const MyLevelScreen=({navigation})=>{
 const {user}=useUser(),consumer=isConsumer(user),focused=useIsFocused(),{width}=useWindowDimensions();
 const [state,setState]=useState(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[claiming,setClaiming]=useState(null);
 const strip=useRef(null),pageWidth=Math.max(250,width-36);
 useEffect(()=>{if(!consumer||!focused)return undefined;let active=true;setState(null);setError(false);levelService.getOwn().then(value=>{if(active)setState(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[consumer,user?.uid,focused,retry]);
 useEffect(()=>{if(state)strip.current?.scrollTo({x:state.level*pageWidth,animated:false});},[state?.level,pageWidth]);
 if(!consumer)return null;
 const claim=async(level)=>{if(claiming!==null)return;setClaiming(level);try{await levelService.claim(level);setState(await levelService.getOwn());Alert.alert('Milestone claimed','Your reward has been added.');}catch(_){Alert.alert('Unable to claim milestone','Please try again.');}finally{setClaiming(null);}};
 return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
  <Text style={styles.title}>My Level</Text><Text style={styles.body}>Your Amira Level grows with qualifying Credit purchases.</Text>
  {error?<View style={styles.card}><Text style={styles.body}>Unable to load your Amira Level.</Text><TouchableOpacity onPress={()=>setRetry(value=>value+1)}><Text style={styles.link}>Try again</Text></TouchableOpacity></View>:!state?<ActivityIndicator accessibilityLabel="Loading Amira Level" color={COLORS.primary}/>:<>
   <Text style={styles.heading}>Your Amira Level</Text><AmiraLevelBadge level={state.level}/>
   <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} ref={strip} onContentSizeChange={()=>strip.current?.scrollTo({x:state.level*pageWidth,animated:false})} accessibilityLabel="Amira Levels 0 to 10" contentOffset={{x:state.level*pageWidth,y:0}}>
    {LEVELS.map(level=><View key={level} style={[styles.card,{width:pageWidth},level===state.level&&styles.current]} testID={`level-page-${level}`}>
      <AmiraLevelBadge level={level} large/><Text style={styles.heading}>{level===state.level?'Your current Level':level>state.level?'Locked':'Unlocked'}</Text>
      <Text style={styles.body}>{level===state.level?'This is your current place in Amira.':'Explore the Levels ahead.'}</Text>
      <Text style={styles.heading}>Benefits</Text>
      {state.milestones.filter(item=>item.level===level).length?state.milestones.filter(item=>item.level===level).map(item=><View key={item.level}><Text style={styles.body}>{rewardCopy(item.reward)}</Text>{item.claimed?<Text style={styles.body}>Milestone claimed</Text>:item.eligible&&<TouchableOpacity style={styles.button} disabled={claiming!==null} onPress={()=>claim(item.level)}><Text style={styles.buttonText}>Claim milestone</Text></TouchableOpacity>}</View>):<Text style={styles.body}>Level benefits and milestone rewards are being prepared.</Text>}
    </View>)}
   </ScrollView>
   {!state.thresholdsConfigured&&<Text style={styles.body}>Level progression details are being prepared. Your current Credits do not determine your Amira Level.</Text>}
   <Text style={styles.body}>Spending Credits or taking a break does not lower your Level.</Text>
   <TouchableOpacity style={styles.button} onPress={()=>navigation.navigate('RechargeHub')}><Text style={styles.buttonText}>Recharge</Text></TouchableOpacity>
  </>}
 </ScrollView>;
};
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F7F7F9'},content:{padding:18,paddingBottom:40},title:{fontSize:26,fontWeight:'900',color:COLORS.text},heading:{fontSize:18,fontWeight:'800',color:COLORS.text,marginVertical:12},body:{color:COLORS.textSecondary,lineHeight:22,marginVertical:10},card:{backgroundColor:'white',borderRadius:22,padding:22,marginVertical:18,borderWidth:2,borderColor:'transparent'},current:{borderColor:'#2563EB'},button:{backgroundColor:COLORS.primary,minHeight:48,borderRadius:24,alignItems:'center',justifyContent:'center',marginTop:18},buttonText:{color:'white',fontWeight:'800'},link:{color:COLORS.primary,fontWeight:'800'}});
export default MyLevelScreen;
