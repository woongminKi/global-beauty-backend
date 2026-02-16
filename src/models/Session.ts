import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  userType: 'user' | 'ops';
  token: string;
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'userType',
    },
    userType: {
      type: String,
      enum: ['user', 'ops'],
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: { type: Date },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes (token already has unique: true in schema)
SessionSchema.index({ userId: 1, expiresAt: 1 });

// TTL index - auto delete expired sessions after 7 days
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
