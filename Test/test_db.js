import mongoose from 'mongoose';

// const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
// const mongoUri = "mongodb://appUser:AppUser%40123@187.127.139.183:27017/bachtbazaar_db?authSource=bachtbazaar_db";
const mongoUri = "mongodb://appUser:AppUser%40123@127.0.0.1:27017/bachtbazaar_db?authSource=bachtbazaar_db";

async function testMongoDbUri() {
    try {
        await mongoose.connect(mongoUri);
        console.log('✓ MongoDB connection successful');
        console.log('Connected to:', mongoUri);
        
        const db = mongoose.connection;
        console.log('Database name:', db.name);
        
        await mongoose.connection.close();
        console.log('✓ Connection closed successfully');
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

testMongoDbUri();