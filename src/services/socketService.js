// src/services/socketService.js

class SocketService {
  constructor() {
    this.connected = false;
    this.listeners = {};
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
    console.log(`Socket connecting for user: ${userId}`);
    this.connected = true;
    this.broadcastPresence(userId, true);
  }

  broadcastPresence(userId, isOnline) {
    console.log(`Socket: Broadcasting presence for ${userId}: ${isOnline ? 'Online' : 'Offline'}`);
    // socket.emit('presence_update', { userId, isOnline });
  }

  emitProfileView(viewerId, profileId) {
    console.log(`Socket: ${viewerId} viewed profile of ${profileId}`);
    // socket.emit('profile_view', { viewerId, profileId });
  }

  sendGift(targetUserId, giftData) {
    console.log(`Socket: Sending gift to ${targetUserId}`, giftData);
    // socket.emit('send_gift', { targetUserId, ...giftData });
  }

  disconnect(userId) {
    this.broadcastPresence(userId, false);
    this.connected = false;
  }
}

export const socketService = new SocketService();
