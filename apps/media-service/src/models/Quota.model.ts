// /apps/media-service/src/models/Quota.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuota extends Document {
  userId: string;
  
  // Limits (pro Monat)
  uploadLimitMB: number;     // Standard: 500 MB (FREE), 5000 MB (PREMIUM)
  fileCountLimit: number;    // Standard: 1000 (FREE), 10000 (PREMIUM)
  
  // Current Usage
  usedMB: number;
  fileCount: number;
  
  // Last Reset
  lastResetAt: Date;
  
  createdAt: Date;
  updatedAt: Date;

  // Virtuals (siehe unten im Schema definiert)
  remainingMB: number;
  remainingFiles: number;
  usagePercent: number;
  isQuotaExceeded: boolean;
}

// Zusatz-Funktionen (Statics), die am Quota-Modell selbst haengen (z.B. Quota.getOrCreate(...))
export interface IQuotaModel extends Model<IQuota> {
  getOrCreate(userId: string, isPremium?: boolean): Promise<IQuota>;
  incrementUsage(userId: string, sizeMB: number): Promise<IQuota | null>;
  decrementUsage(userId: string, sizeMB: number): Promise<IQuota | null>;
  resetMonthly(): Promise<{ modifiedCount: number }>;
}

const QuotaSchema = new Schema<IQuota>({
  userId: { type: String, required: true, unique: true, index: true },
  
  uploadLimitMB: { type: Number, required: true, default: 500 },
  fileCountLimit: { type: Number, required: true, default: 1000 },
  
  usedMB: { type: Number, default: 0 },
  fileCount: { type: Number, default: 0 },
  
  lastResetAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Virtuals
QuotaSchema.virtual('remainingMB').get(function() {
  return Math.max(0, this.uploadLimitMB - this.usedMB);
});

QuotaSchema.virtual('remainingFiles').get(function() {
  return Math.max(0, this.fileCountLimit - this.fileCount);
});

QuotaSchema.virtual('usagePercent').get(function() {
  return Math.round((this.usedMB / this.uploadLimitMB) * 100);
});

QuotaSchema.virtual('isQuotaExceeded').get(function() {
  return this.usedMB >= this.uploadLimitMB || this.fileCount >= this.fileCountLimit;
});

// Statics
QuotaSchema.statics.getOrCreate = async function(userId: string, isPremium: boolean = false) {
  let quota = await this.findOne({ userId });
  
  if (!quota) {
    quota = new this({
      userId,
      uploadLimitMB: isPremium ? 5000 : 500,
      fileCountLimit: isPremium ? 10000 : 1000
    });
    await quota.save();
  }
  
  return quota;
};

QuotaSchema.statics.incrementUsage = async function(userId: string, sizeMB: number) {
  return this.findOneAndUpdate(
    { userId },
    {
      $inc: {
        usedMB: sizeMB,
        fileCount: 1
      }
    },
    { new: true, upsert: true }
  );
};

QuotaSchema.statics.decrementUsage = async function(userId: string, sizeMB: number) {
  return this.findOneAndUpdate(
    { userId },
    {
      $inc: {
        usedMB: -sizeMB,
        fileCount: -1
      }
    },
    { new: true }
  );
};

QuotaSchema.statics.resetMonthly = async function() {
  // Called by Cron-Job (1st of month)
  const result = await this.updateMany(
    {},
    {
      $set: {
        usedMB: 0,
        fileCount: 0,
        lastResetAt: new Date()
      }
    }
  );
  
  return result;
};

export const Quota = mongoose.model<IQuota, IQuotaModel>('Quota', QuotaSchema);
