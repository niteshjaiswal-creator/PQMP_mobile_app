// In-app notification centre and push registration (spec §11, SRS 7.9, 13.9, 15).
import { request, requestEnvelope } from './client';
import type { AppNotification, PageMeta } from './types';

export async function listNotifications(query: { unreadOnly?: boolean; page?: number; pageSize?: number } = {}) {
  const { data, meta } = await requestEnvelope<AppNotification[], PageMeta & { unreadCount: number }>('/notifications', {
    query,
  });
  return { items: data, ...(meta ?? { page: 1, pageSize: data.length, totalItems: data.length, totalPages: 1, unreadCount: 0 }) };
}

export const markNotificationsRead = (input: { ids: string[] } | { all: true }) =>
  request<{ unreadCount: number }>('/notifications/read', { method: 'POST', body: input });

export const registerDevice = (input: { deviceId: string; platform: 'android' | 'ios'; pushToken: string; appVersion: string }) =>
  request<void>('/devices', { method: 'POST', body: input });

export const unregisterDevice = (deviceId: string) =>
  request<void>(`/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
