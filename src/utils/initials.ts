/** First letters of the first and last word, e.g. "Benjamin Fritsch" -> "BF". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = (parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '');
  return letters.toUpperCase();
}
