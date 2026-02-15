import { z } from 'zod';

// Locales
export const locales = ['en', 'ja', 'zh'] as const;
export type Locale = (typeof locales)[number];

// Cities
export const cities = ['seoul', 'busan', 'jeju'] as const;
export type City = (typeof cities)[number];

// Localized String
export const LocalizedStringSchema = z.object({
  en: z.string(),
  ja: z.string(),
  zh: z.string(),
});
export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

// Booking Request Status
export const bookingStatuses = [
  'received',
  'contactingHospital',
  'proposedOptions',
  'confirmed',
  'cancelled',
  'needsMoreInfo',
  'noAvailability',
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

// Budget Range
export const BudgetRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.enum(['KRW', 'USD', 'JPY', 'CNY']).default('KRW'),
});
export type BudgetRange = z.infer<typeof BudgetRangeSchema>;

// Operating Hours
export const OperatingHoursSchema = z.object({
  monday: z.string().optional(),
  tuesday: z.string().optional(),
  wednesday: z.string().optional(),
  thursday: z.string().optional(),
  friday: z.string().optional(),
  saturday: z.string().optional(),
  sunday: z.string().optional(),
  holiday: z.string().optional(),
  note: z.string().optional(),
});
export type OperatingHours = z.infer<typeof OperatingHoursSchema>;

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
