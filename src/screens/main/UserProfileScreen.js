import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { BadgeCheck, ChevronLeft, Flag, MessageCircle, ShieldAlert, UserMinus, UserPlus, Video } from 'lucide-react-native';
import { COLORS } from '../../theme/COLORS';
import { useUser } from '../../context/UserContext';
import { dbService } from '../../services/firebaseService';
import { followService } from '../../services/followService';
import { moderationService } from '../../services/moderationService';
import { getCountryByCode } from '../../data/countries';
import { isApprovedHost } from '../../models/userModel';
import ReportUserModal from '../../components/ReportUserModal';

const IntroVideo = ({ uri }) => {
  const player = useVideoPlayer(uri, (instance) => { instance.loop = true; });
  return <VideoView style={styles.video} player={player} nativeControls contentFit="cover" />;
};

const UserProfileScreen = ({ route, navigation }) => {
  const { user } = useUser();
  const userId = route.params?.userId;
  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    Promise.all([dbService.getUserProfile(userId), followService.isFollowing(userId)])
      .then(([profile, followState]) => { setHost(isApprovedHost(profile) ? profile : null); setFollowing(followState); })
      .catch(() => setHost(null)).finally(() => setLoading(false));
  }, [userId]);

  const toggleFollow = async () => {
    if (user?.role !== 'consumer' || followBusy) return;
    setFollowBusy(true);
    try { setFollowing(following ? await followService.unfollowHost(userId) : await followService.followHost(userId)); }
    catch (error) { Alert.alert('Unable to update follow', error.message); }
    finally { setFollowBusy(false); }
  };

  const block = () => Alert.alert('Block host', `Block ${host?.username}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Block', style: 'destructive', onPress: async () => { await moderationService.blockUser(user.uid, userId); navigation.goBack(); } },
  ]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!host) return <View style={styles.center}><ShieldAlert color={COLORS.primary} size={42} /><Text style={styles.unavailable}>This approved host profile is unavailable.</Text><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>Go back</Text></TouchableOpacity></View>;

  const country = getCountryByCode(host.countryCode);
  const gallery = host.hostProfile?.gallery || [];
  return <View style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {host.profilePic ? <Image source={{ uri: host.profilePic }} style={styles.heroImage} /> : <View style={[styles.heroImage, styles.placeholder]}><Text style={styles.letter}>{host.username?.[0]}</Text></View>}
        <View style={styles.scrim} />
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><ChevronLeft color="white" size={30} /></TouchableOpacity>
        <View style={styles.heroInfo}><View style={styles.nameRow}><Text style={styles.name}>{host.username}</Text><BadgeCheck color="#60A5FA" size={23} /></View><Text style={styles.meta}>{host.age} · {country?.flag || ''} {host.countryName || country?.name}</Text><Text style={styles.availability}>{host.hostStatus.availability}</Text></View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.action, following && styles.following]} onPress={toggleFollow} disabled={followBusy}>{following ? <UserMinus color={COLORS.primary} /> : <UserPlus color="white" />}<Text style={[styles.actionText, following && { color: COLORS.primary }]}>{following ? 'Following' : 'Follow'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.smallAction} onPress={() => navigation.navigate('ChatDetail', { userId, name: host.username })}><MessageCircle color={COLORS.primary} /><Text style={styles.smallText}>Message</Text></TouchableOpacity>
        <TouchableOpacity style={styles.smallAction} onPress={() => navigation.navigate('VideoCall', { userId, name: host.username, callRate: host.hostProfile?.videoRateCredits, demoOnly: true })}><Video color={COLORS.primary} /><Text style={styles.smallText}>Video</Text></TouchableOpacity>
      </View>

      <View style={styles.section}><Text style={styles.sectionTitle}>About</Text><Text style={styles.bio}>{host.hostProfile?.bio || 'No introduction yet.'}</Text><View style={styles.tags}>{(host.hostProfile?.interests || []).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View><Text style={styles.rate}>{host.hostProfile?.videoRateCredits || 50} credits/min · video-call pricing preview</Text></View>
      {gallery.length > 0 && <View style={styles.section}><Text style={styles.sectionTitle}>Gallery</Text><FlatList horizontal data={gallery} keyExtractor={(item, index) => `${item}-${index}`} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <Image source={{ uri: typeof item === 'string' ? item : item.url }} style={styles.galleryImage} />} /></View>}
      {host.hostProfile?.introVideoUrl ? <View style={styles.section}><Text style={styles.sectionTitle}>Introduction</Text><IntroVideo uri={host.hostProfile.introVideoUrl} /></View> : null}
      <View style={styles.safety}><TouchableOpacity style={styles.safetyAction} onPress={() => setShowReport(true)}><Flag color={COLORS.textSecondary} /><Text style={styles.safetyText}>Report</Text></TouchableOpacity><TouchableOpacity style={styles.safetyAction} onPress={block}><UserMinus color="#DC2626" /><Text style={[styles.safetyText, { color: '#DC2626' }]}>Block</Text></TouchableOpacity></View>
    </ScrollView>
    <ReportUserModal visible={showReport} onClose={() => setShowReport(false)} userName={host.username} onReport={async (reason, info) => { await moderationService.reportUser(user.uid, userId, reason, info); Alert.alert('Report received', 'Thank you.'); }} />
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' }, content: { paddingBottom: 60 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#F7F7F9' }, unavailable: { color: COLORS.text, fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 15 }, backText: { color: COLORS.primary, fontWeight: '900', marginTop: 14 },
  hero: { height: 410, backgroundColor: '#DDD' }, heroImage: { width: '100%', height: '100%' }, placeholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E9D5FF' }, letter: { color: '#7C3AED', fontSize: 70, fontWeight: '900' }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' }, back: { position: 'absolute', top: 50, left: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }, heroInfo: { position: 'absolute', left: 18, right: 18, bottom: 20 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, name: { color: 'white', fontSize: 30, fontWeight: '900' }, meta: { color: 'white', marginTop: 5, fontSize: 16 }, availability: { color: '#86EFAC', fontWeight: '900', textTransform: 'capitalize', marginTop: 5 },
  actions: { flexDirection: 'row', gap: 9, padding: 14 }, action: { flex: 1.4, minHeight: 58, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, following: { backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.primary }, actionText: { color: 'white', fontWeight: '900' }, smallAction: { flex: 1, minHeight: 58, backgroundColor: 'white', borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, smallText: { color: COLORS.text, fontSize: 11, fontWeight: '800', marginTop: 2 },
  section: { backgroundColor: 'white', marginHorizontal: 14, marginBottom: 12, borderRadius: 20, padding: 18 }, sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginBottom: 10 }, bio: { color: COLORS.textSecondary, lineHeight: 21 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }, tag: { color: COLORS.primary, backgroundColor: '#FFF1F4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, fontWeight: '700' }, rate: { color: COLORS.text, fontWeight: '800', marginTop: 15 }, galleryImage: { width: 130, height: 165, borderRadius: 14, marginRight: 9 }, video: { height: 240, borderRadius: 15, overflow: 'hidden' }, safety: { flexDirection: 'row', marginHorizontal: 14, gap: 10 }, safetyAction: { flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: 'white', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, safetyText: { color: COLORS.textSecondary, fontWeight: '800' },
});
export default UserProfileScreen;
