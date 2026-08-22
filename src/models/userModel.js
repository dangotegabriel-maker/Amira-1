export const USER_ROLES = Object.freeze({
  CONSUMER: 'consumer',
  HOST: 'host',
});

export const HOST_AVAILABILITY = Object.freeze({
  OFFLINE: 'offline',
  ONLINE: 'online',
  BUSY: 'busy',
});

export const DEFAULT_HOST_STATUS = Object.freeze({
  hasApplied: false,
  isApproved: false,
  verificationStatus: 'not_started',
  availability: HOST_AVAILABILITY.OFFLINE,
});

export const DEFAULT_WALLET = Object.freeze({
  creditBalance: 0,
  currency: 'GHS',
});

export const DEFAULT_EARNINGS = Object.freeze({
  pending: 0,
  available: 0,
  currency: 'GHS',
});

export const DEFAULT_HOST_PROFILE = Object.freeze({
  bio: '', interests: [], gallery: [], introVideoUrl: '',
  introVideoPath: '', rateTier: 'STANDARD', videoRateCredits: 50,
});

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const getLegacyCreditBalance = (data = {}) => finiteNumber(
  data?.wallet?.creditBalance ??
  data?.wallet?.balance ??
  data?.coins ??
  data?.coin_balance ??
  0,
);

export const isApprovedHost = (user) => Boolean(
  user?.role === USER_ROLES.HOST && user?.hostStatus?.isApproved === true,
);

export const calculateAgeFromDob = (dob, now = new Date()) => {
  if (!dob) return null;
  const birthDate = dob instanceof Date ? dob : new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > now) return null;
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDifference = now.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return age;
};

export const getRequiredProfileStep = (user) => {
  if (!user) return null;
  if (!String(user.username || '').trim()) return 'NameSetup';
  const age = calculateAgeFromDob(user.dob);
  if (!user.dob || age === null || age < 18) return 'BirthdaySetup';
  if (!['female', 'male', 'other'].includes(user.gender)) return 'GenderSetup';
  if (!user.countryCode) return 'CountrySetup';
  if (![USER_ROLES.CONSUMER, USER_ROLES.HOST].includes(user.role)) return 'RoleSelection';
  return null;
};

export const isProfileActuallyComplete = (user) => Boolean(user && !getRequiredProfileStep(user));

export const normalizeUser = (uid, data = {}, authUser = null) => {
  const username = data.username || data.name || authUser?.displayName || '';
  const profilePic = data.profilePic || data.photoURL || data.photo || data.photos?.[0] || authUser?.photoURL || '';
  const legacyApproved = data.isApproved === true || data.is_verified === true;
  const legacyAvailability = data.isOnline === true ? HOST_AVAILABILITY.ONLINE : HOST_AVAILABILITY.OFFLINE;
  const role = [USER_ROLES.CONSUMER, USER_ROLES.HOST].includes(data.role) ? data.role : '';
  const walletCurrency = data?.wallet?.currency || data.currency || 'GHS';
  const earningsCurrency = data?.earnings?.currency || walletCurrency;
  const normalized = {
    ...data,
    uid,
    username,
    email: data.email || authUser?.email || '',
    phone: data.phone || authUser?.phoneNumber || '',
    profilePic,
    gender: ['female', 'male', 'other'].includes(data.gender) ? data.gender : '',
    dob: data.dob || '',
    age: calculateAgeFromDob(data.dob) ?? finiteNumber(data.age, 0),
    countryCode: data.countryCode || data.country_code || '',
    countryName: data.countryName || '',
    role,
    hostStatus: {
      ...DEFAULT_HOST_STATUS,
      ...(data.hostStatus || {}),
      hasApplied: data?.hostStatus?.hasApplied ?? (role === USER_ROLES.HOST),
      isApproved: data?.hostStatus?.isApproved ?? legacyApproved,
      verificationStatus: data?.hostStatus?.verificationStatus || (legacyApproved ? 'approved' : 'not_started'),
      availability: data?.hostStatus?.availability || legacyAvailability,
    },
    wallet: {
      ...DEFAULT_WALLET,
      creditBalance: getLegacyCreditBalance(data),
      currency: walletCurrency,
    },
    earnings: {
      ...DEFAULT_EARNINGS,
      ...(data.earnings || {}),
      pending: finiteNumber(data?.earnings?.pending, 0),
      available: finiteNumber(data?.earnings?.available, 0),
      currency: earningsCurrency,
    },
    hostProfile: {
      ...DEFAULT_HOST_PROFILE,
      ...(data.hostProfile || {}),
      bio: data?.hostProfile?.bio || data.bio || '',
      interests: data?.hostProfile?.interests || data.interests || [],
      gallery: data?.hostProfile?.gallery || data.photos || [],
      introVideoUrl: data?.hostProfile?.introVideoUrl || data.introVideoUrl || '',
      videoRateCredits: finiteNumber(data?.hostProfile?.videoRateCredits ?? data.call_price, 50),
    },
    settings: {
      doNotDisturb: false,
      ...(data.settings || {}),
    },
    createdAt: data.createdAt || data.created_at || null,
    updatedAt: data.updatedAt || null,
  };
  normalized.isProfileComplete = isProfileActuallyComplete(normalized);
  return normalized;
};

// Only canonical fields that can be derived without guessing are returned.
// Callers merge this patch; they never replace the whole legacy document.
export const getLegacyMigrationPatch = (data = {}, normalized) => {
  const patch = {};
  if (!data.username && normalized.username) patch.username = normalized.username;
  if (!data.profilePic && normalized.profilePic) patch.profilePic = normalized.profilePic;
  if (!data.countryCode && normalized.countryCode) patch.countryCode = normalized.countryCode;
  if (!data.countryName && normalized.countryName) patch.countryName = normalized.countryName;
  if (data?.wallet?.creditBalance == null) {
    patch['wallet.creditBalance'] = normalized.wallet.creditBalance;
  }
  if (!data?.wallet?.currency && normalized.wallet.currency) {
    patch['wallet.currency'] = normalized.wallet.currency;
  }
  if (!data.hostStatus) patch.hostStatus = normalized.hostStatus;
  if (!data.earnings) patch.earnings = normalized.earnings;
  if (!data.settings) patch.settings = normalized.settings;
  if (!data.createdAt && data.created_at) patch.createdAt = data.created_at;
  if (data.isProfileComplete !== normalized.isProfileComplete) {
    patch.isProfileComplete = normalized.isProfileComplete;
  }
  return patch;
};
