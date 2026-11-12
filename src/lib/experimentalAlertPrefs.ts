'use client';

import { readExperimentalUiFromHtml, isExperimentalUiActive } from '@/lib/experimentalUi';

const RALLY_TOAST_KEY = 'aperture:experimental:alert-rally-toast';
const RALLY_DESKTOP_KEY = 'aperture:experimental:alert-rally-desktop';
const COMBAT_SOUND_KEY = 'aperture:experimental:alert-combat-sound';
const COMBAT_DESKTOP_KEY = 'aperture:experimental:alert-combat-desktop';

export const EXPERIMENTAL_ALERT_EVT = 'aperture:experimental-alert-prefs';

function experimentalOnly<T>(read: () => T, fallback: T): T {
  if (!isExperimentalUiActive(readExperimentalUiFromHtml())) return fallback;
  return read();
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(EXPERIMENTAL_ALERT_EVT));
}

export function readExperimentalRallyToast(): boolean {
  return experimentalOnly(() => readFlag(RALLY_TOAST_KEY), false);
}

export function writeExperimentalRallyToast(on: boolean): void {
  if (!isExperimentalUiActive(readExperimentalUiFromHtml())) return;
  writeFlag(RALLY_TOAST_KEY, on);
}

export function readExperimentalRallyDesktopNotification(): boolean {
  return experimentalOnly(() => readFlag(RALLY_DESKTOP_KEY), false);
}

export function writeExperimentalRallyDesktopNotification(on: boolean): void {
  if (!isExperimentalUiActive(readExperimentalUiFromHtml())) return;
  writeFlag(RALLY_DESKTOP_KEY, on);
}

/** Reserved for combat alert chime (experimental build); off until wired. */
export function readExperimentalCombatAlertSound(): boolean {
  return experimentalOnly(() => readFlag(COMBAT_SOUND_KEY), false);
}

export function writeExperimentalCombatAlertSound(on: boolean): void {
  if (!isExperimentalUiActive(readExperimentalUiFromHtml())) return;
  writeFlag(COMBAT_SOUND_KEY, on);
}

/** Reserved for combat desktop notification (experimental build); off until wired. */
export function readExperimentalCombatAlertDesktop(): boolean {
  return experimentalOnly(() => readFlag(COMBAT_DESKTOP_KEY), false);
}

export function writeExperimentalCombatAlertDesktop(on: boolean): void {
  if (!isExperimentalUiActive(readExperimentalUiFromHtml())) return;
  writeFlag(COMBAT_DESKTOP_KEY, on);
}
