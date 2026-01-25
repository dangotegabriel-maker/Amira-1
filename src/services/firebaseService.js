// Firebase initialization and service methods
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "amira-app.firebaseapp.com",
  projectId: "amira-app",
  storageBucket: "amira-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const authService = {
  loginWithPhone: async (phone) => {
    console.log("Mock Phone Login:", phone);
    return { success: true };
  },
  verifyOTP: async (code) => {
    console.log("Mock OTP Verification:", code);
    return { user: { uid: '123', name: 'John' } };
  }
};

export const dbService = {
  getUserProfile: async (uid) => {
    return { uid, name: 'John', diamonds: 1200, isVip: false };
  }
};
