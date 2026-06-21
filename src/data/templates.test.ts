import { describe, expect, it } from 'vitest';
import {
  CUSTOM_STAMP_ID,
  STAMPS,
  TEMPLATES,
  makeCustomStamp,
  resolveStamp,
  stampById,
  templateById,
} from './templates';

describe('templateById', () => {
  it('finds a known template', () => {
    expect(templateById('ocean').name).toBe('Meeresblau');
  });

  it('falls back to the first template for an unknown id', () => {
    expect(templateById('does-not-exist')).toBe(TEMPLATES[0]);
  });
});

describe('stampById', () => {
  it('finds a known stamp', () => {
    expect(stampById('globe').emoji).toBe('🌍');
  });

  it('falls back to the first stamp for an unknown id', () => {
    expect(stampById('nope')).toBe(STAMPS[0]);
  });
});

describe('makeCustomStamp', () => {
  it('keeps the chosen emoji and colour', () => {
    const s = makeCustomStamp('🐝', '#dcfce7');
    expect(s).toMatchObject({ id: CUSTOM_STAMP_ID, emoji: '🐝', bg: '#dcfce7' });
  });

  it('uses sensible fallbacks for empty input', () => {
    const s = makeCustomStamp('', '');
    expect(s.emoji).toBe('✨');
    expect(s.bg).toBeTruthy();
  });
});

describe('resolveStamp', () => {
  it('prefers a custom stamp when the id is custom', () => {
    const custom = makeCustomStamp('🦋', '#ede9fe');
    expect(resolveStamp(CUSTOM_STAMP_ID, custom)).toBe(custom);
  });

  it('ignores the custom stamp for a normal id', () => {
    const custom = makeCustomStamp('🦋', '#ede9fe');
    expect(resolveStamp('globe', custom).emoji).toBe('🌍');
  });

  it('falls back to a built-in stamp when no custom stamp is given', () => {
    expect(resolveStamp(CUSTOM_STAMP_ID, undefined)).toBe(STAMPS[0]);
  });
});
