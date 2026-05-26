// Fix seed THC/CBD decimals
const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URL || 'mongodb://root:Sf1_MongoDB_SuperSecure_2026!@mongodb:27017/prices?authSource=admin';

(async () => {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection.db;
    const collection = db.collection('seeds');

    // Count seeds that need rounding
    const seedsToRound = await collection.countDocuments({
      $or: [{ thc: { $exists: true } }, { cbd: { $exists: true } }]
    });

    console.log(`Found ${seedsToRound} seeds with THC/CBD values`);

    // Update all seeds - rounding THC and CBD to 1 decimal place
    const result = await collection.updateMany(
      { thc: { $exists: true } },
      [
        {
          $set: {
            thc: {
              $round: [{ $multiply: ['$thc', 10] }, 0],
              $divide: [{ $round: [{ $multiply: ['$thc', 10] }, 0] }, 10]
            }
          }
        }
      ]
    );

    console.log(`Updated ${result.modifiedCount} seeds (THC)`);

    // CBD
    const result2 = await collection.updateMany(
      { cbd: { $exists: true } },
      [
        {
          $set: {
            cbd: {
              $divide: [{ $round: [{ $multiply: ['$cbd', 10] }, 0] }, 10]
            }
          }
        }
      ]
    );

    console.log(`Updated ${result2.modifiedCount} seeds (CBD)`);
    console.log('✅ Rounding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
