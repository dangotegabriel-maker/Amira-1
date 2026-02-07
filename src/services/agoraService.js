// src/services/agoraService.js
import { socketService } from './socketService';

export const agoraConfig = {
  appId: "YOUR_AGORA_APP_ID",
  token: null, // Generated from server
};

export const agoraService = {
  joinChannel: async (channelName) => {
    console.log("Joining Agora channel:", channelName);
    // Broadcast Busy Status
    socketService.broadcastStatus('STATUS_BUSY');
    return { success: true };
  },
  leaveChannel: async () => {
    console.log("Leaving Agora channel");
    // Broadcast Online Status back
    socketService.broadcastStatus('ONLINE_STATUS');
  }
};
