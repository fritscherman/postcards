import type { Postcard } from '../types';

export const FRIENDS = ['Mia', 'Jonas', 'Lena', 'Paul', 'Sophie', 'Ben'];

/** Build a small scenic SVG and return it as a data URL, so seed cards work offline. */
function scene(top: string, bottom: string, emoji: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='${top}'/><stop offset='1' stop-color='${bottom}'/>
    </linearGradient></defs>
    <rect width='600' height='400' fill='url(#g)'/>
    <text x='300' y='230' font-size='160' text-anchor='middle' dominant-baseline='middle'>${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const now = Date.now();
const day = 86_400_000;

export const SEED_POSTCARDS: Postcard[] = [
  {
    id: 'seed-paris',
    image: scene('#fde68a', '#fb7185', '🗼'),
    templateId: 'sunset',
    stampId: 'city',
    message: 'Bonjour aus Paris! Die Croissants sind ein Traum. Bald mehr! 🥐',
    to: 'Du',
    from: 'Mia',
    location: { lat: 48.8584, lng: 2.2945, label: 'Paris, Frankreich' },
    createdAt: now - 2 * day,
    box: 'inbox',
    read: false,
    pin: { x: 0.2, y: 0.25, rotation: -5 },
  },
  {
    id: 'seed-bali',
    image: scene('#a7f3d0', '#0ea5e9', '🏝️'),
    templateId: 'ocean',
    stampId: 'palm',
    message: 'Sonne, Strand und Surfen auf Bali. Wünschte du wärst hier!',
    to: 'Du',
    from: 'Jonas',
    location: { lat: -8.4095, lng: 115.1889, label: 'Bali, Indonesien' },
    createdAt: now - 5 * day,
    box: 'inbox',
    read: true,
    pin: { x: 0.55, y: 0.18, rotation: 4 },
  },
  {
    id: 'seed-alps',
    image: scene('#bae6fd', '#e2e8f0', '🏔️'),
    templateId: 'forest',
    stampId: 'mountain',
    message: 'Gipfelsturm geschafft! Die Aussicht hier oben ist unbeschreiblich.',
    to: 'Du',
    from: 'Lena',
    location: { lat: 45.8326, lng: 6.8652, label: 'Mont Blanc, Alpen' },
    createdAt: now - 9 * day,
    box: 'inbox',
    read: true,
    pin: { x: 0.8, y: 0.4, rotation: -3 },
  },
  {
    id: 'seed-tokyo',
    image: scene('#c4b5fd', '#f9a8d4', '🏯'),
    templateId: 'night',
    stampId: 'city',
    message: 'Tokio bei Nacht ist pure Magie. Karaoke war legendär! 🎤',
    to: 'Du',
    from: 'Sophie',
    location: { lat: 35.6762, lng: 139.6503, label: 'Tokio, Japan' },
    createdAt: now - 12 * day,
    box: 'inbox',
    read: true,
    pin: { x: 0.38, y: 0.55, rotation: 6 },
  },
];
