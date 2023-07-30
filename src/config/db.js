const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = 'rabbits';

let db = null;

async function connectToDB() {
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database connection not established.');
  }
  return db;
}

module.exports = {
  connectToDB,
  getDB,
};
