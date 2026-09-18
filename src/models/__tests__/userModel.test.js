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

  it('preserves legacy profile values without treating editable verification flags as approval', () => {
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
    expect(isApprovedHost(user)).toBe(false);
    expect(user.hostStatus.verificationStatus).toBe('not_started');
    expect(user.hostStatus.availability).toBe('online');
  });

  it('routes through only the first missing required profile field', () => {
    expect(getRequiredProfileStep({})).toBe('NameSetup');
    expect(getRequiredProfileStep({ username: 'Ada' })).toBe('BirthdaySetup');
    expect(getRequiredProfileStep({ ...completeUser, countryCode: '' })).toBe('CountrySetup');
    expect(getRequiredProfileStep(completeUser)).toBeNull();
  });

  it('does not require an account-type mutation for consumer access', () => {
    const { role, ...withoutRole } = completeUser;
    expect(getRequiredProfileStep(withoutRole)).toBeNull();
    expect(normalizeUser('consumer-1', withoutRole).role).toBe('consumer');
  });

  it('preserves approved and pending creator capability during normalization', () => {
    const approved = normalizeUser('approved-1', { ...completeUser, role: undefined, hostStatus: { hasApplied: true, isApproved: true, verificationStatus: 'approved' } });
    const pending = normalizeUser('pending-1', { ...completeUser, role: undefined, hostStatus: { hasApplied: true, isApproved: false, verificationStatus: 'pending' } });
    expect(approved.role).toBe('host');
    expect(approved.hostStatus.isApproved).toBe(true);
    expect(pending.role).toBe('consumer');
    expect(pending.hostStatus.verificationStatus).toBe('pending');
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


test.each(['draft','in_progress','submitted','pending','under_review'])('%s application never promotes old unapproved role',status=>{
 const raw={...completeUser,role:'host',hostStatus:{hasApplied:true,isApproved:false,verificationStatus:status}};
 const user=normalizeUser('applicant',raw);expect(user.role).toBe('consumer');expect(isApprovedHost(user)).toBe(false);
 expect(getLegacyMigrationPatch(raw,user).role).toBe('consumer');
});
test('trusted canonical approval takes precedence over stale consumer role and historical fields',()=>{
 const raw={...completeUser,hostStatus:{isApproved:true,hasApplied:true,verificationStatus:'approved'},wallet:{creditBalance:123}};
 const user=normalizeUser('approved',raw);expect(user.role).toBe('host');expect(isApprovedHost(user)).toBe(true);expect(user.wallet.creditBalance).toBe(123);
 expect(getLegacyMigrationPatch(raw,user).role).toBeUndefined();
});


test('ambiguous legacy Host approval needs trusted review and is never rewritten by bootstrap',()=>{
 const raw={role:'host',is_verified:true};const user=normalizeUser('legacy',raw),patch=getLegacyMigrationPatch(raw,user);
 expect(isApprovedHost(user)).toBe(false);expect(patch.role).toBeUndefined();expect(patch.hostStatus).toBeUndefined();
});
