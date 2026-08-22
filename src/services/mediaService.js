import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app, auth } from './firebaseService';

const storage = getStorage(app);
const IMAGE_LIMIT = 8 * 1024 * 1024;
const VIDEO_LIMIT = 40 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const safeExtension = (asset, kind) => {
  const fromName = String(asset?.fileName || '').split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return kind === 'video' ? 'mp4' : 'jpg';
};

const validateAsset = (asset, kind) => {
  if (!asset?.uri) throw new Error('No media selected.');
  const allowed = kind === 'video' ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const limitBytes = kind === 'video' ? VIDEO_LIMIT : IMAGE_LIMIT;
  if (asset.mimeType && !allowed.includes(asset.mimeType)) throw new Error(`Unsupported ${kind} type.`);
  if (asset.fileSize && asset.fileSize > limitBytes) throw new Error(`${kind === 'video' ? 'Video' : 'Image'} is too large.`);
  return { allowed, limitBytes };
};

export const mediaService = {
  uploadUserMedia: async ({ asset, category, kind = 'image', includeDownloadUrl = true }) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required.');
    const { limitBytes } = validateAsset(asset, kind);
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    if (blob.size > limitBytes) throw new Error(`${kind === 'video' ? 'Video' : 'Image'} is too large.`);
    const extension = safeExtension(asset, kind);
    const objectRef = ref(storage, `users/${uid}/${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
    await uploadBytes(objectRef, blob, { contentType: asset.mimeType || blob.type || undefined });
    return {
      ...(includeDownloadUrl ? { url: await getDownloadURL(objectRef) } : {}),
      path: objectRef.fullPath,
      contentType: asset.mimeType || blob.type || '',
    };
  },
};
