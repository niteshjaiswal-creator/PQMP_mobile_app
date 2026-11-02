// Authentication (spec §4, SRS 7.1, 8.1, AUTH-01…04). The portal only has a cookie form login,
// so these target the token API the mobile backend exposes.
import { Platform } from 'react-native';
import { ApiError, request, userMessageFor } from './client';
import { normaliseLogin, type LoginInput } from '../domain/login-validation';
import type { LoginResult, Me } from './types';

export type Session = LoginResult;

// For a login request, 401/403 mean bad credentials / blocked account, not an expired session.
const LOGIN_MESSAGE: Partial<Record<ApiError['kind'], string>> = {
  unauthorized: 'The User ID or password is incorrect. Please try again.',
  validation: 'The User ID or password is incorrect. Please try again.',
  forbidden: 'Your account is inactive or not authorised for this app. Please contact your VECV administrator.',
};

export type DeviceInfo = { id: string; appVersion: string };

export async function login(input: LoginInput, device: DeviceInfo = { id: 'unknown', appVersion: '1.0.0' }): Promise<Session> {
  const { userId, password } = normaliseLogin(input);
  try {
    return await request<LoginResult>('/auth/login', {
      method: 'POST',
      body: { username: userId, password, device: { ...device, platform: Platform.OS } },
    });
  } catch (err) {
    const message = err instanceof ApiError ? LOGIN_MESSAGE[err.kind] : undefined;
    throw new LoginError(message ?? userMessageFor(err), err);
  }
}

export class LoginError extends Error {
  constructor(readonly userMessage: string, cause?: unknown) {
    super('Login failed', { cause });
  }
}

export const refreshSession = (refreshToken: string) =>
  request<Omit<LoginResult, 'user'>>('/auth/refresh', { method: 'POST', body: { refreshToken } });

export const logout = (refreshToken: string) =>
  request<void>('/auth/logout', { method: 'POST', body: { refreshToken } });

export const getMe = () => request<Me>('/me');
