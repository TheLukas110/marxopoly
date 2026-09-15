import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'marxopoly.turn-notifications.v1';
const listeners = new Set<() => void>();

function readStoredPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

let enabled = readStoredPreference();

function publish(next: boolean): void {
  if (enabled === next) return;
  enabled = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, 'on');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The in-memory preference still works when storage is unavailable.
  }
  for (const listener of listeners) listener();
}

export function notificationCapability(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') return 'unsupported';
  return Notification.permission;
}

export function getTurnNotificationsEnabled(): boolean {
  return enabled && notificationCapability() === 'granted';
}

export function disableTurnNotifications(): void {
  publish(false);
}

/** Must only be called directly from a user-initiated control. */
export async function enableTurnNotifications(): Promise<NotificationPermission | 'unsupported'> {
  const capability = notificationCapability();
  if (capability === 'unsupported') {
    publish(false);
    return capability;
  }
  try {
    const permission = capability === 'default' ? await Notification.requestPermission() : capability;
    publish(permission === 'granted');
    return permission;
  } catch {
    publish(false);
    return 'denied';
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useTurnNotificationsEnabled(): boolean {
  return useSyncExternalStore(subscribe, getTurnNotificationsEnabled, () => false);
}
