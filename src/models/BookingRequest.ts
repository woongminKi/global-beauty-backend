import mongoose, { Schema, Document, Types } from 'mongoose';
import type { BookingStatus, BudgetRange, Locale } from '../types/index.js';

export interface IBookingRequest extends Document {
  clinicId: Types.ObjectId;
  userId?: Types.ObjectId;
  guestEmail?: string;
  guestPhone?: string;
  accessCode: string;
  procedure: string;
  preferredDate: Date;
  preferredTimeSlot?: string;
  budget: BudgetRange;
  photos: string[];
  locale: Locale;
  notes?: string;
  status: BookingStatus;
  statusHistory: {
    status: BookingStatus;
    changedAt: Date;
    changedBy?: Types.ObjectId;
    note?: string;
  }[];
  opsNotes?: string;
  proposedOptions?: {
    date: Date;
    timeSlot: string;
    price: number;
    note?: string;
  }[];
  confirmedOption?: {
    date: Date;
    timeSlot: string;
    price: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BookingRequestSchema = new Schema<IBookingRequest>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    guestEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    guestPhone: { type: String },
    accessCode: {
      type: String,
      required: true,
      unique: true,
    },
    procedure: { type: String, required: true },
    preferredDate: { type: Date, required: true },
    preferredTimeSlot: { type: String },
    budget: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        enum: ['KRW', 'USD', 'JPY', 'CNY'],
        default: 'KRW',
      },
    },
    photos: [{ type: String }],
    locale: {
      type: String,
      enum: ['en', 'ja', 'zh'],
      default: 'en',
    },
    notes: { type: String },
    status: {
      type: String,
      enum: [
        'received',
        'contactingHospital',
        'proposedOptions',
        'confirmed',
        'cancelled',
        'needsMoreInfo',
        'noAvailability',
      ],
      default: 'received',
      index: true,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: 'OpsUser' },
        note: String,
      },
    ],
    opsNotes: { type: String },
    proposedOptions: [
      {
        date: Date,
        timeSlot: String,
        price: Number,
        note: String,
      },
    ],
    confirmedOption: {
      date: Date,
      timeSlot: String,
      price: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
BookingRequestSchema.index({ status: 1, createdAt: -1 });
BookingRequestSchema.index({ accessCode: 1 });
BookingRequestSchema.index({ guestEmail: 1 });
BookingRequestSchema.index({ guestEmail: 1, createdAt: -1 }); // For my-requests query

export const BookingRequest = mongoose.model<IBookingRequest>(
  'BookingRequest',
  BookingRequestSchema
);
