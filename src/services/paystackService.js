export const paystackService = {
  initializeTransaction: async () => {
    const error = new Error('Recharge is unavailable until the trusted server integration is configured.');
    error.code = 'payments/unavailable';
    throw error;
  },
  verifyTransaction: async () => {
    const error = new Error('Payment verification is unavailable until the server integration is implemented.');
    error.code = 'payments/server-verification-required';
    throw error;
  }
};
