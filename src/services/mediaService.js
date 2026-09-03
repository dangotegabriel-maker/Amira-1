import { File } from 'expo-file-system';
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app, auth, firebaseConfig } from './firebaseService';

const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
const IMAGE_LIMIT = 8 * 1024 * 1024;
const VIDEO_LIMIT = 40 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MIME_BY_EXTENSION = Object.freeze({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' });
const PUBLIC_CATEGORIES = new Set(['profile', 'gallery', 'intro-video']);
const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__ === true;

const extensionFromAsset = (asset, kind) => {
  const source = String(asset?.fileName || asset?.uri || '').split('?')[0];
  const extension = source.includes('.') ? source.split('.').pop().toLowerCase() : '';
  return MIME_BY_EXTENSION[extension] ? extension : kind === 'video' ? 'mp4' : 'jpg';
};

const normalizeMimeType = (asset, kind) => {
  const supplied = String(asset?.mimeType || '').toLowerCase().replace('image/jpg', 'image/jpeg');
  return supplied || MIME_BY_EXTENSION[extensionFromAsset(asset, kind)] || (kind === 'video' ? 'video/mp4' : 'image/jpeg');
};

const validateCategory = (category) => {
  if (PUBLIC_CATEGORIES.has(category)) return category;
  if (/^verification\/[1-5]$/.test(category)) return category;
  throw new Error('This media destination is not permitted.');
};

const friendlyUploadError = (error) => {
  if (error?.message?.startsWith('Unsupported') || error?.message?.includes('too large') || error?.message?.includes('required') || error?.message?.includes('not permitted')) return error;
  const messages = {
    'storage/unauthenticated': 'Your session has expired. Please sign in again.',
    'storage/unauthorized': 'Firebase Storage denied this upload. Check that the project Storage rules have been deployed.',
    'storage/retry-limit-exceeded': 'The upload timed out. Check your connection and try again.',
    'storage/canceled': 'The upload was cancelled.',
    'storage/bucket-not-found': 'Firebase Storage is not configured for this project.',
    'storage/project-not-found': 'Firebase Storage is not configured for this project.',
    'storage/quota-exceeded': 'Media uploads are temporarily unavailable.',
  };
  const wrapped = new Error(messages[error?.code] || 'The media upload failed. Check your connection and try again.');
  wrapped.code = error?.code || 'media/upload-failed';
  return wrapped;
};

const diagnostic = (label, details) => { if (isDevelopment) console.log(`[MEDIA UPLOAD] ${label}`, details); };

const validateAsset = (asset, kind) => {
  if (!asset?.uri) throw new Error('No media selected.');
  const contentType = normalizeMimeType(asset, kind);
  const allowed = kind === 'video' ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const limitBytes = kind === 'video' ? VIDEO_LIMIT : IMAGE_LIMIT;
  if (!allowed.includes(contentType)) throw new Error(`Unsupported ${kind} format. Choose ${kind === 'video' ? 'MP4, MOV or WebM' : 'JPEG, PNG, WebP or HEIC'}.`);
  if (Number(asset.fileSize) > limitBytes) throw new Error(`${kind === 'video' ? 'Video' : 'Image'} is too large. Maximum size is ${kind === 'video' ? '40 MB' : '8 MB'}.`);
  return { contentType, limitBytes, extension: extensionFromAsset(asset, kind) };
};

export const mediaService = {
  uploadUserMedia: async ({ asset, category, kind = 'image', includeDownloadUrl = true }) => {
    if (process.env.EXPO_PUBLIC_ENABLE_MEDIA_UPLOADS !== 'true') throw new Error('Media uploads are temporarily unavailable during development.');
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) throw friendlyUploadError({ code: 'storage/unauthenticated' });
    const safeCategory = validateCategory(category);
    const { contentType, limitBytes, extension } = validateAsset(asset, kind);
    const objectPath = `users/${currentUser.uid}/${safeCategory}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const isPrivateEvidence = safeCategory.startsWith('verification/');
    diagnostic('prepared', { authenticated: true, uid: currentUser.uid, uri: isPrivateEvidence ? '[private verification URI omitted]' : asset.uri, uriScheme: String(asset.uri).split(':')[0], mimeType: contentType, pickerFileSize: asset.fileSize || null, path: objectPath, bucket: firebaseConfig.storageBucket });
    try {
      await currentUser.getIdToken();
      const file = new File(asset.uri);
      const bytes = await file.bytes();
      if (!bytes?.byteLength) throw new Error('The selected media file could not be read. Please select it again.');
      if (bytes.byteLength > limitBytes) throw new Error(`${kind === 'video' ? 'Video' : 'Image'} is too large. Maximum size is ${kind === 'video' ? '40 MB' : '8 MB'}.`);
      diagnostic('payload-ready', { byteLength: bytes.byteLength, path: objectPath });
      const objectRef = ref(storage, objectPath);
      await uploadBytes(objectRef, bytes, { contentType, customMetadata: { ownerUid: currentUser.uid, mediaCategory: safeCategory } });
      const result = { ...(includeDownloadUrl ? { url: await getDownloadURL(objectRef) } : {}), path: objectPath, contentType, size: bytes.byteLength };
      diagnostic('complete', { path: objectPath, contentType, size: bytes.byteLength, hasDownloadUrl: Boolean(result.url) });
      return result;
    } catch (error) {
      diagnostic('failed', { code: error?.code || null, message: error?.message || null, serverResponse: error?.customData?.serverResponse || error?.serverResponse || null, path: objectPath });
      throw friendlyUploadError(error);
    }
  },
  deleteOwnedMedia: async (path) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw friendlyUploadError({ code: 'storage/unauthenticated' });
    if (!String(path || '').startsWith(`users/${uid}/`)) throw new Error('This media file cannot be removed.');
    await deleteObject(ref(storage, path));
  },
};
