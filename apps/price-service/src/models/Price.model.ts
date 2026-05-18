// Price Service - Price Model
import mongoose, { Schema, Document } from 'mongoose';

export interface IPrice extends Document {
  // Relations
  seedId: mongoose.Types.ObjectId;
  seedSlug: string;
  
  // Seedbank
  seedbank: string;
  seedbankSlug: string;
  
  // Price
  price: number;
  currency: string;
  originalPrice?: number;
  discount?: number;
  
  // Stock
  inStock: boolean;
  stockLevel?: 'low' | 'medium' | 'high';
  
  // Pack Info
  packSize: string;
  seedCount: number;
  
  // URLs
  url: string;
  affiliateUrl?: string;
  
  // Scraping Meta
  scrapedAt: Date;
  validUntil: Date;
  scraperId: string;
  
  // Quality
  reliability: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const PriceSchema = new Schema<IPrice>({
  seedId: {
    type: Schema.Types.ObjectId,
    ref: 'Seed',
    required: true,
    index: true
  },
  seedSlug: { type: String, required: true, index: true },
  
  seedbank: { type: String, required: true, index: true },
  seedbankSlug: { type: String, required: true, index: true },
  
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'EUR', enum: ['EUR', 'USD', 'GBP'] },
  originalPrice: Number,
  discount: Number,
  
  inStock: { type: Boolean, default: true, index: true },
  stockLevel: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  
  packSize: { type: String, required: true },
  seedCount: { type: Number, required: true, min: 1 },
  
  url: { type: String, required: true },
  affiliateUrl: String,
  
  scrapedAt: { type: Date, required: true, index: true },
  validUntil: { type: Date, required: true, index: true },
  scraperId: { type: String, required: true },
  
  reliability: { type: Number, default: 1.0, min: 0, max: 1 }
}, {
  timestamps: true
});

// Compound Indexes
PriceSchema.index({ seedSlug: 1, seedbank: 1, packSize: 1 });
PriceSchema.index({ seedbank: 1, scrapedAt: -1 });
PriceSchema.index({ price: 1, inStock: 1 });
PriceSchema.index({ validUntil: 1 });
// Session 52: Günstigste verfügbare Preise + Seedbank-Übersicht
PriceSchema.index({ seedSlug: 1, inStock: 1, price: 1 });
PriceSchema.index({ seedbankSlug: 1, scrapedAt: -1, inStock: 1 });

// Virtuals
PriceSchema.virtual('pricePerSeed').get(function() {
  return this.seedCount > 0 ? parseFloat((this.price / this.seedCount).toFixed(2)) : 0;
});

PriceSchema.virtual('isValid').get(function() {
  return this.validUntil > new Date();
});

export const Price = mongoose.model<IPrice>('Price', PriceSchema);
