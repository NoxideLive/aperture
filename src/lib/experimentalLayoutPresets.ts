import type { ExperimentalLayoutPreset, MapLayoutConfig } from '@/types';
import { EXPERIMENTAL_DEFAULT_MAP_LAYOUT, LAYOUT_CONFIG_VERSION } from '@/lib/map/layout/panels';

/** Experimental layout presets — shallow copies of the default with geometry tweaks. */
export function experimentalLayoutPreset(preset: ExperimentalLayoutPreset): MapLayoutConfig {
  const base = structuredClone(EXPERIMENTAL_DEFAULT_MAP_LAYOUT);
  base.version = LAYOUT_CONFIG_VERSION;
  base.layoutPreset = preset;
  const lg = base.layouts.lg.map((item) => ({ ...item }));
  const setH = (id: string, h: number) => {
    const row = lg.find((i) => i.i === id);
    if (row) row.h = h;
  };
  if (preset === 'scanning') {
    setH('signatures', 12);
    setH('inspector', 8);
    setH('canvas', 10);
  } else if (preset === 'combat') {
    setH('canvas', 16);
    setH('pilots', 8);
    setH('signatures', 4);
  } else if (preset === 'travel') {
    setH('route', 8);
    setH('canvas', 12);
  }
  base.layouts = { ...base.layouts, lg, md: lg, sm: base.layouts.sm };
  return base;
}

export function exportLayoutJson(config: MapLayoutConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importLayoutJson(raw: string): MapLayoutConfig {
  const parsed = JSON.parse(raw) as MapLayoutConfig;
  if (!parsed.layouts || !parsed.groups) throw new Error('Invalid layout');
  return parsed;
}
