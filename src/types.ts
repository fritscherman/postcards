export interface GeoLocation {
  lat: number;
  lng: number;
  label?: string;
  /** where the location came from, for a subtle hint on the card back */
  source?: 'exif' | 'manual';
}

export type Orientation = 'landscape' | 'portrait';

/** How the photo is framed inside the postcard window. */
export interface Crop {
  /** zoom factor, >= 1 */
  zoom: number;
  /** object-position in percent, 0..100 */
  x: number;
  y: number;
}

export interface PinPosition {
  /** relative position on the pinboard, 0..1 */
  x: number;
  y: number;
  /** rotation in degrees, gives the board a casual look */
  rotation: number;
}

export type Box = 'inbox' | 'outbox';

export interface Postcard {
  id: string;
  /** data URL of the chosen / captured photo */
  image: string;
  templateId: string;
  stampId: string;
  /** CSS filter applied to the photo, e.g. "grayscale(1)"; defaults to none */
  filter?: string;
  /** photo framing; defaults to landscape / centred when absent */
  orientation?: Orientation;
  crop?: Crop;
  message: string;
  to: string;
  from: string;
  /** recipient / sender email — only used in online (backend) mode */
  toEmail?: string;
  fromEmail?: string;
  location?: GeoLocation;
  createdAt: number;
  box: Box;
  read: boolean;
  /** recipient marked this received card as a favourite */
  liked?: boolean;
  /** the user pinned this card to their pinboard */
  pinned?: boolean;
  pin: PinPosition;
}

export interface Template {
  id: string;
  name: string;
  /** CSS gradient or color used for the postcard frame / back */
  frame: string;
  accent: string;
  font: string;
}

export interface Stamp {
  id: string;
  name: string;
  emoji: string;
  bg: string;
}
