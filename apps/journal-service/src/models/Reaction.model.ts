import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReaction extends Document {
  userId: string;
  growId: string;
  type: 'fire' | 'frosty' | 'jealous' | 'helpful' | 'impressive';
  createdAt: Date;
}

export interface IReactionModel extends Model<IReaction> {
  getReactionCounts(growId: string): Promise<Array<{ _id: string; count: number }>>;
}

const ReactionSchema = new Schema<IReaction>({
  userId: { type: String, required: true },
  growId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['fire', 'frosty', 'jealous', 'helpful', 'impressive'],
    required: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

ReactionSchema.index({ userId: 1, growId: 1 }, { unique: true });

ReactionSchema.statics.getReactionCounts = async function(growId: string) {
  return this.aggregate([
    { $match: { growId } },
    { $group: { 
      _id: '$type', 
      count: { $sum: 1 } 
    }}
  ]);
};

export const Reaction = mongoose.model<IReaction, IReactionModel>('Reaction', ReactionSchema);
