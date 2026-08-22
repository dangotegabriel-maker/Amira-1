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
    // console.log("Verifying Paystack transaction via Backend Simulation:", reference);

    // BACKEND-SIDE CALL: https://api.paystack.co/transaction/verify/:reference
    const secretKey = process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("Paystack Secret Key is missing from environment.");

    // Simulate the verification response from Paystack Backend API
    return new Promise((resolve) => {
       setTimeout(() => {
          resolve({
             success: true,
             status: 'success', // or 'failed' / 'pending'
             message: 'Verification successful',
             data: {
                id: 12345,
                domain: 'test',
                status: 'success',
                reference: reference,
                amount: 1000,
                gateway_response: 'Successful',
                channel: 'card',
                currency: 'GHS'
             }
          });
       }, 1500);
    });
  }
};
