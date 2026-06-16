import type { GeoLocation } from '../types';

/**
 * Minimal EXIF GPS reader for JPEG files — no dependency.
 * Returns the photo's location if it carries GPS tags, otherwise null.
 * We only read the APP1/EXIF segment and walk the TIFF + GPS IFDs.
 */
export async function readExifLocation(file: File): Promise<GeoLocation | null> {
  if (!/jpe?g/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return null;
  try {
    // The EXIF header sits near the start; 256 KB is plenty.
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return null; // not a JPEG

    // Find the APP1 (0xFFE1) marker that starts with "Exif\0\0".
    let offset = 2;
    let tiffStart = -1;
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset);
      const size = view.getUint16(offset + 2);
      if (marker === 0xffe1) {
        const exifStart = offset + 4;
        if (view.getUint32(exifStart) === 0x45786966) {
          tiffStart = exifStart + 6; // skip "Exif\0\0"
          break;
        }
      }
      if ((marker & 0xff00) !== 0xff00 || size < 2) break;
      offset += 2 + size;
    }
    if (tiffStart < 0) return null;

    // TIFF header: byte order + IFD0 offset.
    const little = view.getUint16(tiffStart) === 0x4949;
    const u16 = (o: number) => view.getUint16(o, little);
    const u32 = (o: number) => view.getUint32(o, little);

    const ifd0 = tiffStart + u32(tiffStart + 4);
    const gpsTag = findTag(ifd0, 0x8825, u16, u32);
    if (gpsTag == null) return null;

    const gpsIfd = tiffStart + gpsTag;
    const count = u16(gpsIfd);
    let latRef = 'N';
    let lonRef = 'E';
    let lat: number[] | null = null;
    let lon: number[] | null = null;

    for (let i = 0; i < count; i++) {
      const entry = gpsIfd + 2 + i * 12;
      const tag = u16(entry);
      const valOffset = entry + 8;
      if (tag === 1) latRef = String.fromCharCode(view.getUint8(valOffset));
      else if (tag === 3) lonRef = String.fromCharCode(view.getUint8(valOffset));
      else if (tag === 2) lat = readRationals(tiffStart + u32(valOffset), 3, u32);
      else if (tag === 4) lon = readRationals(tiffStart + u32(valOffset), 3, u32);
    }
    if (!lat || !lon) return null;

    const latDeg = dms(lat) * (latRef === 'S' ? -1 : 1);
    const lonDeg = dms(lon) * (lonRef === 'W' ? -1 : 1);
    if (!isFinite(latDeg) || !isFinite(lonDeg)) return null;

    return {
      lat: latDeg,
      lng: lonDeg,
      label: `${latDeg.toFixed(3)}, ${lonDeg.toFixed(3)}`,
      source: 'exif',
    };
  } catch {
    return null;
  }
}

function findTag(
  ifd: number,
  wanted: number,
  u16: (o: number) => number,
  u32: (o: number) => number,
): number | null {
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (u16(entry) === wanted) return u32(entry + 8);
  }
  return null;
}

function readRationals(
  offset: number,
  n: number,
  u32: (o: number) => number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const num = u32(offset + i * 8);
    const den = u32(offset + i * 8 + 4);
    out.push(den ? num / den : 0);
  }
  return out;
}

function dms([d, m, s]: number[]): number {
  return d + m / 60 + s / 3600;
}
