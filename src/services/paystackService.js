// Paystack payment service skeleton
export const paystackConfig = {
  publicKey: "pk_test_your_public_key",
};

export const paystackService = {
  initializeTransaction: async (email, amount) => {
    console.log("Initializing Paystack transaction:", { email, amount });
    return { access_code: 'PLRT_123', reference: 'ref_456' };
  },
  verifyTransaction: async (reference) => {
    console.log("Verifying Paystack transaction:", reference);
    return { status: 'success' };
  }
};
