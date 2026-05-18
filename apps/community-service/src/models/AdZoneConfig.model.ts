import mongoose, { Schema, Document } from 'mongoose';

export interface IZone {
  id: string;
  adType: 'rectangle' | 'square';
  width: number;   // 0 = 100% Containerbreite
  height: number;  // in px
  isActive: boolean;
  slotCount: 1 | 3; // number of equal slots (content-top only)
  slots?: Array<{ html: string; isActive: boolean }>; // per-slot content
}

export interface IAdZoneConfig extends Document {
  zones: IZone[];
  sidebarWidth: number; // px, default 256
}

const ZoneSchema = new Schema<IZone>(
  {
    id: { type: String, required: true },
    adType: { type: String, enum: ["rectangle", "square"], required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 112 },
    isActive: { type: Boolean, default: true },
    slotCount: { type: Number, enum: [1, 3], default: 1 },
    slots: [{
      html: { type: String, default: '' },
      isActive: { type: Boolean, default: true },
      _id: false,
    }],
  },
  { _id: false }
);

const AdZoneConfigSchema = new Schema<IAdZoneConfig>(
  {
    zones: [ZoneSchema],
    sidebarWidth: { type: Number, default: 256 },
  },
  { timestamps: true }
);

export const AdZoneConfig =
  mongoose.models["AdZoneConfig"] ||
  mongoose.model<IAdZoneConfig>("AdZoneConfig", AdZoneConfigSchema);
