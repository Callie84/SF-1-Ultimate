#!/usr/bin/env node
/**
 * MongoDB Vector-Embeddings Index Setup
 * Für Strain-Collection (RAG-Grundlage)
 */

const { MongoClient } = require('mongodb');

const MONGODB_URL =
  'mongodb://sf1_admin:Sf1_MongoDB_SuperSecure_2026!@mongodb:27017/sf1_db?authSource=admin';

async function setupVectorIndex() {
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    const db = client.db('sf1_db');
    const collection = db.collection('strains');

    console.log('📍 Connected to MongoDB (strains collection)');

    // Count strains
    const count = await collection.countDocuments();
    console.log(`📊 Total Strains: ${count}`);

    // Check existing indexes
    const indexes = await collection.listIndexes().toArray();
    const indexNames = indexes.map((idx) => idx.name);
    console.log(`📋 Existing indexes: ${indexNames.join(', ')}`);

    // Create embedding index if not exists
    if (!indexNames.includes('strain_embedding_vector')) {
      console.log('🔨 Creating embedding index...');
      await collection.createIndex(
        { strain_embedding: 1 },
        { name: 'strain_embedding_vector', sparse: true }
      );
      console.log('✅ Embedding index created');
    } else {
      console.log('✅ Embedding index already exists');
    }

    // Create text search index
    if (!indexNames.includes('strain_text_search')) {
      console.log('🔨 Creating full-text search index...');
      await collection.createIndex(
        { description: 'text', name: 'text' },
        { name: 'strain_text_search' }
      );
      console.log('✅ Text search index created');
    } else {
      console.log('✅ Text search index already exists');
    }

    console.log('\n✨ MongoDB Vector Index Setup complete!');
    console.log('Indexes ready for RAG queries');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupVectorIndex();
