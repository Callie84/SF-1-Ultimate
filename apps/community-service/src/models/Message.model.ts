// /apps/community-service/src/models/Message.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  receiverId: string;

  content: string;

  // Read status
  isRead: boolean;
  readAt?: Date;

  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  receiverId: {
    type: String,
    required: true,
    index: true
  },

  content: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 5000
  },

  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,

  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
