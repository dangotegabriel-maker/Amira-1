// src/services/agoraService.js
import { socketService } from './socketService';

export const agoraConfig = Object.freeze({ appId: null, token: null, configured: false });

export const agoraService = {
  joinChannel: async (channelName) => {
     // console.log("Joining Agora channel:", channelName);
    throw new Error('Legacy Agora adapter is not configured. Use rtcService with server-minted credentials.');
  },
  leaveChannel: async () => {
     // console.log("Leaving Agora channel");
    // Broadcast Online Status back
    socketService.broadcastStatus('ONLINE_STATUS');
  }
};
