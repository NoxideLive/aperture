'use client';

import { useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { MapSystemNode } from '@/lib/map/loadMap';

/** Experimental: fuzzy-filter on-map systems and pan the canvas to the pick. */
export function MapJumpToSystemDialog({
  open,
  onOpenChange,
  systems,
  onJump,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systems: readonly MapSystemNode[];
  onJump: (mapSystemId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...systems].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.alias?.toLowerCase().includes(q) ?? false) ||
        (s.tag?.toLowerCase().includes(q) ?? false),
    );
  }, [query, systems]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setQuery('');
        setActiveIndex(0);
      }
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const pick = useCallback(
    (id: string) => {
      onJump(id);
      handleOpenChange(false);
    },
    [handleOpenChange, onJump],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Jump to system</DialogTitle>
          <DialogDescription>Search on-map systems and center the canvas.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Name, alias, or tag"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (results.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % results.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + results.length) % results.length);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const row = results[activeIndex];
                if (row) pick(row.id);
              }
            }}
          />
        </div>
        <ul className="max-h-64 overflow-y-auto rounded-md border text-sm">
          {results.map((s, idx) => (
            <li key={s.id}>
              <button
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted ${
                  idx === activeIndex ? 'bg-muted' : ''
                }`}
                onClick={() => pick(s.id)}
              >
                <span>{s.alias ?? s.name}</span>
                <span className="text-muted-foreground">{s.security}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
