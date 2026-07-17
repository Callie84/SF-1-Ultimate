// /apps/research-service/src/models/PartnerCandidate.model.ts
//
// Interne Ablage für rohe Exa-Suchergebnisse (Partner-Discovery).
// WICHTIG (Exa ToS 4.2a): rawResult darf NIEMALS direkt an einen Aufrufer
// zurückgegeben werden. Nach außen immer nur die gefilterte DTO aus
// routes/partners.ts (toPublicDTO) verwenden.

import mongoose, { Schema, Document } from 'mongoose';

export interface IPartnerCandidate extends Document {
  query: string;
  category: string;
  rawResult: unknown;
  resultCount: number;
  status: 'new' | 'reviewed' | 'contacted' | 'rejected';
  createdAt: Date;
}

const PartnerCandidateSchema = new Schema<IPartnerCandidate>(
  {
    query: { type: String, required: true, index: true },
    category: { type: String, required: true },
    rawResult: { type: Schema.Types.Mixed, required: true },
    resultCount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'contacted', 'rejected'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PartnerCandidate = mongoose.model<IPartnerCandidate>(
  'PartnerCandidate',
  PartnerCandidateSchema,
  'partner_candidates'
);
