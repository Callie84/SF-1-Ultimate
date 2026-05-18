// /apps/community-service/src/models/Reply.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IReply extends Document {
  threadId: string;
  userId: string;
  parentId?: string;
  
  content: string;
  
  // Social
  upvoteCount: number;
  downvoteCount: number;
  
  // Best Answer
  isBestAnswer: boolean;
  
  // Moderation
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deleteReason?: string;
  isPermanentlyDeleted: boolean;
  
  isEdited: boolean;
  editedAt?: Date;
  
  // Media
  imageUrls: string[];

  // Mentions
  mentions: string[];

  depth: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>({
  threadId: { 
    type: String, 
    required: true, 
    index: true 
  },
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  parentId: {
    type: String
  },
  
  content: { 
    type: String, 
    required: true,
    minlength: 1,
    maxlength: 5000
  },
  
  upvoteCount: { 
    type: Number, 
    default: 0 
  },
  downvoteCount: { 
    type: Number, 
    default: 0 
  },
  
  isBestAnswer: { 
    type: Boolean, 
    default: false,
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
  isPermanentlyDeleted: { type: Boolean, default: false, index: true },

  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  
  mentions: [{ 
    type: String 
  }],
  
  depth: { 
    type: Number, 
    default: 0,
    max: 3
  }
}, {
  timestamps: true
});

// Indexes
ReplySchema.index({ threadId: 1, createdAt: 1 });
ReplySchema.index({ userId: 1, createdAt: -1 });
ReplySchema.index({ parentId: 1 });
ReplySchema.index({ threadId: 1, isBestAnswer: 1 });
ReplySchema.index({ upvoteCount: -1 });

// Virtuals
ReplySchema.virtual('score').get(function() {
  return this.upvoteCount - this.downvoteCount;
});

ReplySchema.virtual('replies', {
  ref: 'Reply',
  localField: '_id',
  foreignField: 'parentId'
});

// Middleware: Mentions extrahieren
ReplySchema.pre('save', function(next) {
  const mentionRegex = /@(\w+)/g;
  const matches = this.content.match(mentionRegex);
  this.mentions = matches ? matches.map(m => m.substring(1)) : [];
  next();
});

export const Reply = mongoose.model<IReply>('Reply', ReplySchema);
