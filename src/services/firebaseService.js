// Firebase initialization and service methods
export const firebaseConfig = {
  apiKey: "AIzaSyB_Mock_Key_For_Production",
  authDomain: "amira-social.firebaseapp.com",
  projectId: "amira-social",
  storageBucket: "amira-social.appspot.com",
  messagingSenderId: "777888999000",
  appId: "1:777888999000:android:abc123xyz"
};

export const authService = {
  loginWithPhone: async (phone) => {
     // console.log("Mock Phone Login:", phone);
    return { success: true };
  },
  verifyOTP: async (code) => {
     // console.log("Mock OTP Verification:", code);
    return { user: { uid: '123', name: 'John' } };
  }
};

export const dbService = {
  getUserProfile: async (uid) => {
    return {
      uid,
      name: 'John Doe',
      diamonds: 1200,
      isVip: true,
      country_code: 'GH', // Mocked for Paystack Sprint
      gender: 'male', // or 'female'
      bio: 'Lover of luxury and high-stakes social flexing. 🥂',
      photos: [
        'https://via.placeholder.com/300x400?text=Photo+1',
        'https://via.placeholder.com/300x400?text=Photo+2',
        'https://via.placeholder.com/300x400?text=Photo+3',
        'https://via.placeholder.com/300x400?text=Photo+4',
      ]
    };
  },
  updateUserProfile: async (uid, data) => {
     // console.log("Mock Updating User Profile:", uid, data);
    return { success: true };
  }
};
