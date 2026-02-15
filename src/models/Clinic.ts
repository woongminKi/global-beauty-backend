import mongoose, { Schema, Document } from 'mongoose';
import type { LocalizedString, City, OperatingHours } from '../types/index.js';

export interface IClinic extends Document {
  name: LocalizedString;
  city: City;
  address: LocalizedString;
  phone: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  languages: string[];
  hours: OperatingHours;
  tags: string[];
  rating: number;
  reviewCount: number;
  images: string[];
  description: LocalizedString;
  externalReviewLinks: {
    source: string;
    url: string;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LocalizedStringSchema = new Schema(
  {
    en: { type: String, required: true },
    ja: { type: String, required: true },
    zh: { type: String, required: true },
  },
  { _id: false }
);

const ClinicSchema = new Schema<IClinic>(
  {
    name: { type: LocalizedStringSchema, required: true },
    city: {
      type: String,
      enum: ['seoul', 'busan', 'jeju'],
      required: true,
      index: true,
    },
    address: { type: LocalizedStringSchema, required: true },
    phone: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    languages: [{ type: String }],
    hours: {
      monday: String,
      tuesday: String,
      wednesday: String,
      thursday: String,
      friday: String,
      saturday: String,
      sunday: String,
      holiday: String,
      note: String,
    },
    tags: [{ type: String, index: true }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    images: [{ type: String }],
    description: { type: LocalizedStringSchema, required: true },
    externalReviewLinks: [
      {
        source: String,
        url: String,
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
ClinicSchema.index({ location: '2dsphere' });
ClinicSchema.index({ city: 1, tags: 1 });
ClinicSchema.index({ 'name.en': 'text', 'name.ja': 'text', 'name.zh': 'text' });

export const Clinic = mongoose.model<IClinic>('Clinic', ClinicSchema);
