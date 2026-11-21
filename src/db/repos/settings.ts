import { db } from '../db';
import { DEFAULT_SETTINGS } from '../seed';
import type { Settings } from '../types';

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('settings')) ?? DEFAULT_SETTINGS;
}

export async function updateSettings(
  patch: Partial<Omit<Settings, 'id'>>,
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = (await db.settings.get('settings')) ?? DEFAULT_SETTINGS;
    await db.settings.put({ ...current, ...patch, id: 'settings' });
  });
}

/** SPEC 4.8: the banner nags when there is data and no backup for a week. */
export const BACKUP_REMINDER_DAYS = 7;

export function backupIsStale(settings: Settings, now = Date.now()): boolean {
  if (settings.lastBackupAt === undefined) return true;
  const days = (now - settings.lastBackupAt) / (1000 * 60 * 60 * 24);
  return days >= BACKUP_REMINDER_DAYS;
}

/**
 * Asks iPadOS to keep this data. Feature-detected because it is not available
 * everywhere, and it can legitimately resolve false. It is a request, never a
 * guarantee, which is why the app also nags about backups: the real protection
 * is installing to the Home Screen (SPEC 4.1).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageIsPersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/** True when running from the Home Screen rather than a Safari tab. */
export function isInstalled(): boolean {
  const standalone = (navigator as { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia('(display-mode: standalone)').matches;
}
