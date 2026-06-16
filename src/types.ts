export interface GeoLocation {
  lat: number;
  lng: number;
  label?: string;
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
  message: string;
  to: string;
  from: string;
  location?: GeoLocation;
  createdAt: number;
  box: Box;
  read: boolean;
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
