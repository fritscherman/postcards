import type { Stamp, Template } from '../types';

export const TEMPLATES: Template[] = [
  {
    id: 'classic',
    name: 'Klassisch',
    frame: 'linear-gradient(135deg, #fdfbf7, #f4ecd8)',
    accent: '#0e7490',
    font: "'Georgia', serif",
  },
  {
    id: 'sunset',
    name: 'Sonnenuntergang',
    frame: 'linear-gradient(135deg, #fff1eb, #ffd6a5)',
    accent: '#c2410c',
    font: "'Trebuchet MS', sans-serif",
  },
  {
    id: 'ocean',
    name: 'Meeresblau',
    frame: 'linear-gradient(135deg, #e0f7fa, #b2ebf2)',
    accent: '#0369a1',
    font: "'Trebuchet MS', sans-serif",
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    frame: 'linear-gradient(135deg, #ffffff, #f3f3f3)',
    accent: '#374151',
    font: "'Courier New', monospace",
  },
  {
    id: 'forest',
    name: 'Waldgrün',
    frame: 'linear-gradient(135deg, #ecfdf5, #c7f9cc)',
    accent: '#15803d',
    font: "'Georgia', serif",
  },
  {
    id: 'night',
    name: 'Nachtblau',
    frame: 'linear-gradient(135deg, #1e293b, #334155)',
    accent: '#fbbf24',
    font: "'Trebuchet MS', sans-serif",
  },
];

export const STAMPS: Stamp[] = [
  { id: 'heart', name: 'Herz', emoji: '❤️', bg: '#fee2e2' },
  { id: 'globe', name: 'Welt', emoji: '🌍', bg: '#dbeafe' },
  { id: 'mountain', name: 'Berge', emoji: '🏔️', bg: '#e0f2fe' },
  { id: 'palm', name: 'Strand', emoji: '🏖️', bg: '#fef9c3' },
  { id: 'city', name: 'Stadt', emoji: '🏙️', bg: '#ede9fe' },
  { id: 'star', name: 'Stern', emoji: '⭐', bg: '#fef3c7' },
];

export function templateById(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function stampById(id: string): Stamp {
  return STAMPS.find((s) => s.id === id) ?? STAMPS[0];
}
