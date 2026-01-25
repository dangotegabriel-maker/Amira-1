// Agora RTC service skeleton
export const agoraConfig = {
  appId: "YOUR_AGORA_APP_ID",
  token: null, // Generated from server
};

export const agoraService = {
  joinChannel: async (channelName) => {
    console.log("Joining Agora channel:", channelName);
    return { success: true };
  },
  leaveChannel: async () => {
    console.log("Leaving Agora channel");
  }
};
