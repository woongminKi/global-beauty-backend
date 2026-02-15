import mongoose, { Schema, Document } from 'mongoose';

export interface IOpsUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'operator';
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OpsUserSchema = new Schema<IOpsUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'operator'],
      default: 'operator',
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const OpsUser = mongoose.model<IOpsUser>('OpsUser', OpsUserSchema);
