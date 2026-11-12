'use client';

import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from '@/components/ui/menu';
import { useExperimentalUi } from '@/lib/experimentalUi.client';
import type { ExperimentalUiMode } from '@/lib/experimentalUi';

const CHOICES: { value: ExperimentalUiMode; label: string }[] = [
  { value: 'aperture', label: 'Aperture' },
  { value: 'slate', label: 'Slate' },
  { value: 'light', label: 'Light' },
  { value: 'classic', label: 'Classic' },
];

export function ExperimentalThemeToggle() {
  const [mode, setMode] = useExperimentalUi();
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Map theme">
            <Palette className="size-4" />
          </Button>
        }
      />
      <MenuContent>
        {CHOICES.map((c) => (
          <MenuItem key={c.value} onClick={() => setMode(c.value)}>
            {mode === c.value ? `✓ ${c.label}` : c.label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
