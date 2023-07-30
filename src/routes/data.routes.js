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
const staticCollection = db.collection('static');

app.use(verify);

app.get('/game/:gameId', async (req, res) => {
  try {
    let { gameId } = req.params;

    if (!gameId) {
      gameId = await staticCollection.findOne();
      console.log (gameIdx);
      if (!gameId) {
        staticCollection.updateOne({}, { $set: { gameId: 1 } }, { upsert: true });
        gameId = 1;
      }else gameId = gameId.gameId;
    }
    gameId = parseInt(gameId)
    console.log (gameId);

    const game = await gameCollection.findOne({gameId});
    console.log ("Game", game)
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

app.get('/currentGameId', async (req, res) => {
  try {
    let gameId = await staticCollection.findOne();
    console.log (gameId);
    if (!gameId) {
      staticCollection.updateOne({}, { $set: { gameId: 1 } }, { upsert: true });
      gameId = {gameId:1};
    }
    const data = gameId ? gameId.gameId : 0;
    res.status(200).send({ message: 'Success', gameId: data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
})



app.get("/gamestarttime", async (req, res) => {
  try {
    let {gameId} = await staticCollection.findOne();
    console.log (gameId);
    if (!gameId) {
      staticCollection.updateOne({}, { $set: { gameId: 1 } }, { upsert: true });
      gameId = 1;
    }
    console.log (gameId);
    const game = await gameCollection.findOne({gameId});
    console.log(game);
    const data = {
      startTime: game.startTime,
    };
    res.status(200).send({ message: 'Success', data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
})

app.get("/txnHistory", async (req, res) => {
  try {
    let {gameId} = await staticCollection.findOne();
    console.log (gameId);
    if (!gameId) {
      staticCollection.updateOne({}, { $set: { gameId: 1 } }, { upsert: true });
      gameId = 1;
    }
    console.log (gameId);
    const history = await staticCollection.findOne({gameId});
    console.log(history);
    const data = {
      txnHistory: history.txnHistory,
    };
    res.status(200).send({ message: 'Success', data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
})

app.get("/winnerList", async (req, res) => {
  try {
    let {gameId} = await staticCollection.findOne();
    console.log (gameId);
    if (!gameId) {
      staticCollection.updateOne({}, { $set: { gameId: 1 } }, { upsert: true });
      gameId = 1;
    }
    console.log (gameId);
    const cursor = await gameCollection.find({gameId: {$lt: gameId}});
    const game = [];
    for await (const doc of cursor) {
      game.push(doc)
    }
    console.log(game);
    res.status(200).send({ message: 'Success', data: game });
    
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
})

app.get('/totalBet/:position', async (req, res) => {
  try {
    let { position } = req.params;
    position = parseInt(position);
    let {gameId} = await staticCollection.findOne();
    console.log (gameId);
    if (!gameId) {
      staticCollection.updateOne({}, { $set: { gameId: 1 } }, { upsert: true });
      gameId = 1;
    }

    const game = await positionCollection.findOne({gameId, position: {$eq: position}});
    console.log (game);
    res.status(200).send({ message: 'Success', data: game.totalAmount });


  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
})

app.get('/totalPeopleBet/:position', async (req, res) => {
  try {
    let { position } = req.params;
    position = parseInt(position);
    let {gameId} = await staticCollection.findOne();
    console.log (gameId);
    if (!gameId) {
      staticCollection.updateOne({}, { $set: { gameId: 1 } }, { upsert: true });
      gameId = 1;
    }

    const game = await positionCollection.findOne({gameId, position: {$eq: position}});
    console.log (game);
    res.status(200).send({ message: 'Success', data: game.participants.length });


  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
})



// Only Admin functions here ----------------------------------------------

app.get('/allUsers', async (req, res) => {
  try {

    // only Admins can update the game details
    const admins = (process.env.WHITELISTED_ADDRESSES || '').split(' ');
    if (!admins.includes(req.body.user.address)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const data = await userCollection.find({}).toArray();
    res.status(200).send({ message: 'Success', data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
})

app.get('/allPositions', async (req, res) => {
  try {

    // only Admins can update the game details
    const admins = (process.env.WHITELISTED_ADDRESSES || '').split(' ');
    if (!admins.includes(req.body.user.address)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const data = await positionCollection.find({}).toArray();
    res.status(200).send({ message: 'Success', data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
});

app.get('/allGames', async (req, res) => {
  try {

    // only Admins can update the game details
    const admins = (process.env.WHITELISTED_ADDRESSES || '').split(' ');
    if (!admins.includes(req.body.user.address)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const data = await gameCollection.find({}).toArray();
    res.status(200).send({ message: 'Success', data });
  } catch (error) {
    console.error('Error fetching gameInfo', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
})

module.exports = app;
