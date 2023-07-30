const express = require('express');
const { ethers } = require('ethers');
const { getDB } = require('../config/db');

const app = express.Router();
const db = getDB();
const userCollection = db.collection('userData');
const jwt = require('jsonwebtoken');
const secretKey = process.env.SECRET_KEY;

// Generate a random nonce function
function generateNonce(length) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let nonce = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    nonce += charset[randomIndex];
  }
  return nonce;
}

app.get('/', (req, res) => {
  res.send('Server is Live 🚀');
});

// GET request to send nonce
app.get('/nonce', (req, res) => {
  const nonceLength = 32; // You can set the length of the nonce as per your requirements
  const nonce = generateNonce(nonceLength);
  res.send(nonce);
});

app.post('/login', async (req, res) => {
  try {
    const { signedMessage, message, address } = req.body;
    const recoveredAddress = ethers.utils.verifyMessage(message, signedMessage);

    if (recoveredAddress != address) {
      return res.status(409).send({ error: 'invalid signature' });
    }

    // Find or create the user in the database
    let user = await userCollection.findOne({ address });
    if (!user) {
      const newUser = {
        address,
        betttingHistory: [],
        balance: 0,
        txnHistory: [],
      };
      await userCollection.insertOne(newUser);
    }

    const token = jwt.sign({ address, _id: user._id }, secretKey, { expiresIn: '24h' });
    res.status(201).send(token);
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = app;
