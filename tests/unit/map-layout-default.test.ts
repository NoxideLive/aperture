// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAP_LAYOUT,
  EXPERIMENTAL_DEFAULT_MAP_LAYOUT,
  defaultMapLayoutForUi,
} from '@/lib/map/layout/panels';

describe('defaultMapLayoutForUi', () => {
  it('returns the standard default when experimental is off', () => {
    expect(defaultMapLayoutForUi(false)).toBe(DEFAULT_MAP_LAYOUT);
  });

  it('returns the experimental default when experimental is on', () => {
    expect(defaultMapLayoutForUi(true)).toBe(EXPERIMENTAL_DEFAULT_MAP_LAYOUT);
  });

  it('groups the right column workbench while keeping the legacy default untouched', () => {
    const workbench = EXPERIMENTAL_DEFAULT_MAP_LAYOUT.groups.lg.find((g) => g.id === 'inspector');
    expect(workbench?.members).toContain('systemGraph');
    expect(workbench?.members).toContain('tags');
    expect(EXPERIMENTAL_DEFAULT_MAP_LAYOUT.layouts.lg.find((i) => i.i === 'signatures')?.h).toBe(8);
    expect(DEFAULT_MAP_LAYOUT.layouts.lg.find((i) => i.i === 'signatures')?.h).toBe(6);
  });
});
