const express = require('express');
const { ethers } = require('ethers');
const { getDB } = require('../config/db');
const verify = require('../middlewares/verify');
const { ObjectId } = require('mongodb');
const { gameId } = require('../controllers/declareWinner');

const app = express.Router();
const db = getDB();
const depositTransactionCollection = db.collection('depositTransaction');
const userCollection = db.collection('userData');
const positionCollection = db.collection('positions');
const gameCollection = db.collection('games');

app.use(verify);

app.get('/game', async (req, res) => {
  try {
    const game = await gameCollection.findOne({ gameId: gameId.value });
    const data = {
      totalAmount: game.totalAmount,
      gameId: game.gameId,
      winnerAnnouncementTime: game.winnerAnnouncementTime,
      startTime: game.startTime,
    };
    res.status(200).send({ message: 'Success', data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
});



app.get('/user', async (req, res) => {
  try {
    const { user } = req.body;
    const data = await userCollection.findOne({ _id: ObjectId(user._id) });
    res.status(200).send({ message: 'Success', data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
});

app.get('/position', async (req, res) => {
  try {
    // positionNumber are 1, 2, 3, 4
    const { user, position } = req.body;
    let data = await positionCollection.findOne({ gameId: 0, position });
    data = { ...data, participants: data.participants.length };
    res.status(200).send({ message: 'Success', data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
});

module.exports = app;
