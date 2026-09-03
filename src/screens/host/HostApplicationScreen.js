import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, Video, X } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { COLORS } from '../../theme/COLORS';
import { calculateAgeFromDob } from '../../models/userModel';
import { INITIAL_HOST_TIER } from '../../config/pricing';
import { BIO_TEMPLATES } from '../../data/bioTemplates';
import { mediaService } from '../../services/mediaService';
import { hostApplicationService } from '../../services/hostApplicationService';
import { dbService } from '../../services/firebaseService';
import { canContinueWithoutMedia, getMissingCreatorRequirements } from '../../utils/creatorApplication';

const STEPS = ['About You', 'Your Profile', 'Photos', 'Intro Video', 'Verification', 'Payout Setup', 'Review & Submit'];
const VERIFICATION_ACTIONS = ['Face centered', 'Look straight', 'Turn slightly left', 'Turn slightly right', 'Blink'];
const isDevelopmentBuild = typeof __DEV__ !== 'undefined' && __DEV__ === true;
const mediaUploadsEnabled = process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS === 'true';

const HostApplicationScreen = ({ navigation }) => {
  const { user, refreshUser } = useUser();
  const [step, setStep] = useState(0);
  const [applicationStatus, setApplicationStatus] = useState('not_started');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [introVideo, setIntroVideo] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [payoutMethod, setPayoutMethod] = useState('');

  useEffect(() => {
    hostApplicationService.getApplication().then((application) => {
      if (!application) return;
      setApplicationStatus(application.status || 'in_progress');
      setBio(application.details?.bio || '');
      setInterests((application.details?.interests || []).join(', '));
      setProfilePhoto(application.media?.profilePhoto || null);
      setGallery(application.media?.gallery || []);
      setIntroVideo(application.media?.introVideo || null);
      setEvidence(application.verification?.evidence || []);
      setPayoutMethod(application.payoutSetup?.method || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const parsedInterests = useMemo(() => interests.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 8), [interests]);

  const pickAndUpload = async ({ kind = 'image', category, camera = false, includeDownloadUrl = true }) => {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error(`${camera ? 'Camera' : 'Media library'} permission is required.`);
    const options = { quality: 0.8, mediaTypes: kind === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images };
    if (kind === 'video') options.videoMaxDuration = 30;
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return null;
    return mediaService.uploadUserMedia({ asset: result.assets[0], category, kind, includeDownloadUrl });
  };

  const performUpload = async (work) => {
    setBusy(true);
    try { await work(); } catch (error) { Alert.alert('Upload failed', error.message || 'Please try again.'); }
    finally { setBusy(false); }
  };

  const uploadMainPhoto = () => performUpload(async () => {
    const media = await pickAndUpload({ category: 'profile', kind: 'image' });
    if (!media) return;
    const previous = profilePhoto;
    try {
      await hostApplicationService.saveDraft({ media: { profilePhoto: media, gallery, ...(introVideo ? { introVideo } : {}) } });
      await dbService.updateUserProfile(user.uid, { profilePic: media.url, updatedAt: new Date() });
      setProfilePhoto(media);
      if (previous?.path && previous.path !== media.path) mediaService.deleteOwnedMedia(previous.path).catch(() => {});
    } catch (error) {
      mediaService.deleteOwnedMedia(media.path).catch(() => {});
      throw error;
    }
  });

  const uploadGalleryPhoto = () => performUpload(async () => {
    if (gallery.length >= 4) throw new Error('You can add up to four additional photos.');
    const media = await pickAndUpload({ category: 'gallery', kind: 'image' });
    if (!media) return;
    const nextGallery = [...gallery, media];
    try {
      await hostApplicationService.saveDraft({ media: { ...(profilePhoto ? { profilePhoto } : {}), gallery: nextGallery, ...(introVideo ? { introVideo } : {}) } });
      setGallery(nextGallery);
    } catch (error) {
      mediaService.deleteOwnedMedia(media.path).catch(() => {});
      throw error;
    }
  });

  const removeGalleryPhoto = (media) => performUpload(async () => {
    const nextGallery = gallery.filter((item) => item.path !== media.path);
    await hostApplicationService.saveDraft({ media: { ...(profilePhoto ? { profilePhoto } : {}), gallery: nextGallery, ...(introVideo ? { introVideo } : {}) } });
    setGallery(nextGallery);
    await mediaService.deleteOwnedMedia(media.path).catch(() => {});
  });

  const uploadIntroVideo = () => performUpload(async () => {
    const media = await pickAndUpload({ category: 'intro-video', kind: 'video' });
    if (!media) return;
    const previous = introVideo;
    try {
      await hostApplicationService.saveDraft({ media: { ...(profilePhoto ? { profilePhoto } : {}), gallery, introVideo: media } });
      setIntroVideo(media);
      if (previous?.path && previous.path !== media.path) mediaService.deleteOwnedMedia(previous.path).catch(() => {});
    } catch (error) {
      mediaService.deleteOwnedMedia(media.path).catch(() => {});
      throw error;
    }
  });

  const uploadVerificationCapture = (action, index) => performUpload(async () => {
    const media = await pickAndUpload({ category: `verification/${index + 1}`, camera: true, includeDownloadUrl: false });
    if (!media) return;
    const previous = evidence.find((item) => item.order === index);
    const nextEvidence = [...evidence.filter((item) => item.order !== index), { ...media, action, order: index }].sort((a, b) => a.order - b.order);
    try {
      await hostApplicationService.saveDraft({ verification: { method: 'manual_review', evidence: nextEvidence, status: 'captured' } });
      setEvidence(nextEvidence);
      if (previous?.path) mediaService.deleteOwnedMedia(previous.path).catch(() => {});
    } catch (error) {
      mediaService.deleteOwnedMedia(media.path).catch(() => {});
      throw error;
    }
  });

  const saveCurrentStep = async () => {
    if ((calculateAgeFromDob(user?.dob) || 0) < 18) throw new Error('You must be at least 18 years old to apply.');
    if (step === 1) {
      if (bio.trim().length < 20) throw new Error('Please add a short bio of at least 20 characters.');
      await hostApplicationService.saveDraft({ details: { bio: bio.trim(), interests: parsedInterests, rateTier: INITIAL_HOST_TIER.id, videoRateCredits: INITIAL_HOST_TIER.creditsPerMinute } });
    }
    if (step === 2 && !canContinueWithoutMedia({ step, mediaUploadsEnabled, isDev: isDevelopmentBuild })) {
      if (!profilePhoto?.url) throw new Error('A main profile photo is required.');
      await hostApplicationService.saveDraft({ media: { profilePhoto, gallery } });
    }
    if (step === 3 && !canContinueWithoutMedia({ step, mediaUploadsEnabled, isDev: isDevelopmentBuild })) {
      if (!introVideo?.url) throw new Error('A short profile video is required.');
      await hostApplicationService.saveDraft({ media: { profilePhoto, gallery, introVideo } });
    }
    if (step === 4 && !canContinueWithoutMedia({ step, mediaUploadsEnabled, isDev: isDevelopmentBuild })) {
      if (evidence.length < VERIFICATION_ACTIONS.length) throw new Error('Complete every guided verification capture.');
      await hostApplicationService.saveDraft({ verification: { method: 'manual_review', evidence, status: 'captured' } });
    }
    if (step === 5) {
      if (!payoutMethod) throw new Error('Select a future payout method.');
      await hostApplicationService.saveDraft({ payoutSetup: { method: payoutMethod, status: 'details_required_after_approval' } });
    }
  };

  const next = async () => {
    setBusy(true);
    try { await saveCurrentStep(); setApplicationStatus('in_progress'); setStep((value) => Math.min(value + 1, STEPS.length - 1)); }
    catch (error) { Alert.alert('Complete this step', error.message); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await hostApplicationService.submit();
      setApplicationStatus('submitted');
      await refreshUser();
      Alert.alert('Application submitted', 'Your evidence will be reviewed manually.');
    } catch (error) { Alert.alert('Cannot submit', error.message); }
    finally { setBusy(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  const missingRequirements = getMissingCreatorRequirements({ profilePhoto, introVideo, evidence, payoutMethod });
  const mediaUnavailable = isDevelopmentBuild && !mediaUploadsEnabled;

  const renderStep = () => {
    if (step === 0) return <><Text style={styles.sectionTitle}>Welcome to your host application</Text><Text style={styles.note}>You are {calculateAgeFromDob(user?.dob)}. Host applicants must be 18 or older. We will guide you through a profile, photos and a simple manual review.</Text><Text style={styles.note}>All new hosts begin at Entry level. Higher earning tiers are unlocked based on performance and account standing.</Text></>;
    if (step === 1) return <>
      <Text style={styles.label}>Short bio</Text><TextInput style={[styles.input, styles.multiline]} multiline value={bio} onChangeText={setBio} placeholder="Tell consumers what makes a conversation with you special" />
      <Text style={styles.label}>Need inspiration? Choose a template</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{BIO_TEMPLATES.map((template) => <TouchableOpacity key={template.id} style={styles.template} onPress={() => setBio(template.text)}><Text style={styles.templateTone}>{template.tone}</Text><Text style={styles.templateText} numberOfLines={3}>{template.text}</Text></TouchableOpacity>)}</ScrollView>
      <Text style={styles.label}>Interests (comma separated)</Text><TextInput style={styles.input} value={interests} onChangeText={setInterests} placeholder="Music, travel, culture" />
      <Text style={styles.note}>Your bio remains editable after choosing a template.</Text>
    </>;
    if (step === 2) return <>
      <Text style={styles.sectionTitle}>Main profile photo</Text>
      {mediaUnavailable && <View style={styles.unavailableBox}><Text style={styles.unavailableTitle}>Media uploads unavailable</Text><Text style={styles.note}>Continue to preview the remaining steps. Photos remain required and no placeholder will be saved.</Text></View>}
      {profilePhoto?.url && <Image source={{ uri: profilePhoto.url }} style={styles.preview} />}
      <TouchableOpacity style={styles.action} disabled={busy || mediaUnavailable} onPress={uploadMainPhoto}><ImagePlus color={COLORS.primary} /><Text style={styles.actionText}>{profilePhoto ? 'Replace main photo' : 'Choose main photo'}</Text></TouchableOpacity>
      <Text style={styles.sectionTitle}>Additional photos ({gallery.length}/4)</Text>
      <View style={styles.gallery}>{gallery.map((item) => <View key={item.path} style={styles.thumbWrap}><Image source={{ uri: item.url }} style={styles.thumb} /><TouchableOpacity style={styles.removePhoto} onPress={() => removeGalleryPhoto(item)} disabled={busy}><X color="white" size={15} /></TouchableOpacity></View>)}</View>
      {gallery.length < 4 && <TouchableOpacity style={styles.action} disabled={busy || mediaUnavailable} onPress={uploadGalleryPhoto}><ImagePlus color={COLORS.primary} /><Text style={styles.actionText}>Add gallery photo</Text></TouchableOpacity>}
    </>;
    if (step === 3) return <><Video color={COLORS.primary} size={46} /><Text style={styles.sectionTitle}>Short profile video</Text><Text style={styles.note}>Upload a clear introduction up to 30 seconds.</Text>{mediaUnavailable&&<View style={styles.unavailableBox}><Text style={styles.unavailableTitle}>Video upload unavailable</Text><Text style={styles.note}>Continue for UI testing. Intro Video remains required.</Text></View>}{introVideo?.url && <Text style={styles.success}>Video uploaded</Text>}<TouchableOpacity style={styles.action} disabled={busy || mediaUnavailable} onPress={uploadIntroVideo}><Video color={COLORS.primary} /><Text style={styles.actionText}>{introVideo ? 'Replace video' : 'Choose video'}</Text></TouchableOpacity></>;
    if (step === 4) return <><Camera color={COLORS.primary} size={46} /><Text style={styles.sectionTitle}>Guided live verification</Text><Text style={styles.note}>Follow each prompt so our team can review your application safely. These private captures are never used as profile photos.</Text>{mediaUnavailable&&<View style={styles.unavailableBox}><Text style={styles.unavailableTitle}>Verification capture unavailable</Text><Text style={styles.note}>Continue for UI testing. Verification remains required.</Text></View>}{VERIFICATION_ACTIONS.map((action, index) => { const capture = evidence.find((item) => item.order === index); return <TouchableOpacity key={action} disabled={busy || mediaUnavailable} style={[styles.verificationAction, capture && styles.completed]} onPress={() => uploadVerificationCapture(action, index)}><Text style={styles.actionText}>{action}</Text>{capture ? <CheckCircle2 color="#22C55E" /> : <Camera color={COLORS.primary} />}</TouchableOpacity>; })}</>;
    if (step === 5) return <><Text style={styles.sectionTitle}>Future payout setup</Text><Text style={styles.note}>Payouts are not active yet. Choose the method you expect to configure after approval.</Text>{['Mobile Money', 'Bank Transfer'].map((method) => <TouchableOpacity key={method} style={[styles.payout, payoutMethod === method && styles.selected]} onPress={() => setPayoutMethod(method)}><Text style={styles.actionText}>{method}</Text></TouchableOpacity>)}</>;
    return <><CheckCircle2 color={missingRequirements.length ? '#F59E0B' : COLORS.primary} size={54} /><Text style={styles.sectionTitle}>Review and submit</Text><Text style={styles.review}>Bio: {bio}</Text><Text style={styles.review}>Photos: {profilePhoto?.url ? 'Ready' : 'Required'}</Text><Text style={styles.review}>Intro Video: {introVideo?.url ? 'Ready' : 'Required'}</Text><Text style={styles.review}>Verification: {evidence.length >= VERIFICATION_ACTIONS.length ? 'Ready' : 'Required'}</Text><Text style={styles.review}>Starting level: Entry · {INITIAL_HOST_TIER.creditsPerMinute} credits/min</Text><Text style={styles.review}>Future payout method: {payoutMethod || 'Required'}</Text>{missingRequirements.length > 0 && <Text style={styles.missing}>Complete before submission: {missingRequirements.join(', ')}</Text>}<Text style={styles.note}>Your application will be reviewed by the Amira team. Approval cannot be granted from this app.</Text></>;
  };

  const continueDisabled = busy || (step === STEPS.length - 1 && missingRequirements.length > 0);
  return <View style={styles.container}><View style={styles.header}><TouchableOpacity onPress={() => step ? setStep(step - 1) : navigation.goBack()}><ChevronLeft color={COLORS.text} size={28} /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.headerTitle}>{STEPS[step]}</Text><Text style={styles.progress}>Step {step + 1} of {STEPS.length} · {applicationStatus.replace(/_/g, ' ')}</Text></View></View><ScrollView contentContainerStyle={styles.content}>{renderStep()}</ScrollView><TouchableOpacity style={[styles.next, continueDisabled && styles.nextDisabled]} disabled={continueDisabled} onPress={step === STEPS.length - 1 ? submit : next}>{busy ? <ActivityIndicator color="white" /> : <><Text style={styles.nextText}>{step === STEPS.length - 1 ? 'Submit for Review' : 'Continue'}</Text><ChevronRight color="white" /></>}</TouchableOpacity></View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 52, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900' }, progress: { color: COLORS.textSecondary, marginTop: 2 },
  content: { padding: 20, paddingBottom: 120 }, label: { color: COLORS.text, fontWeight: '800', marginTop: 16, marginBottom: 7 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 14, padding: 14, color: COLORS.text }, multiline: { height: 110, textAlignVertical: 'top' },
  selected: { borderColor: COLORS.primary, backgroundColor: '#FFF1F4' }, template:{width:210,minHeight:115,backgroundColor:'white',borderRadius:14,padding:13,marginRight:9,borderWidth:1,borderColor:'#E5E5EA'},templateTone:{fontSize:11,fontWeight:'900',color:COLORS.primary,textTransform:'uppercase'},templateText:{color:COLORS.textSecondary,fontSize:12,lineHeight:17,marginTop:7},
  note: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 14 }, sectionTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 14, marginBottom: 10 },
  action: { minHeight: 54, backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 16, marginTop: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }, actionText: { color: COLORS.text, fontSize: 16, fontWeight: '800', flex: 1 },
  preview: { width: 150, height: 180, borderRadius: 18 }, gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, thumbWrap:{position:'relative'}, thumb: { width: 76, height: 92, borderRadius: 12 }, removePhoto:{position:'absolute',top:4,right:4,width:25,height:25,borderRadius:13,backgroundColor:'rgba(0,0,0,.65)',alignItems:'center',justifyContent:'center'}, success: { color: '#15803D', fontWeight: '800', marginTop: 10 },
  verificationAction: { backgroundColor: 'white', minHeight: 58, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#E5E5EA' }, completed: { borderColor: '#22C55E' },
  payout: { backgroundColor: 'white', minHeight: 58, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', marginTop: 10 }, review: { color: COLORS.text, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDD' },
  unavailableBox:{backgroundColor:'#FFF7ED',borderWidth:1,borderColor:'#FDBA74',borderRadius:15,padding:15,marginVertical:10},unavailableTitle:{color:'#9A3412',fontWeight:'900',fontSize:16},missing:{color:'#B45309',fontWeight:'800',lineHeight:20,marginTop:14},
  next: { position: 'absolute', left: 20, right: 20, bottom: 28, minHeight: 58, borderRadius: 29, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, nextDisabled:{opacity:.45}, nextText: { color: 'white', fontSize: 17, fontWeight: '900' },
});
export default HostApplicationScreen;
