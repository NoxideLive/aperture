import { describe, expect, it } from 'vitest';
import {
  isSystemSoundMuted,
  setSystemMuteAll,
  toggleSystemMuteEvent,
  parseExperimentalSoundLayoutSettings,
} from '@/lib/experimentalSoundLayout';
import { DEFAULT_MAP_LAYOUT } from '@/lib/map/layout/panels';
import type { MapLayoutConfig } from '@/types';

const layout: MapLayoutConfig = {
  ...DEFAULT_MAP_LAYOUT,
  panelSettings: {
    sound: {
      followSelectedPilot: true,
      byMap: {
        '12': {
          sysA: { all: true },
          sysB: { events: { killInSystem: true } },
        },
      },
    },
  },
};

describe('experimentalSoundLayout', () => {
  it('parses panelSettings.sound', () => {
    const parsed = parseExperimentalSoundLayoutSettings(layout);
    expect(parsed.followSelectedPilot).toBe(true);
    expect(isSystemSoundMuted(parsed.byMap!['12'], 'sysA', 'pilotArrived')).toBe(true);
    expect(isSystemSoundMuted(parsed.byMap!['12'], 'sysB', 'killInSystem')).toBe(true);
    expect(isSystemSoundMuted(parsed.byMap!['12'], 'sysB', 'pilotArrived')).toBe(false);
  });

  it('setSystemMuteAll and toggleSystemMuteEvent', () => {
    let settings = parseExperimentalSoundLayoutSettings(DEFAULT_MAP_LAYOUT);
    settings = setSystemMuteAll(settings, '1', 'x', true);
    expect(isSystemSoundMuted(settings.byMap!['1'], 'x', 'rallySet')).toBe(true);
    settings = setSystemMuteAll(settings, '1', 'x', false);
    expect(settings.byMap?.['1']?.x).toBeUndefined();
    settings = toggleSystemMuteEvent(settings, '1', 'y', 'systemPinged', true);
    expect(isSystemSoundMuted(settings.byMap!['1'], 'y', 'systemPinged')).toBe(true);
  });
});
