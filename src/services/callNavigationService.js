import { Alert } from 'react-native';
import { callService } from './callService';

export const startVideoCall = async ({ navigation, creator, isCurrent = () => true }) => {
  if (!isCurrent()) return;
  try {
    const displayedRate=creator?.hostProfile?.videoRateCredits;
    if(!Number.isSafeInteger(displayedRate)||displayedRate<=0)throw new Error('Authoritative call terms are unavailable.');
    const accepted=await new Promise(resolve=>Alert.alert('Video call terms',
      `Free time applies first. The call then continues automatically at ${displayedRate} Credits/min in 10-second increments while you have enough Credits.`,[
        {text:'Cancel',style:'cancel',onPress:()=>resolve(false)},{text:'Start Call',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(false)}));
    if(!accepted || !isCurrent())return;
    const prepared = await callService.prepare({ creatorId: creator.uid, demoHost: creator.isDemo ? creator : undefined });
    if (!isCurrent()) return;
    const call = await callService.request(prepared);
    if (isCurrent()) navigation.navigate('VideoCall', { call, creator });
  } catch (error) {
    if (!isCurrent()) return;
    if (error.details?.reason === 'insufficient_call_credits') {
      Alert.alert('Get Credits', `You need Credits to start this video call. ${error.details.ratePerMinute} Credits/min.`, [
        { text: 'Get Credits', onPress: () => isCurrent() && navigation.navigate('RechargeHub') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Video call unavailable', error.message || 'This call could not be started.');
  }
};
