import { describe, expect, it } from 'vitest';
import {
  formatUserCodeForDisplay,
  normalizeUserCode,
} from '@/lib/userApi/device';

describe('device user code formatting', () => {
  it('strips spaces and hyphens for lookup', () => {
    expect(normalizeUserCode('bc df-ghjk')).toBe('BCDFGHJK');
    expect(normalizeUserCode('ABCD-EFGH')).toBe('ABCDEFGH');
  });

  it('formats stored codes as XXXX-XXXX', () => {
    expect(formatUserCodeForDisplay('ABCDEFGH')).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(formatUserCodeForDisplay('ABCDEFGH')).toBe('ABCD-EFGH');
  });
});