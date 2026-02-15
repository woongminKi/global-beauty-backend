import mongoose, { Schema, Document } from 'mongoose';
import type { Locale } from '../types/index.js';

export interface IUser extends Document {
  email: string;
  name: string;
  provider: 'google' | 'guest';
  providerId?: string;
  locale: Locale;
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    provider: {
      type: String,
      enum: ['google', 'guest'],
      required: true,
    },
    providerId: { type: String, sparse: true },
    locale: {
      type: String,
      enum: ['en', 'ja', 'zh'],
      default: 'en',
    },
    phone: { type: String },
    profileImage: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>('User', UserSchema);
