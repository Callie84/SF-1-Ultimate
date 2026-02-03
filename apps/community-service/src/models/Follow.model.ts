// /apps/community-service/src/models/Follow.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
  followerId: string;  // User who is following
  followingId: string; // User being followed

  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>({
  followerId: {
    type: String,
    required: true,
    index: true
  },
  followingId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound unique index to prevent duplicate follows
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Index for finding followers of a user
FollowSchema.index({ followingId: 1, createdAt: -1 });

// Index for finding who a user follows
FollowSchema.index({ followerId: 1, createdAt: -1 });

export const Follow = mongoose.model<IFollow>('Follow', FollowSchema);
