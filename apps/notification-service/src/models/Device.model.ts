import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  userId: string;

  token: string;
  platform: 'ios' | 'android' | 'web';

  // Web Push Subscription (nur platform='web')
  webPushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  // Metadata
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;

  // Status
  isActive: boolean;
  lastUsedAt: Date;

  createdAt: Date;
}

const DeviceSchema = new Schema<IDevice>({
  userId: { type: String, required: true, index: true },

  token: { type: String, required: true, unique: true },
  platform: {
    type: String,
    required: true,
    enum: ['ios', 'android', 'web']
  },

  webPushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String,
    },
  },

  deviceName: String,
  appVersion: String,
  osVersion: String,

  isActive: { type: Boolean, default: true },
  lastUsedAt: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

DeviceSchema.index({ userId: 1, platform: 1 });
DeviceSchema.index({ token: 1 });

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);
