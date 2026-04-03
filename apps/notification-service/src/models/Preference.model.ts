import mongoose, { Schema, Document } from 'mongoose';

export interface IPreference extends Document {
  userId: string;
  
  enabled: boolean;
  
  preferences: {
    comment: { in_app: boolean; email: boolean; push: boolean };
    reply: { in_app: boolean; email: boolean; push: boolean };
    reaction: { in_app: boolean; email: boolean; push: boolean };
    follow: { in_app: boolean; email: boolean; push: boolean };
    mention: { in_app: boolean; email: boolean; push: boolean };
    price_alert: { in_app: boolean; email: boolean; push: boolean };
    milestone: { in_app: boolean; email: boolean; push: boolean };
    badge: { in_app: boolean; email: boolean; push: boolean };
    system: { in_app: boolean; email: boolean; push: boolean };
  };
  
  emailDigest: 'instant' | 'hourly' | 'daily' | 'never';
  emailDigestTime?: string;
  
  quietHours: {
    enabled: boolean;
    start?: string;
    end?: string;
  };
  
  updatedAt: Date;
}

const PreferenceSchema = new Schema<IPreference>({
  userId: { type: String, required: true, unique: true, index: true },
  
  enabled: { type: Boolean, default: true },
  
  preferences: {
    comment: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: true }, 
      push: { type: Boolean, default: true } 
    },
    reply: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: true }, 
      push: { type: Boolean, default: true } 
    },
    reaction: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: false }, 
      push: { type: Boolean, default: false } 
    },
    follow: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: true }, 
      push: { type: Boolean, default: true } 
    },
    mention: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: true }, 
      push: { type: Boolean, default: true } 
    },
    price_alert: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: true }, 
      push: { type: Boolean, default: true } 
    },
    milestone: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: true }, 
      push: { type: Boolean, default: false } 
    },
    badge: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: true }, 
      push: { type: Boolean, default: true } 
    },
    system: { 
      in_app: { type: Boolean, default: true }, 
      email: { type: Boolean, default: true }, 
      push: { type: Boolean, default: false } 
    }
  },
  
  emailDigest: {
    type: String,
    enum: ['instant', 'hourly', 'daily', 'never'],
    default: 'never'
  },
  emailDigestTime: String,
  
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: String,
    end: String
  }
}, {
  timestamps: { createdAt: false, updatedAt: true }
});

export const Preference = mongoose.model<IPreference>('Preference', PreferenceSchema);