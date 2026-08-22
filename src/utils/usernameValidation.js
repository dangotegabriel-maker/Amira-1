export const USERNAME_LIMITS = Object.freeze({ min: 2, max: 40 });

// Keep policy centralized. Production can replace/extend this list without changing screens.
export const PROHIBITED_USERNAME_WORDS = Object.freeze([
  'admin',
  'support',
  'amira official',
]);

export const validateUsername = (input) => {
  const value = String(input || '').trim().replace(/\s+/g, ' ');
  if (!value) return { isValid: false, value, error: 'Please enter your display name.' };
  if (value.length < USERNAME_LIMITS.min) {
    return { isValid: false, value, error: `Display name must be at least ${USERNAME_LIMITS.min} characters.` };
  }
  if (value.length > USERNAME_LIMITS.max) {
    return { isValid: false, value, error: `Display name must be ${USERNAME_LIMITS.max} characters or fewer.` };
  }
  if (/\p{Cc}/u.test(value)) {
    return { isValid: false, value, error: 'Display name contains unsupported characters.' };
  }
  const lowerValue = value.toLocaleLowerCase();
  if (PROHIBITED_USERNAME_WORDS.some((word) => lowerValue.includes(word))) {
    return { isValid: false, value, error: 'Please choose a different display name.' };
  }
  return { isValid: true, value, error: '' };
};
