import mongoose, { Schema, Document } from 'mongoose';

export interface IAd extends Document {
  type: 'rectangle' | 'square';
  title: string;
  imageUrl: string;
  link: string;
  linkTarget: '_blank' | '_self';
  altText: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdSchema = new Schema<IAd>(
  {
    type: {
      type: String,
      enum: ['rectangle', 'square'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      required: true,
      trim: true,
    },
    linkTarget: {
      type: String,
      enum: ['_blank', '_self'],
      default: '_blank',
    },
    altText: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

AdSchema.index({ type: 1, isActive: 1, order: 1 });

export const Ad = mongoose.model<IAd>('Ad', AdSchema);
