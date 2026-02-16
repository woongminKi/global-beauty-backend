import mongoose, { Schema, Document, Types } from 'mongoose';
import type { Locale } from '../types/index.js';

export interface IReview extends Document {
  clinicId: Types.ObjectId;
  userId: Types.ObjectId;
  bookingId: Types.ObjectId;
  rating: number;
  title: string;
  content: string;
  procedure: string;
  visitDate: Date;
  locale: Locale;
  photos: string[];
  isVerified: boolean;
  isVisible: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
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
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'BookingRequest',
      required: true,
      unique: true, // One review per booking
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    procedure: {
      type: String,
      required: true,
    },
    visitDate: {
      type: Date,
      required: true,
    },
    locale: {
      type: String,
      enum: ['en', 'ja', 'zh'],
      default: 'en',
    },
    photos: [{ type: String }],
    isVerified: {
      type: Boolean,
      default: true, // Auto-verified since only confirmed bookings can review
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ReviewSchema.index({ clinicId: 1, createdAt: -1 });
ReviewSchema.index({ clinicId: 1, rating: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
