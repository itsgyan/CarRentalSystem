const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  const primaryConn = process.env.MONGODB_URI || 'mongodb://gyanranjanitaec_db_user:gyan@ac-focf9ow-shard-00-00.dsrcm5a.mongodb.net:27017,ac-focf9ow-shard-00-01.dsrcm5a.mongodb.net:27017,ac-focf9ow-shard-00-02.dsrcm5a.mongodb.net:27017/car_rental?ssl=true&replicaSet=atlas-uo12d3-shard-0&authSource=admin&appName=Cluster0';
  const replicaSetFallback = 'mongodb://gyanranjanitaec_db_user:gyan@ac-focf9ow-shard-00-00.dsrcm5a.mongodb.net:27017,ac-focf9ow-shard-00-01.dsrcm5a.mongodb.net:27017,ac-focf9ow-shard-00-02.dsrcm5a.mongodb.net:27017/car_rental?ssl=true&replicaSet=atlas-uo12d3-shard-0&authSource=admin&appName=Cluster0';
  const localFallback = 'mongodb://127.0.0.1:27017/car_rental';

  try {
    if (primaryConn.includes('<db_password>')) {
      console.warn('\n⚠️ WARNING: The "<db_password>" placeholder is still present in your MONGODB_URI within server/.env.');
      console.warn('⚠️ Make sure to edit server/.env and replace it with your actual MongoDB Atlas database password to connect successfully!\n');
    }

    console.log(`📡 Attempting to connect to MongoDB database using: ${primaryConn.replace(/:([^@]+)@/, ':****@')}`);
    
    await mongoose.connect(primaryConn, { dbName: 'car_rental' });

    console.log(`✅ MongoDB connected successfully to: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ Primary MongoDB connection failed:', error.message);
    
    // If it's a DNS SRV query issue, let's gracefully failover to direct replica set shards
    if (error.message.includes('querySrv') || error.code === 'ECONNREFUSED' || error.message.includes('ENOTFOUND')) {
      console.log('🔄 SRV DNS lookup failed. Attempting fallback to non-SRV Replica Set connection string...');
      try {
        await mongoose.connect(replicaSetFallback);
        console.log(`✅ MongoDB connected successfully via replica set fallback to: ${mongoose.connection.name}`);
        return;
      } catch (fallbackError) {
        console.error('❌ Replica Set fallback connection failed:', fallbackError.message);
      }
    }
    
    // As a final failover, try the local database
    console.log('🔄 Attempting local MongoDB fallback connection...');
    try {
      await mongoose.connect(localFallback);
      console.log(`✅ MongoDB connected successfully to local fallback: ${mongoose.connection.name}`);
    } catch (localError) {
      console.error('❌ Local MongoDB fallback failed:', localError.message);
      throw error; // Throw original error to let caller know why connection could not be established
    }
  }
};

module.exports = {
  connectDB,
  mongoose
};
