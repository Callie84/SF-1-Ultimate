// /apps/community-service/src/models/Category.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  threadCount: number;
  postCount: number;
  isActive: boolean;
  parentId?: string;
  moderators: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { 
    type: String, 
    required: true,
    maxlength: 100
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  description: { 
    type: String, 
    maxlength: 500 
  },
  icon: String,
  color: { 
    type: String, 
    default: '#4CAF50' 
  },
  order: { 
    type: Number, 
    default: 0 
  },
  threadCount: { 
    type: Number, 
    default: 0 
  },
  postCount: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  parentId: {
    type: String
  },
  moderators: [{ 
    type: String 
  }]
}, {
  timestamps: true
});

// Indexes
CategorySchema.index({ order: 1, isActive: 1 });
CategorySchema.index({ parentId: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
