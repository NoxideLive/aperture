import { describe, expect, it, beforeEach } from 'vitest';

const STORAGE = {
  keep: 'aperture:experimental:keep-map-selection',
  pointer: 'aperture:experimental:pointer-cursor',
  paste: 'aperture:experimental:paste-preview',
};

describe('experimentalQolPrefs', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-ui', 'experimental');
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.clear();
  });

  it('defaults pointer cursor on when experimental', async () => {
    const { readExperimentalPointerCursor } = await import('@/lib/experimentalQolPrefs');
    expect(readExperimentalPointerCursor()).toBe(true);
  });

  it('persists keep selection', async () => {
    const { readKeepMapSelection, writeKeepMapSelection } = await import('@/lib/experimentalQolPrefs');
    expect(readKeepMapSelection()).toBe(false);
    writeKeepMapSelection(true);
    expect(readKeepMapSelection()).toBe(true);
    expect(localStorage.getItem(STORAGE.keep)).toBe('1');
  });

  it('ignores prefs when experimental off', async () => {
    localStorage.setItem(STORAGE.keep, '1');
    document.documentElement.removeAttribute('data-ui');
    const { readKeepMapSelection } = await import('@/lib/experimentalQolPrefs');
    expect(readKeepMapSelection()).toBe(false);
  });
});
