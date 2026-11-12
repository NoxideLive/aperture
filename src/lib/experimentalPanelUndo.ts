/** Experimental per-panel undo stacks (client-only; last 50 per panel). */

export const EXPERIMENTAL_UNDO_MAX = 50;

export type ExperimentalUndoPanel = 'map' | 'signatures' | 'routes' | 'inspector';

export type ExperimentalUndoCommand = {
  label: string;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
};

type StackEntry = ExperimentalUndoCommand & { seq: number };

const stacks = new Map<ExperimentalUndoPanel, { past: StackEntry[]; future: StackEntry[] }>();

function getStack(panel: ExperimentalUndoPanel) {
  let s = stacks.get(panel);
  if (!s) {
    s = { past: [], future: [] };
    stacks.set(panel, s);
  }
  return s;
}

export function experimentalUndoClear(panel: ExperimentalUndoPanel): void {
  stacks.set(panel, { past: [], future: [] });
}

export function experimentalUndoResetAll(): void {
  stacks.clear();
}

const STORAGE_KEY = 'aperture:experimental:undo:v1';

type StoredStacks = Record<string, { labels: string[] }>;

function persistStacks(): void {
  if (typeof localStorage === 'undefined') return;
  const data: StoredStacks = {};
  for (const [panel, stack] of stacks.entries()) {
    data[panel] = { labels: stack.past.map((e) => e.label).slice(-EXPERIMENTAL_UNDO_MAX) };
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function experimentalUndoHydrateFromStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as StoredStacks;
    for (const panel of Object.keys(parsed) as ExperimentalUndoPanel[]) {
      if (!stacks.has(panel)) stacks.set(panel, { past: [], future: [] });
    }
  } catch {
    /* ignore */
  }
}

export function experimentalUndoPush(panel: ExperimentalUndoPanel, cmd: ExperimentalUndoCommand): void {
  const s = getStack(panel);
  s.future = [];
  s.past.push({ ...cmd, seq: Date.now() });
  while (s.past.length > EXPERIMENTAL_UNDO_MAX) s.past.shift();
  persistStacks();
}

export function experimentalUndoCan(panel: ExperimentalUndoPanel): { undo: boolean; redo: boolean } {
  const s = getStack(panel);
  return { undo: s.past.length > 0, redo: s.future.length > 0 };
}

export async function experimentalUndoApply(panel: ExperimentalUndoPanel): Promise<boolean> {
  const s = getStack(panel);
  const entry = s.past.pop();
  if (!entry) return false;
  await entry.undo();
  if (entry.redo) s.future.push(entry);
  return true;
}

export async function experimentalRedoApply(panel: ExperimentalUndoPanel): Promise<boolean> {
  const s = getStack(panel);
  const entry = s.future.pop();
  if (!entry?.redo) return false;
  await entry.redo();
  s.past.push(entry);
  while (s.past.length > EXPERIMENTAL_UNDO_MAX) s.past.shift();
  return true;
}

/** Which panel owns focus for Ctrl+Z — nearest `[data-panel-id]` ancestor. */
export function experimentalUndoPanelFromFocus(): ExperimentalUndoPanel | null {
  if (typeof document === 'undefined') return null;
  const el = document.activeElement?.closest?.('[data-panel-id]') as HTMLElement | null;
  const id = el?.getAttribute('data-panel-id');
  if (id === 'canvas') return 'map';
  if (id === 'signatures') return 'signatures';
  if (id === 'route') return 'routes';
  if (id === 'inspector' || id === 'intel') return 'inspector';
  return null;
}
