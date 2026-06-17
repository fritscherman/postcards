import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

export interface TokenUser {
  id: string;
  email: string;
  name: string;
}

// --- Passwords: scrypt from node:crypto, no native build needed ---

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// --- JWT (HS256) ---

export function signToken(user: TokenUser, secret: string): string {
  return jwt.sign(user, secret, { expiresIn: '30d' });
}

export function verifyToken(token: string, secret: string): TokenUser | null {
  try {
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    return { id: decoded.id, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}
