import { describe, expect, it, beforeEach } from 'vitest';

describe('experimentalAlertPrefs', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-ui', 'experimental');
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.clear();
  });

  it('defaults rally alerts off', async () => {
    const mod = await import('@/lib/experimentalAlertPrefs');
    expect(mod.readExperimentalRallyToast()).toBe(false);
    expect(mod.readExperimentalRallyDesktopNotification()).toBe(false);
  });

  it('persists rally toast when enabled', async () => {
    const mod = await import('@/lib/experimentalAlertPrefs');
    mod.writeExperimentalRallyToast(true);
    expect(mod.readExperimentalRallyToast()).toBe(true);
  });
});
