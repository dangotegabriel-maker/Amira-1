import {AmiraIdentity} from '../../components/AmiraIdentity';
import { AmiraLevelBadge } from '../../components/AmiraLevelBadge';
import { levelService } from '../../services/levelService';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, Modal, View } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ChevronLeft, MessageCircle, ShieldAlert, UserMinus, UserPlus, Video } from 'lucide-react-native';
import {hostProfileService} from '../../services/hostProfileService';
const {controlledInterests}=require('../../../functions/src/hostDiscoveryDomain');
import { callReviewService } from '../../services/callReviewService';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import {hostActivityService} from '../../services/hostActivityService';
import { canFollowProfile, followService } from '../../services/followService';
import { blockService } from '../../services/blockService';
import { reportService } from '../../services/reportService';
import { profileViewService } from '../../services/profileViewService';
import { getCountryByCode } from '../../data/countries';
import { isApprovedHost, isConsumer } from '../../models/userModel';
import ReportUserModal from '../../components/ReportUserModal';
import { startVideoCall } from '../../services/callNavigationService';
import GiftTray from '../../components/GiftTray';
import {giftService} from '../../services/giftService';

const IntroVideo = ({ uri }) => {
  const player = useVideoPlayer(uri, (instance) => { instance.loop = true; });
  return <VideoView style={styles.video} player={player} nativeControls contentFit="cover" />;
};

