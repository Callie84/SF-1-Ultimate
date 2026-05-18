// /apps/community-service/src/models/Ban.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IBan extends Document {
  userId: string;
  bannedBy: string;
  
  reason: string;
  type: 'temporary' | 'permanent';
  
  expiresAt?: Date;
  
  isActive: boolean;
  
  // Audit
  reportIds: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const BanSchema = new Schema<IBan>({
  userId: { 
    type: String, 
    required: true,
    index: true,
    unique: true
  },
  bannedBy: { 
    type: String, 
    required: true
  },
  
  reason: { 
    type: String, 
    required: true,
    maxlength: 1000
  },
  type: { 
    type: String, 
    enum: ['temporary', 'permanent'],
    required: true
  },
  
  expiresAt: {
    type: Date
  },
  
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  
  reportIds: [{ 
    type: String 
  }]
}, {
  timestamps: true
});

// Indexes
BanSchema.index({ userId: 1, isActive: 1 });
BanSchema.index({ expiresAt: 1 });

// Middleware: Auto-deactivate expired bans
BanSchema.pre('save', function(next) {
  if (this.type === 'temporary' && this.expiresAt && this.expiresAt < new Date()) {
    this.isActive = false;
  }
  next();
});

export const Ban = mongoose.model<IBan>('Ban', BanSchema);
