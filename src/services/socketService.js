// src/services/socketService.js
import { EventEmitter } from 'events';

class SocketService extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
  }

  connect(userId) {
    console.log(`Socket connecting for user: ${userId}`);
    this.connected = true;
    // Mock receiving a gift from another user after a delay for testing/demo
    /*
    setTimeout(() => {
      this.emit('gift_received', {
        giftId: 'l11', // Amira Crown
        senderName: 'Sarah',
        combo: 1
      });
    }, 10000);
    */
  }

  sendGift(targetUserId, giftData) {
    console.log(`Socket: Sending gift to ${targetUserId}`, giftData);
    // In a real app, this would emit to the server
    // socket.emit('send_gift', { targetUserId, ...giftData });
  }

  disconnect() {
    this.connected = false;
  }
}

export const socketService = new SocketService();
