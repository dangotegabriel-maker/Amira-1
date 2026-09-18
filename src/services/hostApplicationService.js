import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseService';
import { calculateAgeFromDob, isApprovedHost } from '../models/userModel';

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
    return runTransaction(db, async (transaction) => {
      const ref = applicationRef(uid);
      const [snapshot, profile] = await Promise.all([transaction.get(ref), transaction.get(doc(db, 'users', uid))]);
      if (!profile.exists() || isApprovedHost(profile.data())) throw new Error('Consumer application required.');
      if (snapshot.exists() && ['submitted','pending','under_review','approved'].includes(snapshot.data().status)) throw new Error('Application is already under review or approved.');
      const draft = Object.fromEntries(Object.entries(patch).filter(([key]) => ['details','media','verification','payoutSetup'].includes(key)));
      transaction.set(ref, { ...draft, ownerUid: uid, status: 'in_progress', updatedAt: serverTimestamp() }, { merge: true });
    });
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
      if (isApprovedHost(user)) throw new Error('This account is already an approved Host.');
      if (['submitted','pending','under_review','approved'].includes(application.status)) throw new Error('Application is already under review or approved.');
      if ((calculateAgeFromDob(user.dob) || 0) < 18) throw new Error('Hosts must be at least 18 years old.');
      if (!application?.media?.profilePhoto?.url) throw new Error('Profile photo is required.');
      if (!application?.media?.introVideo?.url) throw new Error('Short profile video is required.');
      if ((application?.verification?.evidence?.length || 0) < 5) throw new Error('Live verification evidence is required.');
      if (!application?.payoutSetup?.method) throw new Error('Select a future payout method.');
      transaction.set(appRef, { status: 'submitted', submittedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      transaction.set(userRef, {
        role: 'consumer',
        profilePic: application.media.profilePhoto.url,
        hostProfile: {
          bio: application.details?.bio || '',
          interests: application.details?.interests || [],
          gallery: (application.media?.gallery || []).map((item) => item.url),
          introVideoUrl: application.media.introVideo.url,
          introVideoPath: application.media.introVideo.path,
        },
        hostStatus: {
          hasApplied: true,
          verificationStatus: 'pending',
          availability: 'offline',
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { success: true };
    });
  },
};
