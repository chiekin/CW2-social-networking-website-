import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// MongoDB URI from the .env file
const mongoURI = process.env.MONGO_URI;

// MongoClient instance to connect to the database (removed deprecated options)
const client = new MongoClient(mongoURI);

// Declare the db variable
let db;

async function connectToDB() {
  try {
    await client.connect();
    console.log('Successfully connected to the database.');

    db = client.db('Daikonnect'); // My database name
    console.log(`Connected to database: ${db.databaseName}`);

    const usersCollection = db.collection('Users');
    console.log('Accessing Users collection:', usersCollection.collectionName);

    return { db, usersCollection };  
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    throw error;
  }
}

// Get the database instance
function getDB() {
  if (!db) {
    throw new Error('Database not connected!');
  }
  return db;
}

// Close the database connection
async function closeDB() {
  try {
    await client.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing the database connection:', error);
  }
}

export { connectToDB, getDB, closeDB };  