const UserProfileScreen = ({ route, navigation }) => {
  const { user } = useUser();
  const insets=useSafeAreaInsets();
  const [showMore,setShowMore]=useState(false),[heroFailed,setHeroFailed]=useState(false);
  const focused = useIsFocused();
  const [relationshipLabel, setRelationshipLabel] = useState('Follow');
  const userId = route.params?.userId;
  const [reputation, setReputation] = useState(null);
  useEffect(() => {
    if (!userId || route.params?.demoHost) return undefined;
    return callReviewService.subscribeReputation(userId, setReputation, () => setReputation(null));
  }, [userId, route.params?.demoHost]);
  const [host, setHost] = useState(null);
  const [liked,setLiked]=useState(false),[likeBusy,setLikeBusy]=useState(false),[social,setSocial]=useState(null),[socialError,setSocialError]=useState(false);
  const [consumerLevel, setConsumerLevel] = useState(null);
  useEffect(() => {
    setConsumerLevel(null);
    if (!focused || !isApprovedHost(user) || !isConsumer(host) || host?.isDemo) return undefined;
    let active = true;
    levelService.getConsumer(userId).then(value => { if (active) setConsumerLevel(value.level); }).catch(() => {});
    return () => { active = false; };
  }, [focused, user?.uid, user?.hostStatus?.isApproved, host?.uid, host?.hostStatus?.isApproved, userId]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [giftOpen,setGiftOpen]=useState(false),[publicGifts,setPublicGifts]=useState([]);
  const [blockState, setBlockState] = useState({ blockedByMe: false, blocked: false });

  useEffect(() => {
    if(!userId){setLoading(false);return undefined;}
    if(!focused)return undefined;
    let active=true;setLoading(true);setHost(null);setSocial(null);setSocialError(false);setHeroFailed(false);
    const read=isConsumer(user)?hostProfileService.get(userId):hostActivityService.getConsumer(userId);
    Promise.resolve(read).then(async profile=>{if(!active)return;setHost(profile);if(profile.social){setSocial(profile.social);setLiked(profile.social.liked);setFollowing(profile.social.following);}else {const value=await followService.isFollowing(userId);if(active)setFollowing(value);}})
    .catch(()=>{if(active)setHost(null);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[userId,focused,user?.uid,user?.hostStatus?.isApproved]);
  const refreshSocial=async()=>{try{const profile=await hostProfileService.get(userId);setSocial(profile.social);setLiked(profile.social.liked);setSocialError(false);}catch(e){setSocialError(true);}};
  const toggleLike=async()=>{if(likeBusy||blockState.blocked||!isConsumer(user)||!isApprovedHost(host))return;setLikeBusy(true);try{const value=await hostProfileService.setLiked(userId,!liked);setLiked(value.liked);await refreshSocial();}catch(e){Alert.alert('Unable to update Like',e.message);}finally{setLikeBusy(false);}};
  const hideHost=async()=>{try{await hostProfileService.hide(userId);navigation.goBack();}catch(e){Alert.alert('Unable to update discovery',e.message);}};
  const more=()=>setShowMore(true);

  useEffect(()=>{
    if(!focused||loading||!host||host.uid!==userId||host.isDemo||blockState.blocked||user?.uid===userId)return undefined;
    if(!((isConsumer(user)&&isApprovedHost(host))||(isApprovedHost(user)&&isConsumer(host))))return undefined;
    profileViewService.track(userId).catch(()=>console.warn('Profile view could not be recorded.'));
  },[focused,loading,host?.uid,userId,user?.uid,user?.hostStatus?.isApproved,host?.hostStatus?.isApproved,blockState.blocked]);


  useEffect(() => {
    if (!focused || route.params?.demoHost) return undefined;
    return followService.subscribeRelationship(userId, (value) => {
      setFollowing(value.following); setRelationshipLabel(value.label); setBlockState(value);
    }, () => setRelationshipLabel('Follow'));
  }, [userId, focused, route.params?.demoHost]);

  const toggleFollow = async () => {
    if (!canFollowProfile(user, host) || blockState.blocked || followBusy) return;
    if (host?.isDemo) return;
    setFollowBusy(true);
    try { setFollowing(following ? await followService.unfollow(userId) : await followService.follow(userId)); if(isConsumer(user)&&isApprovedHost(host))await refreshSocial(); }
    catch (error) { Alert.alert('Unable to update follow', error.message); }
    finally { setFollowBusy(false); }
  };

  const block = () => blockState.blockedByMe ? Alert.alert('Unblock user', `Allow ${host?.username} to interact with you again?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Unblock', onPress: async () => { try{await blockService.unblock(userId); setBlockState({ blockedByMe: false, blocked: false });}catch(e){Alert.alert('Unable to unblock',e.message);} } },
  ]) : Alert.alert('Block user', `Block ${host?.username}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Block', style: 'destructive', onPress: async () => { try{await blockService.block(userId); setBlockState({ blockedByMe: true, blocked: true });setFollowing(false);setLiked(false);setRelationshipLabel('Follow');setSocial(null);}catch(e){Alert.alert('Unable to block',e.message);} } },
  ]);

  useEffect(()=>{if(!focused||!userId||!isApprovedHost(host))return;let active=true;giftService.publicHostGifts(userId).then(value=>{if(active)setPublicGifts(value.gifts||[]);}).catch(()=>{if(active)setPublicGifts([]);});return()=>{active=false;};},[focused,userId,host?.uid,host?.hostStatus?.isApproved]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!host) return <View style={styles.center}><ShieldAlert color={COLORS.primary} size={42} /><Text style={styles.unavailable}>This profile is unavailable.</Text><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>Go back</Text></TouchableOpacity></View>;

  const approvedHost = isApprovedHost(host);
  const country = getCountryByCode(host.countryCode);
  const gallery = host.hostProfile?.gallery || [];
  const interests=controlledInterests(host.hostProfile?.interests||host.interests);
  const rate=Number.isSafeInteger(host.hostProfile?.videoRateCredits)&&host.hostProfile.videoRateCredits>0?host.hostProfile.videoRateCredits:null;
  const available=!blockState.blocked&&host.hostStatus?.availability==='online'&&rate!==null;
  const message=()=>navigation.navigate('ChatDetail',{userId,name:host.username});
  return <View style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {host.profilePic && !heroFailed ? <Image onError={()=>setHeroFailed(true)} source={{ uri: host.profilePic }} style={styles.heroImage} /> : <View style={[styles.heroImage, styles.placeholder]}><Text style={styles.letter}>{host.username?.[0]}</Text></View>}
        <View style={styles.scrim} />
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><ChevronLeft color="white" size={30} /></TouchableOpacity><TouchableOpacity accessibilityLabel="More" onPress={more} style={{position:'absolute',right:16,top:55,backgroundColor:'rgba(0,0,0,.6)',padding:12,borderRadius:18}}><Text style={{color:'white',fontWeight:'800'}}>More</Text></TouchableOpacity>
        {host.hasActiveStory && <TouchableOpacity style={styles.storyRing} onPress={() => navigation.navigate('StoryViewer', { stories: host.stories || [], userName: host.username })}><Image source={{ uri: host.storyThumbnail || host.profilePic }} style={styles.storyAvatar} /></TouchableOpacity>}
        <View style={styles.heroInfo}><View style={styles.nameRow}><Text style={styles.name}>{host.username}</Text>{!approvedHost&&host.vipActive===true&&<Text style={styles.vipBadge}>VIP</Text>}</View><Text style={styles.meta}>{host.age} · {country?.flag || ''} {host.countryName || country?.name}</Text>{approvedHost && <Text style={styles.availability}>{host.hostStatus?.availability || 'offline'}</Text>}</View>
      </View>

      <AmiraIdentity uid={host.uid} amiraId={host.amiraId}/>
      {consumerLevel !== null && isApprovedHost(user) && isConsumer(host) && <View style={{padding:14}}><AmiraLevelBadge level={consumerLevel}/></View>}
      {approvedHost && <Text style={{ padding: 14, color: COLORS.textSecondary }}>{reputation?reputation.reviewCount>0?`${reputation.averageRating.toFixed(1)} / 5 - ${reputation.reviewCount} call reviews`:'No call reviews yet':'Call reviews unavailable'}</Text>}
      <View style={styles.actions}>
        {canFollowProfile(user, host) && !blockState.blocked && <TouchableOpacity style={[styles.action, following && styles.following]} onPress={toggleFollow} disabled={followBusy}>{following ? <UserMinus color={COLORS.primary} /> : <UserPlus color="white" />}<Text style={[styles.actionText, following && { color: COLORS.primary }]}>{host.isDemo ? (following ? 'Following' : 'Follow') : relationshipLabel}</Text></TouchableOpacity>}
        {!approvedHost&&<TouchableOpacity disabled={blockState.blocked} style={styles.smallAction} onPress={message}><MessageCircle color={COLORS.primary}/><Text style={styles.smallText}>Message</Text></TouchableOpacity>}
      </View>

      {approvedHost&&<View style={styles.section}><Text style={styles.rate}>{rate===null?'Video rate unavailable':`${rate} Credits/min`}</Text><View style={{flexDirection:'row',justifyContent:'space-around',marginTop:15}}>{[['Followers','followers'],['Following','followingCount'],['Likes','likes']].map(([label,key])=><View key={key} style={{alignItems:'center'}}><Text>{socialError||!social?'Unavailable':social[key]}</Text><Text>{label}</Text></View>)}</View></View>}
      {(host.hostProfile?.bio||host.bio)&&<View style={styles.section}><Text style={styles.sectionTitle}>About</Text><Text style={styles.bio}>{host.hostProfile?.bio||host.bio}</Text></View>}
      {interests.length>0&&<View style={styles.section}><Text style={styles.sectionTitle}>Interests</Text><View style={styles.tags}>{interests.map(tag=><Text key={tag} style={styles.tag}>{tag}</Text>)}</View></View>}
      {gallery.length > 0 && <View style={styles.section}><Text style={styles.sectionTitle}>Gallery</Text><FlatList horizontal data={gallery} keyExtractor={(item, index) => `${item}-${index}`} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <Image source={{ uri: typeof item === 'string' ? item : item.url }} style={styles.galleryImage} />} /></View>}
      {approvedHost && host.hostProfile?.introVideoUrl ? <View style={styles.section}><Text style={styles.sectionTitle}>Introduction</Text><IntroVideo uri={host.hostProfile.introVideoUrl} /></View> : null}
      {approvedHost&&host.moments?.length>0&&<View style={styles.section}><Text style={styles.sectionTitle}>Moments</Text>{host.moments.map(item=>item.type==='video'?<IntroVideo key={item.id} uri={item.uri}/>:<Image key={item.id} source={{uri:item.uri}} style={styles.galleryImage}/>)}</View>}
      {approvedHost&&publicGifts.length>0&&<View style={styles.section}><Text style={styles.sectionTitle}>Gifts</Text><View style={styles.tags}>{publicGifts.map(gift=><Text key={gift.giftId} style={styles.tag}>{gift.name} × {gift.count}</Text>)}</View></View>}
    </ScrollView>
    {approvedHost&&isConsumer(user)&&<View style={{backgroundColor:'white',paddingBottom:Math.max(12,insets.bottom)}}><View style={{flexDirection:'row',gap:6,padding:12}}>
    <TouchableOpacity disabled={likeBusy||blockState.blocked} accessibilityLabel={liked?'Unlike Host':'Like Host'} style={styles.smallAction} onPress={toggleLike}><Text style={styles.smallText}>{liked?'Liked':'Like'}</Text></TouchableOpacity>
    <TouchableOpacity disabled={blockState.blocked} style={styles.smallAction} onPress={message}><MessageCircle color={COLORS.primary}/><Text style={styles.smallText}>Message</Text></TouchableOpacity>
    <TouchableOpacity disabled={!available} style={styles.smallAction} onPress={()=>startVideoCall({navigation,creator:host})}><Video color={available?COLORS.primary:COLORS.textSecondary}/><Text style={styles.smallText}>{rate===null?'Video unavailable':`Video ${rate}/min`}</Text></TouchableOpacity>
    <TouchableOpacity disabled={blockState.blocked} style={styles.smallAction} onPress={()=>setGiftOpen(true)}><Text style={styles.smallText}>Gift</Text></TouchableOpacity>
    </View></View>}
    <Modal visible={showMore} transparent animationType="fade" onRequestClose={()=>setShowMore(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.35)'}}><View style={{backgroundColor:'white',padding:20,paddingBottom:Math.max(20,insets.bottom),borderTopLeftRadius:20,borderTopRightRadius:20}}>
    <TouchableOpacity style={styles.safetyAction} onPress={()=>{setShowMore(false);setShowReport(true);}}><Text style={styles.safetyText}>Report</Text></TouchableOpacity>
    <TouchableOpacity style={styles.safetyAction} onPress={()=>{setShowMore(false);block();}}><Text style={styles.safetyText}>{blockState.blockedByMe?'Unblock':'Block'}</Text></TouchableOpacity>
    {approvedHost&&isConsumer(user)&&<TouchableOpacity style={styles.safetyAction} onPress={()=>{setShowMore(false);hideHost();}}><Text style={styles.safetyText}>Not Interested</Text></TouchableOpacity>}
    <TouchableOpacity style={styles.safetyAction} onPress={()=>setShowMore(false)}><Text style={styles.safetyText}>Cancel</Text></TouchableOpacity>
    </View></View></Modal>
    <GiftTray visible={giftOpen} onClose={()=>setGiftOpen(false)} hostUid={userId} source="host_profile"/>
    <ReportUserModal visible={showReport} onClose={() => setShowReport(false)} userName={host.username} onReport={async (reason, info) => { await reportService.submit({ reportedUserId:userId, contextType:'profile', contextId:userId, reason, details:info }); Alert.alert('Report received', 'Thank you.'); }} />
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' }, content: { paddingBottom: 60 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#F7F7F9' }, unavailable: { color: COLORS.text, fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 15 }, backText: { color: COLORS.primary, fontWeight: '900', marginTop: 14 },
  hero: { height: 410, backgroundColor: '#DDD' }, heroImage: { width: '100%', height: '100%' }, placeholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E9D5FF' }, letter: { color: '#7C3AED', fontSize: 70, fontWeight: '900' }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' }, back: { position: 'absolute', top: 50, left: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }, storyRing:{position:'absolute',top:50,right:15,width:54,height:54,borderRadius:27,borderWidth:3,borderColor:COLORS.primary,padding:3},storyAvatar:{width:'100%',height:'100%',borderRadius:23}, heroInfo: { position: 'absolute', left: 18, right: 18, bottom: 20 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, name: { color: 'white', fontSize: 30, fontWeight: '900' }, vipBadge:{color:'#111',backgroundColor:'#FDE68A',fontWeight:'900',paddingHorizontal:8,paddingVertical:3,borderRadius:10}, meta: { color: 'white', marginTop: 5, fontSize: 16 }, availability: { color: '#86EFAC', fontWeight: '900', textTransform: 'capitalize', marginTop: 5 },
  actions: { flexDirection: 'row', gap: 9, padding: 14 }, action: { flex: 1.4, minHeight: 58, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, following: { backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.primary }, actionText: { color: 'white', fontWeight: '900' }, smallAction: { flex: 1, minHeight: 58, backgroundColor: 'white', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, smallText: { color: COLORS.text, fontSize: 11, fontWeight: '800', marginTop: 2 },
  section: { backgroundColor: 'white', marginHorizontal: 14, marginBottom: 12, borderRadius: 20, padding: 18 }, sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginBottom: 10 }, bio: { color: COLORS.textSecondary, lineHeight: 21 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }, tag: { color: COLORS.primary, backgroundColor: '#FFF1F4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, fontWeight: '700' }, rate: { color: COLORS.text, fontWeight: '800', marginTop: 15 }, galleryImage: { width: 130, height: 165, borderRadius: 14, marginRight: 9 }, video: { height: 240, borderRadius: 15, overflow: 'hidden' }, safety: { flexDirection: 'row', marginHorizontal: 14, gap: 10 }, safetyAction: { flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: 'white', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, safetyText: { color: COLORS.textSecondary, fontWeight: '800' },
});
export default UserProfileScreen;
