// src/services/socketService.js
import { AppState } from "react-native";
import EventEmitter from 'eventemitter3';

class SocketService extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    this.heartbeatTimer = null;
    this.userId = null;
    this.offlineGraceTimer = null;
    this.pendingNotifications = {};

    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  connect(userId) {
    if (this.connected && this.userId === userId) return;
    console.log(`Socket connecting for user: ${userId}`);
    this.userId = userId;
    this.connected = true;
    this.broadcastStatus('ONLINE_STATUS');
    this.startHeartbeat();
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        console.log("Socket: Sending Heartbeat 💓");
      }
    }, 60000);
  }

  broadcastStatus(status) {
    console.log(`Socket: Broadcasting status for ${this.userId}: ${status}`);
    if (status === 'ONLINE_STATUS' && this.lastStatus === 'STATUS_BUSY') {
        this.triggerNotifyQueue(this.userId);
    }
    this.lastStatus = status;
  }

  addToNotifyQueue(profileId, viewerId) {
    if (!this.pendingNotifications[profileId]) this.pendingNotifications[profileId] = [];
    if (!this.pendingNotifications[profileId].includes(viewerId)) {
        this.pendingNotifications[profileId].push(viewerId);
    }
  }

  triggerNotifyQueue(profileId) {
    const viewers = this.pendingNotifications[profileId];
    if (viewers && viewers.length > 0) {
        console.log(`Socket: Notifying ${viewers.length} viewers that ${profileId} is free!`);
        this.pendingNotifications[profileId] = [];
    }
  }

  handleAppStateChange(nextAppState) {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.offlineGraceTimer = setTimeout(() => {
        this.broadcastStatus('OFFLINE_STATUS');
      }, 30000);
    } else if (nextAppState === 'active') {
      if (this.offlineGraceTimer) {
        clearTimeout(this.offlineGraceTimer);
        this.offlineGraceTimer = null;
      }
      this.broadcastStatus('ONLINE_STATUS');
    }
  }

  emitProfileView(viewerId, profileId) {
    console.log(`Socket: ${viewerId} viewed profile of ${profileId}`);
  }

  sendGift(targetUserId, giftData) {
    console.log(`Socket: Sending gift to ${targetUserId}`, giftData);
  }

  sendWhisper(targetUserId, senderName) {
    console.log(`Socket: ${senderName} sent a whisper nudge to ${targetUserId}`);
  }

  // New for Call Extending
  signalCallExtension(targetId) {
     console.log(`Socket: Signaling call extension to ${targetId}`);
     // socket.emit('call_extending', { targetId });
  }

  disconnect() {
    if (this.userId) this.broadcastStatus('OFFLINE_STATUS');
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.connected = false;
    this.userId = null;
  }
}

export const socketService = new SocketService();
