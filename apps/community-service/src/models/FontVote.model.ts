import mongoose, { Schema, Document } from 'mongoose';

export interface IFontVote extends Document {
  userId: string;
  fontId: number; // 1–10
  createdAt: Date;
}

const FontVoteSchema = new Schema<IFontVote>(
  {
    userId: { type: String, required: true, index: true },
    fontId: { type: Number, required: true, min: 1, max: 10 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Ein User darf pro Font nur einmal abstimmen
FontVoteSchema.index({ userId: 1, fontId: 1 }, { unique: true });

export const FontVote =
  mongoose.models['FontVote'] ||
  mongoose.model<IFontVote>('FontVote', FontVoteSchema);
