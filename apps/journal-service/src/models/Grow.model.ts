import mongoose, { Schema, Document } from 'mongoose';

export interface IGrowPhoto {
  _id?: mongoose.Types.ObjectId;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedAt: Date;
}

export interface IGrow extends Document {
  userId: string;

  // Grow Gallery
  photos: IGrowPhoto[];

  // Strain Info
  strainId?: string;
  strainName: string;
  breeder?: string;
  type: 'feminized' | 'autoflower' | 'regular' | 'clone';
  
  // Timeline
  startDate: Date;
  harvestDate?: Date;
  status: 'planning' | 'germination' | 'vegetative' | 'flowering' | 'drying' | 'curing' | 'harvested' | 'archived';
  
  // Setup
  environment: 'indoor' | 'outdoor' | 'greenhouse';
  lightType?: string;
  lightWattage?: number;
  lightSchedule?: string;
  tentSize?: string;
  medium?: string;
  potSize?: string;
  nutrients?: string[];
  
  // Results
  yieldWet?: number;
  yieldDry?: number;
  efficiency?: number;     // g/W
  yieldPerM2?: number;     // g/m²
  growAreaM2?: number;     // Anbaufläche in m²
  quality?: 1 | 2 | 3 | 4 | 5;
  
  // Social
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  
  // Metadata
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'expert';
  problems?: string[];
  
  // Klon-Tracking
  motherGrowId?: string;

  deletedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const GrowSchema = new Schema<IGrow>({
  userId: { type: String, required: true, index: true },
  
  strainId: { type: String, index: true },
  strainName: { type: String, required: true },
  breeder: String,
  type: { 
    type: String, 
    enum: ['feminized', 'autoflower', 'regular', 'clone'],
    required: true 
  },
  
  startDate: { type: Date, required: true },
  harvestDate: Date,
  status: {
    type: String,
    enum: ['planning', 'germination', 'vegetative', 'flowering', 'drying', 'curing', 'harvested', 'archived'],
    default: 'planning',
    index: true
  },
  
  environment: {
    type: String,
    enum: ['indoor', 'outdoor', 'greenhouse'],
    required: true
  },
  lightType: String,
  lightWattage: Number,
  lightSchedule: String,
  tentSize: String,
  medium: String,
  potSize: String,
  nutrients: [String],
  
  yieldWet: Number,
  yieldDry: Number,
  efficiency: Number,
  yieldPerM2: Number,
  growAreaM2: Number,
  quality: { type: Number, min: 1, max: 5 },
  
  isPublic: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  
  motherGrowId: { type: String, index: true },

  tags: [String],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'expert'] },
  problems: [String],
  
  photos: [{
    url: { type: String, required: true },
    thumbnailUrl: String,
    caption: { type: String, maxlength: 200 },
    uploadedAt: { type: Date, default: Date.now }
  }],

  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

GrowSchema.virtual('entries', {
  ref: 'Entry',
  localField: '_id',
  foreignField: 'growId'
});

GrowSchema.virtual('coverPhoto').get(function() {
  return null;
});

GrowSchema.virtual('daysRunning').get(function() {
  if (!this.startDate) return 0;
  const end = this.harvestDate || new Date();
  return Math.floor((end.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
});

GrowSchema.index({ userId: 1, status: 1 });
GrowSchema.index({ strainName: 'text', tags: 'text' });
GrowSchema.index({ isPublic: 1, createdAt: -1 });
GrowSchema.index({ likeCount: -1 });
// Session 52: Filter-Indizes für Public Feed
GrowSchema.index({ isPublic: 1, medium: 1, createdAt: -1 });
GrowSchema.index({ isPublic: 1, difficulty: 1, createdAt: -1 });
GrowSchema.index({ isPublic: 1, status: 1, likeCount: -1 });
GrowSchema.index({ deletedAt: 1 }, { sparse: true });

GrowSchema.pre('save', function(next) {
  if (this.yieldDry && this.lightWattage && this.lightWattage > 0) {
    this.efficiency = parseFloat((this.yieldDry / this.lightWattage).toFixed(2));
  }
  if (this.yieldDry && this.growAreaM2 && this.growAreaM2 > 0) {
    this.yieldPerM2 = parseFloat((this.yieldDry / this.growAreaM2).toFixed(1));
  }
  next();
});

export const Grow = mongoose.model<IGrow>('Grow', GrowSchema);
