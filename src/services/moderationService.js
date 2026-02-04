// src/services/moderationService.js
// Service for handling user blocking and reporting

export const moderationService = {
  // Mock database for blocks and reports
  blocks: [],
  reports: [],

  blockUser: async (blockerId, blockedId) => {
    console.log(`Blocking user ${blockedId} for blocker ${blockerId}`);
    moderationService.blocks.push({ blockerId, blockedId, timestamp: new Date() });

    // Logic to instantly invalidate socket connection (simulated)
    console.log(`Socket connection invalidated for ${blockedId}`);

    return { success: true };
  },

  reportUser: async (reporterId, reportedId, reason, lastMessages) => {
    console.log(`Reporting user ${reportedId} by ${reporterId} for ${reason}`);
    const reportEntry = {
      reporterId,
      reportedId,
      reason,
      snapshot: lastMessages,
      timestamp: new Date()
    };
    moderationService.reports.push(reportEntry);

    // Simulate POST request to admin dashboard
    try {
      // await fetch('https://admin-api.amira.com/v1/reports', { method: 'POST', body: JSON.stringify(reportEntry) });
      console.log('Report sent to admin dashboard successfully');
    } catch (error) {
      console.error('Failed to send report to admin:', error);
    }

    return { success: true };
  },

  isBlocked: (userId, otherId) => {
    return moderationService.blocks.some(
      b => (b.blockerId === userId && b.blockedId === otherId) ||
           (b.blockerId === otherId && b.blockedId === userId)
    );
  }
};
