import { validateUsername } from '../usernameValidation';

describe('validateUsername', () => {
  it('trims and normalizes whitespace', () => {
    expect(validateUsername('  Amira   User  ')).toEqual({
      isValid: true,
      value: 'Amira User',
      error: '',
    });
  });

  it('rejects empty, short, control-character, and prohibited names', () => {
    expect(validateUsername('   ').isValid).toBe(false);
    expect(validateUsername('A').isValid).toBe(false);
    expect(validateUsername('Ada\u0000Lovelace').isValid).toBe(false);
    expect(validateUsername('Amira Support').isValid).toBe(false);
  });
});
