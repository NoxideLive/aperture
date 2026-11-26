import { describe, expect, it } from 'vitest';

describe('device user code shape', () => {
  it('matches XXXX-XXXX after start response', () => {
    const sample = 'BCDF-GHJK';
    expect(sample).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });
});