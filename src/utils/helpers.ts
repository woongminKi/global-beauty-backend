import crypto from 'crypto';

/**
 * Generate a random access code for booking requests
 */
export function generateAccessCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Generate a session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate session expiration date
 */
export function getSessionExpiration(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Normalize phone number
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * User info returned from session
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  locale: string;
  profileImage?: string;
}
