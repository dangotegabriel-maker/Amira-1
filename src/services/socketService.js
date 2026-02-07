// src/services/socketService.js
import { AppState } from 'react-native';

class SocketService {
  constructor() {
    this.connected = false;
    this.listeners = {};
    this.heartbeatTimer = null;
    this.userId = null;
    this.offlineGraceTimer = null;

    // Listen for AppState changes for background logic
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }

  connect(userId) {
    if (this.connected && this.userId === userId) return;

    console.log(`Socket connecting for user: ${userId}`);
    this.userId = userId;
    this.connected = true;

    // Broadcast Online immediately
    this.broadcastStatus('ONLINE_STATUS');

    // Start Heartbeat (every 60s)
    this.startHeartbeat();
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        console.log("Socket: Sending Heartbeat 💓");
        // socket.emit('heartbeat', { userId: this.userId });
      }
    }, 60000);
  }

  broadcastStatus(status) {
    console.log(`Socket: Broadcasting status for ${this.userId}: ${status}`);
    // socket.emit('status_update', { userId: this.userId, status });
  }

  handleAppStateChange(nextAppState) {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log("Socket: App went to background. Starting 30s offline grace period...");
      // Wait 30 seconds before broadcasting OFFLINE
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
    // socket.emit('profile_view', { viewerId, profileId });
  }

  sendGift(targetUserId, giftData) {
    console.log(`Socket: Sending gift to ${targetUserId}`, giftData);
    // socket.emit('send_gift', { targetUserId, ...giftData });
  }

  disconnect() {
    if (this.userId) {
      this.broadcastStatus('OFFLINE_STATUS');
    }
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.connected = false;
    this.userId = null;
    console.log("Socket: Disconnected.");
  }
}

export const socketService = new SocketService();
