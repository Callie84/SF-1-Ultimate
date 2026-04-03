import mongoose, { Schema, Document } from 'mongoose';

export interface IAffiliateClick extends Document {
  seedbank: string;
  strainId?: string;
  strainSlug?: string;
  strainName?: string;
  targetUrl: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AffiliateClickSchema = new Schema<IAffiliateClick>(
  {
    seedbank: { type: String, required: true, index: true },
    strainId: { type: String, index: true },
    strainSlug: { type: String },
    strainName: { type: String },
    targetUrl: { type: String, required: true },
    ip: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'affiliate_clicks',
  }
);

// Index für Zeitreihen-Abfragen
AffiliateClickSchema.index({ createdAt: 1 });
AffiliateClickSchema.index({ seedbank: 1, createdAt: 1 });

export const AffiliateClick =
  mongoose.models['AffiliateClick'] ||
  mongoose.model<IAffiliateClick>('AffiliateClick', AffiliateClickSchema);
