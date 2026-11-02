// Login form rules (SRS AUTH-01, AUTH-04). The portal logs in with a username + password, so the
// app does the same until VECV confirms another approved method (mobile/email OTP or SSO).

export type LoginInput = { userId: string; password: string };
export type LoginField = keyof LoginInput;
export type LoginErrors = Partial<Record<LoginField, string>>;

export function validateLogin({ userId, password }: LoginInput): LoginErrors {
  const errors: LoginErrors = {};
  if (!userId.trim()) errors.userId = 'Enter your User ID.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

/** Credentials as sent to the backend: user ID trimmed, password untouched. */
export const normaliseLogin = ({ userId, password }: LoginInput): LoginInput => ({
  userId: userId.trim(),
  password,
});
