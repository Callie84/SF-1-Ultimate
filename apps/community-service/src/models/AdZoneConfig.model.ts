import mongoose, { Schema, Document } from 'mongoose';

export interface IZone {
  id: string;
  adType: 'rectangle' | 'square';
  width: number;   // 0 = 100% Containerbreite
  height: number;  // in px
  isActive: boolean;
}

export interface IAdZoneConfig extends Document {
  zones: IZone[];
}

const ZoneSchema = new Schema<IZone>(
  {
    id: { type: String, required: true },
    adType: { type: String, enum: ['rectangle', 'square'], required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 90 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const AdZoneConfigSchema = new Schema<IAdZoneConfig>(
  { zones: [ZoneSchema] },
  { timestamps: true }
);

export const AdZoneConfig =
  mongoose.models['AdZoneConfig'] ||
  mongoose.model<IAdZoneConfig>('AdZoneConfig', AdZoneConfigSchema);
