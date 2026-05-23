// ============================================================
// Quro — Date & Time Clinical Safe Parsers & Formatters
// Prevents RangeError: Invalid time value in React Components
// ============================================================

import { format as dateFnsFormat } from 'date-fns';

/**
 * Safely parses any input into a valid Date object.
 * Handles:
 * - Firestore Timestamp instances (with a .toDate() method)
 * - Raw Firestore Timestamp serialized objects ({ seconds, nanoseconds })
 * - ISO date strings or other date string representations
 * - Date instances
 * - Milliseconds/Epoch integers
 * 
 * Returns null if the value is invalid or cannot be parsed.
 */
export const parseSafeDate = (val: unknown): Date | null => {
  if (!val) return null;
  try {
    let d: Date;
    if (typeof val === 'object' && val !== null) {
      const valObj = val as Record<string, any>;
      if (typeof valObj.toDate === 'function') {
        d = valObj.toDate();
      } else if (valObj.seconds !== undefined) {
        d = new Date(valObj.seconds * 1000 + Math.floor((valObj.nanoseconds || 0) / 1000000));
      } else if (val instanceof Date) {
        d = val;
      } else {
        d = new Date(val as any);
      }
    } else if (typeof val === 'number') {
      d = new Date(val);
    } else {
      d = new Date(val as any);
    }

    if (isNaN(d.getTime())) {
      return null;
    }
    return d;
  } catch (e) {
    console.error('Error parsing date in parseSafeDate:', val, e);
    return null;
  }
};

/**
 * Safely formats any date-like input using date-fns format.
 * Returns the fallback string if the date is invalid.
 */
export const safeFormat = (
  val: unknown,
  formatStr: string,
  fallback: string = 'Pending...'
): string => {
  const d = parseSafeDate(val);
  if (!d) return fallback;
  try {
    return dateFnsFormat(d, formatStr);
  } catch (e) {
    console.error('Error formatting date in safeFormat:', val, formatStr, e);
    return fallback;
  }
};

/**
 * Safely converts any date-like input to local date string.
 * Returns fallback if invalid.
 */
export const safeLocaleDateString = (
  val: unknown,
  fallback: string = 'Pending...'
): string => {
  const d = parseSafeDate(val);
  if (!d) return fallback;
  try {
    return d.toLocaleDateString();
  } catch {
    return fallback;
  }
};

/**
 * Safely converts any date-like input to local date and time string.
 * Returns fallback if invalid.
 */
export const safeLocaleString = (
  val: unknown,
  fallback: string = 'Pending...'
): string => {
  const d = parseSafeDate(val);
  if (!d) return fallback;
  try {
    return d.toLocaleString();
  } catch {
    return fallback;
  }
};
