// /apps/community-service/src/models/Thread.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IThread extends Document {
  userId: string;
  categoryId: string;
  
  title: string;
  content: string;
  tags: string[];
  
  // Social
  viewCount: number;
  replyCount: number;
  upvoteCount: number;
  downvoteCount: number;
  
  // Status
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  bestAnswerId?: string;
  
  // Moderation
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deleteReason?: string;
  
  // Media
  imageUrls: string[];

  // Search
  searchText: string;

  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ThreadSchema = new Schema<IThread>({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  categoryId: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  title: { 
    type: String, 
    required: true,
    minlength: 5,
    maxlength: 200
  },
  content: { 
    type: String, 
    required: true,
    minlength: 10,
    maxlength: 10000
  },
  tags: [{ 
    type: String, 
    maxlength: 30 
  }],
  
  viewCount: { 
    type: Number, 
    default: 0 
  },
  replyCount: { 
    type: Number, 
    default: 0 
  },
  upvoteCount: { 
    type: Number, 
    default: 0 
  },
  downvoteCount: { 
    type: Number, 
    default: 0 
  },
  
  isPinned: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isLocked: { 
    type: Boolean, 
    default: false 
  },
  isSolved: { 
    type: Boolean, 
    default: false,
    index: true
  },
  bestAnswerId: { 
    type: String, 
    index: true 
  },
  
  imageUrls: [{ type: String }],

  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date,
  deletedBy: String,
  deleteReason: String,

  searchText: {
    type: String
  },
  
  lastActivityAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
ThreadSchema.index({ categoryId: 1, isPinned: -1, lastActivityAt: -1 });
ThreadSchema.index({ userId: 1, createdAt: -1 });
ThreadSchema.index({ tags: 1 });
ThreadSchema.index({ searchText: 'text', title: 'text' });
ThreadSchema.index({ upvoteCount: -1 });

// Middleware: Search-Text generieren
ThreadSchema.pre('save', function(next) {
  this.searchText = `${this.title} ${this.content} ${this.tags.join(' ')}`.toLowerCase();
  next();
});

// Virtuals
ThreadSchema.virtual('score').get(function() {
  return this.upvoteCount - this.downvoteCount;
});

export const Thread = mongoose.model<IThread>('Thread', ThreadSchema);
