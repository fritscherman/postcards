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
  {
    id: 'rose',
    name: 'Rosé',
    frame: 'linear-gradient(135deg, #fff1f5, #fbcfe8)',
    accent: '#be185d',
    font: "'Georgia', serif",
  },
  {
    id: 'mint',
    name: 'Mint',
    frame: 'linear-gradient(135deg, #f0fdfa, #99f6e4)',
    accent: '#0f766e',
    font: "'Trebuchet MS', sans-serif",
  },
  {
    id: 'kraft',
    name: 'Kraftpapier',
    frame: 'linear-gradient(135deg, #e7d3b3, #d8bd92)',
    accent: '#7c4a14',
    font: "'Courier New', monospace",
  },
];

export interface PhotoFilter {
  id: string;
  name: string;
  css: string;
}

export const FILTERS: PhotoFilter[] = [
  { id: 'none', name: 'Original', css: 'none' },
  { id: 'warm', name: 'Warm', css: 'saturate(1.3) sepia(0.25) contrast(1.05)' },
  { id: 'cool', name: 'Kühl', css: 'saturate(1.1) hue-rotate(-12deg) brightness(1.05)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.55) contrast(0.95) brightness(1.05) saturate(0.9)' },
  { id: 'bw', name: 'S/W', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vivid', name: 'Knallig', css: 'saturate(1.6) contrast(1.1)' },
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
