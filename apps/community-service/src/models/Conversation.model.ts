// /apps/community-service/src/models/Conversation.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: string[]; // Array of 2 userIds

  // Last message preview
  lastMessageId?: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;

  // Unread counts per user
  unreadCounts: Map<string, number>;

  // Soft delete per user (allows one user to delete without affecting the other)
  deletedBy: string[];

  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  participants: [{
    type: String,
    required: true,
    index: true
  }],

  lastMessageId: String,
  lastMessageAt: {
    type: Date,
    index: true
  },
  lastMessagePreview: {
    type: String,
    maxlength: 100
  },

  unreadCounts: {
    type: Map,
    of: Number,
    default: new Map()
  },

  deletedBy: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
ConversationSchema.index({ 'participants': 1, deletedBy: 1 });

// Ensure participants array has exactly 2 users
ConversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Conversation must have exactly 2 participants'));
  }
  // Sort participants to ensure consistent lookup
  this.participants.sort();
  next();
});

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
