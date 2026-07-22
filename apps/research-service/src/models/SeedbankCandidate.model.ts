// /apps/research-service/src/models/SeedbankCandidate.model.ts
//
// KURATIERTE, strukturierte Kandidatenliste (Partner-Discovery).
// Getrennt von der rohen `partner_candidates`-Collection (die den kompletten
// Exa-Roh-Blob pro Suchanfrage hält, Exa ToS 4.2a): hier steht pro FIRMA genau
// ein Datensatz mit von Menschen verifizierten/korrigierten Feldern.
//
// Quelle der ersten Befüllung: Exa-Pilot 2026-07-14 + manuelle Chat-Recherche
// (u. a. Domain-/Sitz-Korrekturen für Topcannaseed und Linda Seeds).

import mongoose, { Schema, Document } from 'mongoose';

export type CandidateTier = 'primary' | 'secondary';
export type CandidateStatus = 'new' | 'reviewed' | 'contacted' | 'rejected';

export interface ISeedbankCandidate extends Document {
  name: string;
  website: string;
  domain: string;
  country: string; // ISO-ähnlich: DE | AT | CH | ES | ...
  tier: CandidateTier;
  isDACH: boolean;
  reason: string;
  source: string;
  corrections: string[];
  status: CandidateStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SeedbankCandidateSchema = new Schema<ISeedbankCandidate>(
  {
    name: { type: String, required: true },
    website: { type: String, required: true },
    // domain ist der stabile Identifikator (Dedup-Schlüssel für idempotenten Seed).
    domain: { type: String, required: true, unique: true, index: true },
    country: { type: String, required: true, index: true },
    tier: { type: String, enum: ['primary', 'secondary'], required: true, index: true },
    isDACH: { type: Boolean, required: true, index: true },
    reason: { type: String, default: '' },
    source: { type: String, default: '' },
    corrections: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'contacted', 'rejected'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

export const SeedbankCandidate = mongoose.model<ISeedbankCandidate>(
  'SeedbankCandidate',
  SeedbankCandidateSchema,
  'seedbank_candidates'
);
