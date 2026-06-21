import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('takes first + last initial of a full name', () => {
    expect(initials('Benjamin Fritsch')).toBe('BF');
  });

  it('uppercases a single name to one letter', () => {
    expect(initials('anna')).toBe('A');
  });

  it('ignores extra whitespace between words', () => {
    expect(initials('  marie   curie  ')).toBe('MC');
  });

  it('uses the first and last of three or more words', () => {
    expect(initials('Jean Luc Picard')).toBe('JP');
  });

  it('falls back to ? for an empty name', () => {
    expect(initials('   ')).toBe('?');
  });
});
