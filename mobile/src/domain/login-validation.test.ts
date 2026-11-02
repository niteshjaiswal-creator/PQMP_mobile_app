import { normaliseLogin, validateLogin } from './login-validation';

describe('validateLogin', () => {
  it('requires both fields', () => {
    expect(validateLogin({ userId: '', password: '' })).toEqual({
      userId: 'Enter your User ID.',
      password: 'Enter your password.',
    });
  });

  it('treats a whitespace-only user ID as empty', () => {
    expect(validateLogin({ userId: '   ', password: 'x' })).toEqual({ userId: 'Enter your User ID.' });
  });

  it('accepts a password made of spaces, since passwords are not trimmed', () => {
    expect(validateLogin({ userId: 'D1234', password: '  ' })).toEqual({});
  });
});

describe('normaliseLogin', () => {
  it('trims the user ID but never the password', () => {
    expect(normaliseLogin({ userId: ' D1234 ', password: ' p ' })).toEqual({ userId: 'D1234', password: ' p ' });
  });
});
