import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseService';
import { calculateAgeFromDob } from '../models/userModel';

const applicationRef = (uid) => doc(db, 'hostApplications', uid);

export const hostApplicationService = {
  getApplication: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required.');
    const snapshot = await getDoc(applicationRef(uid));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },
  saveDraft: async (patch) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required.');
    await setDoc(applicationRef(uid), {
      ownerUid: uid,
      status: 'in_progress',
      ...patch,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },
  submit: async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required.');
    const appRef = applicationRef(uid);
    const userRef = doc(db, 'users', uid);
    return runTransaction(db, async (transaction) => {
      const [applicationSnapshot, userSnapshot] = await Promise.all([
        transaction.get(appRef), transaction.get(userRef),
      ]);
      if (!applicationSnapshot.exists() || !userSnapshot.exists()) throw new Error('Application or profile not found.');
      const application = applicationSnapshot.data();
      const user = userSnapshot.data();
      if ((calculateAgeFromDob(user.dob) || 0) < 18) throw new Error('Hosts must be at least 18 years old.');
      if (!application?.media?.profilePhoto?.url) throw new Error('Profile photo is required.');
      if (!application?.media?.introVideo?.url) throw new Error('Short profile video is required.');
      if (!application?.verification?.evidence?.length) throw new Error('Live verification evidence is required.');
      if (!application?.payoutSetup?.method) throw new Error('Select a future payout method.');
      transaction.set(appRef, { status: 'submitted', submittedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      transaction.set(userRef, {
        role: 'host',
        profilePic: application.media.profilePhoto.url,
        hostProfile: {
          bio: application.details?.bio || '',
          interests: application.details?.interests || [],
          gallery: (application.media?.gallery || []).map((item) => item.url),
          introVideoUrl: application.media.introVideo.url,
          introVideoPath: application.media.introVideo.path,
          rateTier: application.details?.rateTier || 'STANDARD',
          videoRateCredits: application.details?.videoRateCredits || 50,
        },
        hostStatus: {
          hasApplied: true,
          isApproved: false,
          verificationStatus: 'pending',
          availability: 'offline',
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { success: true };
    });
  },
};
