import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  isActive: boolean;
  version: number; // erhöhen = alle User sehen es erneut
  ctaUrl?: string;
  ctaLabel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    ctaUrl: { type: String },
    ctaLabel: { type: String },
  },
  { timestamps: true }
);

export const Announcement =
  mongoose.models['Announcement'] ||
  mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
