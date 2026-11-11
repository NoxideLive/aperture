'use client';

import { useCallback, useState } from 'react';
import {
  readExperimentalUiFromHtml,
  writeExperimentalUi,
  type ExperimentalUiMode,
} from '@/lib/experimentalUi';

/** Client hook: current mode from `<html>` plus a setter that updates cookie and attributes in place. */
export function useExperimentalUi(): [ExperimentalUiMode, (mode: ExperimentalUiMode) => void] {
  const [mode, setModeState] = useState<ExperimentalUiMode>(() => readExperimentalUiFromHtml());

  const setMode = useCallback((next: ExperimentalUiMode) => {
    writeExperimentalUi(next);
    setModeState(next);
  }, []);

  return [mode, setMode];
}
