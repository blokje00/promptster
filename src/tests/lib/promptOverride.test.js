import { describe, it, expect } from 'vitest';
import { resolveOverride, bindOverride, parseStoredOverride } from '@/lib/promptOverride';

describe('promptOverride', () => {
  it('shows the override only while the live prompt is the one it was made for', () => {
    const override = bindOverride('improved', 'live v1');
    expect(resolveOverride(override, 'live v1')).toBe('improved');
    expect(resolveOverride(override, 'live v2 (task added)')).toBe('');
  });

  it('clears the override for empty text', () => {
    expect(bindOverride('', 'live')).toBeNull();
    expect(resolveOverride(null, 'live')).toBe('');
  });

  it('restores a stored override and discards legacy bare strings', () => {
    const stored = JSON.stringify(bindOverride('improved', 'live'));
    expect(parseStoredOverride(stored)).toEqual({ source: 'live', text: 'improved' });
    expect(parseStoredOverride('an old plain-string improved prompt')).toBeNull();
    expect(parseStoredOverride(null)).toBeNull();
    expect(parseStoredOverride(JSON.stringify({ text: '' , source: 'live' }))).toBeNull();
  });
});
