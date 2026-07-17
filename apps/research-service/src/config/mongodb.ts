// /apps/research-service/src/config/mongodb.ts
//
// Mongo-Verbindung für research-service. Speichert ausschließlich interne
// Ablage-Collections (z. B. partner_candidates) — keine Rohdaten verlassen
// diese DB in Richtung Aufrufer (siehe routes/partners.ts / Exa ToS 4.2a).

import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/sf1_research';

export async function connectMongoDB(): Promise<void> {
  mongoose.connection.on('error', (err) => {
    logger.error('[MongoDB] Connection error:', err);
  });

  await mongoose.connect(MONGODB_URL);
  logger.info('[MongoDB] research-service verbunden');
}
