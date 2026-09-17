import { Alert } from 'react-native';
import { callService } from './callService';

export const startVideoCall = async ({ navigation, creator }) => {
  try {
    const prepared = await callService.prepare({ creatorId: creator.uid, demoHost: creator.isDemo ? creator : undefined });
    navigation.navigate('VideoCall', { call: await callService.request(prepared), creator });
  } catch (error) {
    if (error.details?.reason === 'insufficient_call_credits') {
      Alert.alert('Get Credits', `You need Credits to start this video call. ${error.details.ratePerMinute} Credits/min.`, [
        { text: 'Get Credits', onPress: () => navigation.navigate('RechargeHub') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Video call unavailable', error.message || 'This call could not be started.');
  }
};
