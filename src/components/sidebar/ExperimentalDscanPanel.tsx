'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeExperimentalPanelAdd } from '@/lib/experimentalPanelActionBus';
import { parseDscanPaste } from '@/lib/map/dscanParser';
import type { MapSystemNode } from '@/types';
import { Button } from '@/components/ui/button';

export function ExperimentalDscanPanel({
  system,
  onAttach,
}: {
  system: MapSystemNode | undefined;
  onAttach?: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [prev, setPrev] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(
    () =>
      subscribeExperimentalPanelAdd('dscan', () => {
        textareaRef.current?.focus();
      }),
    [],
  );
  const rows = useMemo(() => (text.trim() ? parseDscanPaste(text) : []), [text]);
  const diff = useMemo(() => {
    if (!prev.trim() || !text.trim()) return new Set<string>();
    const p = new Set(parseDscanPaste(prev).map((r) => r.name));
    return new Set(rows.filter((r) => !p.has(r.name)).map((r) => r.name));
  }, [prev, text, rows]);

  return (
    <div className="flex flex-col gap-2 p-2 text-xs">
      <textarea
        ref={textareaRef}
        rows={6}
        placeholder="Paste D-Scan…"
        value={text}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
        className="min-h-[6rem] w-full rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => setPrev(text)}>
          Save snapshot
        </Button>
        {system && onAttach ? (
          <Button type="button" size="sm" onClick={() => onAttach(text)}>
            Attach to {system.alias ?? system.name}
          </Button>
        ) : null}
      </div>
      <ul className="max-h-48 overflow-auto divide-y">
        {rows.map((r) => (
          <li
            key={`${r.name}-${r.typeName}`}
            className={diff.has(r.name) ? 'bg-amber-500/10 px-1 py-0.5' : 'px-1 py-0.5'}
          >
            {r.name} <span className="text-muted-foreground">{r.typeName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
