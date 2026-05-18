import mongoose, { Schema, Document } from 'mongoose';

export interface INutrientScheduleEntry {
  week: number;
  phase: 'seedling' | 'vegetative' | 'earlyFlowering' | 'lateFlowering' | 'flush';
  products: Array<{
    name: string;
    mlPerLiter: number;
    notes?: string;
  }>;
  phTarget?: number;
  ecTarget?: number;
  notes?: string;
}

export interface IFeedingPlan extends Document {
  userId: string;
  name: string;
  description?: string;
  medium: string;
  schedule: INutrientScheduleEntry[];
  isPublic: boolean;
  usageCount: number;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NutrientScheduleEntrySchema = new Schema<INutrientScheduleEntry>({
  week: { type: Number, required: true, min: 1, max: 52 },
  phase: {
    type: String,
    enum: ['seedling', 'vegetative', 'earlyFlowering', 'lateFlowering', 'flush'],
    required: true,
  },
  products: [{
    name: { type: String, required: true, maxlength: 100 },
    mlPerLiter: { type: Number, required: true, min: 0, max: 1000 },
    notes: { type: String, maxlength: 500 },
  }],
  phTarget: { type: Number, min: 0, max: 14 },
  ecTarget: { type: Number, min: 0, max: 10 },
  notes: { type: String, maxlength: 1000 },
}, { _id: false });

const FeedingPlanSchema = new Schema<IFeedingPlan>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 2000 },
  medium: { type: String, required: true, maxlength: 50 },
  schedule: [NutrientScheduleEntrySchema],
  isPublic: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  deletedAt: Date,
}, {
  timestamps: true,
});

FeedingPlanSchema.index({ userId: 1, createdAt: -1 });
FeedingPlanSchema.index({ isPublic: 1, usageCount: -1 });

export const FeedingPlan = mongoose.models['FeedingPlan'] || mongoose.model<IFeedingPlan>('FeedingPlan', FeedingPlanSchema);
