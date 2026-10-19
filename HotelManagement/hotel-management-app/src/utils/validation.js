export const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || '').trim());

// Returns an error message, or an empty string when the password is acceptable
export const passwordProblem = (password) => {
  if (!password || password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return 'Include at least one letter and one number.';
  return '';
};

export const nameProblem = (name, label = 'full name') => {
  const v = String(name || '').trim();
  if (!v) return `Enter the ${label}.`;
  if (v.length < 2) return 'Use at least 2 characters.';
  if (v.length > 60) return 'Use 60 characters or fewer.';
  if (!/^\p{L}[\p{L}\s'.-]*$/u.test(v)) return 'Use letters only, with no numbers or symbols.';
  if (/(.)\1{3,}/u.test(v)) return 'That does not look like a real name.';
  return '';
};

// Philippine mobile numbers: 09XX XXX XXXX, 639XXXXXXXXX or +639XXXXXXXXX
export const phoneProblem = (phone) => {
  const v = String(phone || '').replace(/[\s-]/g, '');
  if (!v) return 'Enter a mobile number.';
  if (!/^(\+63|63|0)9\d{9}$/.test(v)) return 'Use a Philippine mobile number, like 0917 123 4567.';
  return '';
};

export const referenceProblem = (ref) =>
  /^[A-Za-z0-9]{8,20}$/.test(String(ref || '').trim())
    ? ''
    : 'Enter the payment reference (8 to 20 letters or numbers).';

export const lengthProblem = (value, min, max, label) => {
  const v = String(value || '').trim();
  if (v.length < min) return `${label} needs at least ${min} characters.`;
  if (v.length > max) return `${label} can have up to ${max} characters.`;
  return '';
};
