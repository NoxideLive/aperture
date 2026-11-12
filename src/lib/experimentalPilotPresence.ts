/** Standing tone for experimental pilot badges (tracked presence defaults friendly). */
export type PilotStandingTone = 'friendly' | 'hostile' | 'mixed';

/** Map-access pilots on the chain are friendly until hostility is modelled. */
export function pilotCountStandingTone(pilotCount: number): PilotStandingTone {
  if (pilotCount <= 0) return 'friendly';
  return 'friendly';
}

export function pilotBadgeToneClasses(tone: PilotStandingTone): string {
  switch (tone) {
    case 'friendly':
      return 'text-sky-300 ring-sky-500/50';
    case 'hostile':
      return 'text-red-400 ring-red-500/50';
    case 'mixed':
      return 'text-amber-300 ring-amber-500/50';
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function pilotNameToneClass(tone: PilotStandingTone): string {
  switch (tone) {
    case 'friendly':
      return 'text-sky-200';
    case 'hostile':
      return 'text-red-300';
    case 'mixed':
      return 'text-amber-200';
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}
