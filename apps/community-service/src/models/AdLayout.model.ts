import mongoose, { Document, Schema } from 'mongoose';

export interface IAdLayoutZone {
  id: string;
  adType: 'rectangle' | 'square';
  width: number;
  height: number;
  isActive: boolean;
  slotCount: 1 | 3;
  slots?: Array<{ html: string; isActive: boolean }>;
}

export interface IAdLayout extends Document {
  name: string;
  zones: IAdLayoutZone[];
  sidebarWidth: number;
  isActive: boolean;
  createdAt: Date;
}

const AdLayoutZoneSchema = new Schema<IAdLayoutZone>(
  {
    id: { type: String, required: true },
    adType: { type: String, enum: ['rectangle', 'square'], required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 112 },
    isActive: { type: Boolean, default: true },
    slotCount: { type: Number, enum: [1, 3], default: 1 },
    slots: [{ html: String, isActive: Boolean }],
  },
  { _id: false }
);

const AdLayoutSchema = new Schema<IAdLayout>(
  {
    name: { type: String, required: true },
    zones: [AdLayoutZoneSchema],
    sidebarWidth: { type: Number, default: 256 },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AdLayout: mongoose.Model<IAdLayout> =
  mongoose.models['AdLayout'] ||
  mongoose.model<IAdLayout>('AdLayout', AdLayoutSchema);
