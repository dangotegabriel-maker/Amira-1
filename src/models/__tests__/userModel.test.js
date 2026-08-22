import {
  getLegacyMigrationPatch,
  getRequiredProfileStep,
  isApprovedHost,
  normalizeUser,
} from '../userModel';

const completeUser = {
  username: 'Amira User',
  dob: '1990-01-01',
  gender: 'other',
  countryCode: 'GH',
  role: 'consumer',
};

describe('canonical user model', () => {
  it('preserves a canonical zero balance instead of falling back to legacy coins', () => {
    const user = normalizeUser('uid-1', { wallet: { creditBalance: 0 }, coins: 900 });
    expect(user.wallet.creditBalance).toBe(0);
  });

  it('maps legacy profile and balance fields without losing their values', () => {
    const user = normalizeUser('uid-1', {
      name: 'Legacy Name',
      photo: 'https://example.com/photo.jpg',
      coin_balance: 275,
      country_code: 'GH',
      role: 'host',
      is_verified: true,
      isOnline: true,
    });
    expect(user.username).toBe('Legacy Name');
    expect(user.profilePic).toBe('https://example.com/photo.jpg');
    expect(user.wallet.creditBalance).toBe(275);
    expect(user.countryCode).toBe('GH');
    expect(isApprovedHost(user)).toBe(true);
    expect(user.hostStatus.verificationStatus).toBe('approved');
    expect(user.hostStatus.availability).toBe('online');
  });

  it('routes through only the first missing required profile field', () => {
    expect(getRequiredProfileStep({})).toBe('NameSetup');
    expect(getRequiredProfileStep({ username: 'Ada' })).toBe('BirthdaySetup');
    expect(getRequiredProfileStep({ ...completeUser, countryCode: '' })).toBe('CountrySetup');
    expect(getRequiredProfileStep(completeUser)).toBeNull();
  });

  it('does not trust a legacy completion boolean when DOB is missing', () => {
    const user = normalizeUser('uid-1', { ...completeUser, dob: '', isProfileComplete: true });
    expect(user.isProfileComplete).toBe(false);
    expect(getRequiredProfileStep(user)).toBe('BirthdaySetup');
  });

  it('creates a narrow migration patch with the preserved legacy balance', () => {
    const raw = { coins: 125, name: 'Legacy Name' };
    const normalized = normalizeUser('uid-1', raw);
    const patch = getLegacyMigrationPatch(raw, normalized);
    expect(patch.username).toBe('Legacy Name');
    expect(patch['wallet.creditBalance']).toBe(125);
    expect(patch.coins).toBeUndefined();
  });
});
