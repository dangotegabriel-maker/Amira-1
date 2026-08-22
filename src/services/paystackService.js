// Paystack payment service skeleton
export const paystackConfig = {
  publicKey: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
};

export const paystackService = {
  initializeTransaction: async (user, amount) => {
    const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!PAYSTACK_PUBLIC_KEY || !PAYSTACK_PUBLIC_KEY.startsWith('pk_test_')) {
      throw new Error('Paystack public test key is missing or invalid.');
    }

    const reference = "ref_" + Date.now();
    const amountInKobo = amount * 100;

    const paystackConfig = {
      email: user.email || "test@email.com",
      amount: amountInKobo,
      reference: reference,
      publicKey: PAYSTACK_PUBLIC_KEY,
      onSuccess(response) {
        console.log("SUCCESS:", response);
      },
      onCancel() {
        console.log("CANCELLED");
      },
    };

    console.log("PAYSTACK CONFIG:", paystackConfig);

    return paystackConfig;
  },

  verifyTransaction: async (reference) => {
    // Batch 1 intentionally has no client-side verification. A future trusted
    // server must verify the reference with Paystack and credit the wallet idempotently.
    const error = new Error('Payment verification is unavailable until the server integration is implemented.');
    error.code = 'payments/server-verification-required';
    error.reference = reference;
    throw error;
  }
};
