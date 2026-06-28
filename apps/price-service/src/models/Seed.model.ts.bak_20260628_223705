// Price Service - Seed Model
import mongoose, { Schema, Document } from 'mongoose';

export interface ISeed extends Document {
  // Basic Info
  name: string;
  slug: string;
  breeder: string;
  
  // Type
  type: 'feminized' | 'autoflower' | 'regular';
  genetics?: string;
  
  // Characteristics
  thc?: number;
  cbd?: number;
  floweringTime?: number;
  yield?: string;
  
  // Growth
  difficulty?: 'easy' | 'medium' | 'hard';
  climate?: 'indoor' | 'outdoor' | 'both';
  height?: string;
  
  // Flavors & Effects
  flavors?: string[];
  effects?: string[];

  // Flavor-Datenquelle für Qualitäts-Tracking
  flavorSource?: 'crawl' | 'seedfinder' | 'manual';

  // Provenienz: welche Quellen haben zu diesem Seed beigetragen
  source?: Array<'crawl' | 'seedfinder' | 'firecrawl' | 'manual'>;

  // Zeitpunkt des letzten erfolgreichen Scrapes
  lastScraped?: Date;

  // Stats
  viewCount: number;
  priceCount: number;
  avgPrice?: number;
  lowestPrice?: number;
  
  // Metadata
  description?: string;
  imageUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const SeedSchema = new Schema<ISeed>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  breeder: { type: String, required: true, index: true },
  
  type: {
    type: String,
    enum: ['feminized', 'autoflower', 'regular'],
    required: true,
    index: true
  },
  genetics: String,
  
  thc: { type: Number, min: 0, max: 35 },
  cbd: { type: Number, min: 0, max: 30 },
  floweringTime: { type: Number, min: 30, max: 120 },
  yield: String,
  
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard']
  },
  climate: {
    type: String,
    enum: ['indoor', 'outdoor', 'both']
  },
  height: String,
  
  flavors: [String],
  effects: [String],

  flavorSource: {
    type: String,
    enum: ['crawl', 'seedfinder', 'manual'],
  },

  source: {
    type: [String],
    enum: ['crawl', 'seedfinder', 'firecrawl', 'manual'],
    default: [],
    index: true,
  },

  lastScraped: { type: Date, index: true },

  viewCount: { type: Number, default: 0, index: true },
  priceCount: { type: Number, default: 0 },
  avgPrice: Number,
  lowestPrice: Number,
  
  description: String,
  imageUrl: String
}, {
  timestamps: true
});

// Indexes
SeedSchema.index({ name: 'text', breeder: 'text' });
SeedSchema.index({ lowestPrice: 1 });
SeedSchema.index({ viewCount: -1 });
SeedSchema.index({ priceCount: 1 }); // für browseSeeds({ priceCount: { $gt: 0 } })
SeedSchema.index({ lastScraped: 1 }); // findStale({ lastScraped: { $lt: ... } })

SeedSchema.pre('save', function (next) {
  if (this.thc != null) this.thc = Math.round(this.thc * 10) / 10;
  if (this.cbd != null) this.cbd = Math.round(this.cbd * 10) / 10;
  next();
});

export const Seed = mongoose.model<ISeed>('Seed', SeedSchema);
