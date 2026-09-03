import { Alert } from 'react-native';
import { callService } from './callService';

export const startVideoCall = async ({ navigation, creator }) => {
  try {
    const prepared = await callService.prepare({ creatorId: creator.uid, demoHost: creator.isDemo ? creator : undefined });
    navigation.navigate('VideoCall', { call: await callService.request(prepared), creator });
  } catch (error) {
    Alert.alert('Video call unavailable', error.message || 'This call could not be started.');
  }
};
