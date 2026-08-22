import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, Video } from 'lucide-react-native';
import { useUser } from '../../context/UserContext';
import { COLORS } from '../../theme/COLORS';
import { calculateAgeFromDob } from '../../models/userModel';
import { VIDEO_RATE_OPTIONS } from '../../config/pricing';
import { mediaService } from '../../services/mediaService';
import { hostApplicationService } from '../../services/hostApplicationService';
import { dbService } from '../../services/firebaseService';

const STEPS = ['Host Profile', 'Photos', 'Intro Video', 'Live Verification', 'Payout Setup', 'Review'];
const VERIFICATION_ACTIONS = ['Face centered', 'Look straight', 'Turn slightly left', 'Turn slightly right', 'Blink'];

const HostApplicationScreen = ({ navigation }) => {
  const { user, refreshUser } = useUser();
  const [step, setStep] = useState(0);
  const [applicationStatus, setApplicationStatus] = useState('not_started');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState('');
  const [rateTier, setRateTier] = useState('STANDARD');
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
      setRateTier(application.details?.rateTier || 'STANDARD');
      setProfilePhoto(application.media?.profilePhoto || null);
      setGallery(application.media?.gallery || []);
      setIntroVideo(application.media?.introVideo || null);
      setEvidence(application.verification?.evidence || []);
      setPayoutMethod(application.payoutSetup?.method || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const parsedInterests = useMemo(() => interests.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 8), [interests]);
  const selectedRate = VIDEO_RATE_OPTIONS.find((rate) => rate.id === rateTier) || VIDEO_RATE_OPTIONS[1];

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

  const saveCurrentStep = async () => {
    if ((calculateAgeFromDob(user?.dob) || 0) < 18) throw new Error('You must be at least 18 years old to apply.');
    if (step === 0) {
      if (bio.trim().length < 20) throw new Error('Please add a short bio of at least 20 characters.');
      await hostApplicationService.saveDraft({ details: { bio: bio.trim(), interests: parsedInterests, rateTier, videoRateCredits: selectedRate.creditsPerMinute } });
    }
    if (step === 1) {
      if (!profilePhoto?.url) throw new Error('A main profile photo is required.');
      await hostApplicationService.saveDraft({ media: { profilePhoto, gallery } });
    }
    if (step === 2) {
      if (!introVideo?.url) throw new Error('A short profile video is required.');
      await hostApplicationService.saveDraft({ media: { profilePhoto, gallery, introVideo } });
    }
    if (step === 3) {
      if (evidence.length < VERIFICATION_ACTIONS.length) throw new Error('Complete every guided verification capture.');
      await hostApplicationService.saveDraft({ verification: { method: 'manual_review', evidence, status: 'captured' } });
    }
    if (step === 4) {
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

  const renderStep = () => {
    if (step === 0) return <>
      <Text style={styles.label}>Short bio</Text><TextInput style={[styles.input, styles.multiline]} multiline value={bio} onChangeText={setBio} placeholder="Tell consumers what makes a conversation with you special" />
      <Text style={styles.label}>Interests (comma separated)</Text><TextInput style={styles.input} value={interests} onChangeText={setInterests} placeholder="Music, travel, culture" />
      <Text style={styles.label}>Video-call rate</Text><View style={styles.rateRow}>{VIDEO_RATE_OPTIONS.map((rate) => <TouchableOpacity key={rate.id} style={[styles.rate, rateTier === rate.id && styles.selected]} onPress={() => setRateTier(rate.id)}><Text style={styles.rateTitle}>{rate.label}</Text><Text>{rate.creditsPerMinute} credits/min</Text></TouchableOpacity>)}</View>
      <Text style={styles.note}>You are {calculateAgeFromDob(user?.dob)}. Host applicants must be 18+.</Text>
    </>;
    if (step === 1) return <>
      <Text style={styles.sectionTitle}>Main profile photo</Text>
      {profilePhoto?.url && <Image source={{ uri: profilePhoto.url }} style={styles.preview} />}
      <TouchableOpacity style={styles.action} disabled={busy} onPress={() => performUpload(async () => { const media = await pickAndUpload({ category: 'profile', kind: 'image' }); if (media) { setProfilePhoto(media); await dbService.updateUserProfile(user.uid, { profilePic: media.url }); } })}><ImagePlus color={COLORS.primary} /><Text style={styles.actionText}>Choose main photo</Text></TouchableOpacity>
      <Text style={styles.sectionTitle}>Additional photos ({gallery.length}/4)</Text>
      <View style={styles.gallery}>{gallery.map((item) => <Image key={item.path} source={{ uri: item.url }} style={styles.thumb} />)}</View>
      {gallery.length < 4 && <TouchableOpacity style={styles.action} onPress={() => performUpload(async () => { const media = await pickAndUpload({ category: 'gallery', kind: 'image' }); if (media) setGallery((items) => [...items, media]); })}><ImagePlus color={COLORS.primary} /><Text style={styles.actionText}>Add gallery photo</Text></TouchableOpacity>}
    </>;
    if (step === 2) return <><Video color={COLORS.primary} size={46} /><Text style={styles.sectionTitle}>Short profile video</Text><Text style={styles.note}>Upload a clear introduction up to 30 seconds.</Text>{introVideo?.url && <Text style={styles.success}>Video uploaded</Text>}<TouchableOpacity style={styles.action} onPress={() => performUpload(async () => { const media = await pickAndUpload({ category: 'intro-video', kind: 'video' }); if (media) setIntroVideo(media); })}><Video color={COLORS.primary} /><Text style={styles.actionText}>Choose video</Text></TouchableOpacity></>;
    if (step === 3) return <><Camera color={COLORS.primary} size={46} /><Text style={styles.sectionTitle}>Guided live verification</Text><Text style={styles.note}>These captures are evidence for manual review. Amira is not performing automated biometric verification.</Text>{VERIFICATION_ACTIONS.map((action, index) => { const capture = evidence.find((item) => item.order === index); return <TouchableOpacity key={action} style={[styles.verificationAction, capture && styles.completed]} onPress={() => performUpload(async () => { const media = await pickAndUpload({ category: `verification/${index + 1}`, camera: true, includeDownloadUrl: false }); if (media) setEvidence((items) => [...items.filter((item) => item.order !== index), { ...media, action, order: index }].sort((a, b) => a.order - b.order)); })}><Text style={styles.actionText}>{action}</Text>{capture ? <CheckCircle2 color="#22C55E" /> : <Camera color={COLORS.primary} />}</TouchableOpacity>; })}</>;
    if (step === 4) return <><Text style={styles.sectionTitle}>Future payout setup</Text><Text style={styles.note}>No payout is created in this batch. Select the method you expect to configure after approval.</Text>{['Mobile Money', 'Bank Transfer'].map((method) => <TouchableOpacity key={method} style={[styles.payout, payoutMethod === method && styles.selected]} onPress={() => setPayoutMethod(method)}><Text style={styles.actionText}>{method}</Text></TouchableOpacity>)}</>;
    return <><CheckCircle2 color={COLORS.primary} size={54} /><Text style={styles.sectionTitle}>Review and submit</Text><Text style={styles.review}>Bio: {bio}</Text><Text style={styles.review}>Photos: {1 + gallery.length}</Text><Text style={styles.review}>Intro video: Ready</Text><Text style={styles.review}>Verification captures: {evidence.length}</Text><Text style={styles.review}>Rate: {selectedRate.label} · {selectedRate.creditsPerMinute} credits/min</Text><Text style={styles.review}>Payout placeholder: {payoutMethod}</Text><Text style={styles.note}>Submission sends this application for manual administrative review. Approval cannot be granted from this app.</Text></>;
  };

  return <View style={styles.container}><View style={styles.header}><TouchableOpacity onPress={() => step ? setStep(step - 1) : navigation.goBack()}><ChevronLeft color={COLORS.text} size={28} /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.headerTitle}>{STEPS[step]}</Text><Text style={styles.progress}>Step {step + 1} of {STEPS.length} · {applicationStatus.replace(/_/g, ' ')}</Text></View></View><ScrollView contentContainerStyle={styles.content}>{renderStep()}</ScrollView><TouchableOpacity style={styles.next} disabled={busy} onPress={step === STEPS.length - 1 ? submit : next}>{busy ? <ActivityIndicator color="white" /> : <><Text style={styles.nextText}>{step === STEPS.length - 1 ? 'Submit for Review' : 'Continue'}</Text><ChevronRight color="white" /></>}</TouchableOpacity></View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F9' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 52, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900' }, progress: { color: COLORS.textSecondary, marginTop: 2 },
  content: { padding: 20, paddingBottom: 120 }, label: { color: COLORS.text, fontWeight: '800', marginTop: 16, marginBottom: 7 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 14, padding: 14, color: COLORS.text }, multiline: { height: 110, textAlignVertical: 'top' },
  rateRow: { gap: 10 }, rate: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E5EA', padding: 14, borderRadius: 14 }, selected: { borderColor: COLORS.primary, backgroundColor: '#FFF1F4' }, rateTitle: { color: COLORS.text, fontWeight: '900', marginBottom: 3 },
  note: { color: COLORS.textSecondary, lineHeight: 20, marginTop: 14 }, sectionTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginTop: 14, marginBottom: 10 },
  action: { minHeight: 54, backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 16, marginTop: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }, actionText: { color: COLORS.text, fontSize: 16, fontWeight: '800', flex: 1 },
  preview: { width: 150, height: 180, borderRadius: 18 }, gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, thumb: { width: 76, height: 92, borderRadius: 12 }, success: { color: '#15803D', fontWeight: '800', marginTop: 10 },
  verificationAction: { backgroundColor: 'white', minHeight: 58, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#E5E5EA' }, completed: { borderColor: '#22C55E' },
  payout: { backgroundColor: 'white', minHeight: 58, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E5EA', marginTop: 10 }, review: { color: COLORS.text, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDD' },
  next: { position: 'absolute', left: 20, right: 20, bottom: 28, minHeight: 58, borderRadius: 29, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, nextText: { color: 'white', fontSize: 17, fontWeight: '900' },
});
export default HostApplicationScreen;
