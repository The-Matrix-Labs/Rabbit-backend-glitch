const express = require('express');
const { ethers } = require('ethers');
const { getDB } = require('../config/db');
const verify = require('../middlewares/verify');
const contractAbi = require('../abi/contractAbi.json');
const { ObjectId } = require('mongodb');

const app = express.Router();
const db = getDB();
const depositTransactionCollection = db.collection('depositTransaction');
const userCollection = db.collection('userData');
const positionCollection = db.collection('positions');
const gameCollection = db.collection('games');
const staticCollection = db.collection('static');

app.use(verify);

app.post('/deposit', async (req, res) => {
  try {
    const { transactionHash, user } = req.body;

    // Check if the transaction is completed else wait
    const provider = new ethers.providers.JsonRpcProvider(process.env.JSON_RPC_PROVIDER);
    const transaction = await provider.getTransaction(transactionHash);
    await transaction.wait();
    const iface = new ethers.utils.Interface(contractAbi);
    const transactionData = iface.parseTransaction({ data: transaction.data, value: transaction.value });
    // transactionData.args to find the arguments passed in the transaction
    // transactionData.name to find the function name

    // Check if the transaction hash is already present in the depositTransaction collection
    const existingTransaction = await depositTransactionCollection.findOne({ transactionHash });
    if (existingTransaction) {
      return res.status(409).send({ error: 'Transaction hash already exists' });
    }

    // update user document
    const transactionInfo = {
      amount: 100,
      type: 'deposit',
      transactionHash: transactionHash,
    };
    await userCollection.updateOne(
      { _id: ObjectId(user._id) }, // Convert _id to ObjectId (if using MongoDB's default ObjectID)
      {
        $push: { txnHistory: transactionInfo },
        $inc: { balance: transactionInfo.amount }, // Increment the balance with the deposit amount
      }
    );
    const updatedUser = await userCollection.findOne({ _id: ObjectId(user._id) });

    // Add the transaction hash to the collection
    await depositTransactionCollection.insertOne({ transactionHash });
    res.status(200).send({ user: updatedUser, message: 'Transaction successful' });
  } catch (error) {
    console.error('Error processing deposit:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
});

app.post('/place-bet', async (req, res) => {
  try {
    let gameId = await staticCollection.findOne();
    if (!gameId) {
      staticCollection.updateOne({}, { $set: { gameId: 1 } }, { upsert: true });
      gameId = 1;
    }else gameId = gameId.gameId;

    const { position, user, amount } = req.body;
    if (amount <= 0) {
      return res.status(400).send({ error: 'Amount must be greater than 0' });
    }

    // check if game has not started
    const game = await gameCollection.findOne({ gameId });
    if (new Date().getTime() > game.startTime) {
      return res.status(400).send({ error: 'Game start time has passed' });
    }

    // check balance of user
    const userDetails = await userCollection.findOne({ _id: ObjectId(user._id) });
    if (userDetails.balance < amount) {
      return res.status(400).send({ error: 'Insufficient balance' });
    }

    // check if position exists
    const betPosition = await positionCollection.findOne({ gameId, position });
    if (!betPosition) {
      return res.status(400).send({ error: 'Position does not exist' });
    }

    // update user balance, position & game
    const existingParticipant = await positionCollection.findOne({
      gameId,
      position,
      'participants._id': ObjectId(user._id),
    });

    if (existingParticipant) {
      // If the participant is already present, update their contribution
      await positionCollection.updateOne({ gameId, position, 'participants._id': ObjectId(user._id) }, { $inc: { 'participants.$.contribution': amount, totalAmount: amount } });
    } else {
      // If the participant is not present, add a new participant with their contribution
      await positionCollection.updateOne(
        { gameId, position },
        {
          $addToSet: { participants: { _id: ObjectId(user._id), contribution: amount } },
          $inc: { totalAmount: amount },
        },
        { upsert: true } // This option adds the document if not found (upsert)
      );
    }

    await userCollection.updateOne(
      { _id: ObjectId(user._id) },
      {
        $push: {
          txnHistory: {
            amount,
            type: 'bet',
            position,
            gameId,
          },
        },
        $inc: { balance: -amount }, // Increment the balance with the deposit amount
      }
    );

    await gameCollection.updateOne(
      { gameId },
      {
        $inc: {
          totalAmount: amount,
        },
      }
    );

    await staticCollection.updateOne({}, {
      $push: {
         txnHistory: {
          amount,
          type: 'bet',
          position,
          gameId,
        },
      }
    }, { upsert: true });

    const updatedUser = await userCollection.findOne({ _id: ObjectId(user._id) });
    const updatedPosition = await positionCollection.findOne({ gameId, position });

    res.status(200).send({ user: updatedUser, position: updatedPosition, message: 'Transaction successful' });
  } catch (error) {
    console.error('Error placing bet:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Only Admin routes here --------------------------------------------------------

app.post ('/addGameDetails', async (req, res) => {
  try{

    // only Admins can update the game details
    const admins = (process.env.WHITELISTED_ADDRESSES || '').split(' ');
    if (!admins.includes(req.body.user.address)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    // set details
    const {gameId, startTime, endTime} = req.body;
    const gameDetails = await gameCollection.findOne({gameId});
    if(gameDetails){
      return res.status(400).send({error: 'Game already exists'});
    }
    await gameCollection.insertOne({gameId, startTime, endTime, totalAmount: 0});
    res.status(200).send({message: 'Game details added'});
  } catch(error){
    console.error('Error adding game details:', error);
    return res.status(500).send({error: 'Internal Server Error'});
  }
})

app.post ('/updateGameDetails', async (req, res) => {
  try {

    // only Admins can update the game details
    const admins = (process.env.WHITELISTED_ADDRESSES || '').split(' ');
    if (!admins.includes(req.body.user.address)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const {gameId, startTime, endTime} = req.body;
    const gameDetails = await gameCollection.findOne({gameId});

    // if the data not sent then use the existing data
    if(gameDetails){
      if (!startTime) startTime = gameDetails.startTime;
      if (!endTime) endTime = gameDetails.endTime;
    }

    await gameCollection.updateOne({gameId}, {$set: {startTime, endTime}}, { upsert: true });
    res.status(200).send({message: 'Game details updated'});
  } catch(error){
    console.error('Error updating game details:', error);
    return res.status(500).send({error: 'Internal Server Error'});
  }
})

app.post ('/setResults', async (req, res) => {
  try {

    // only Admins can update the game details
    const admins = (process.env.WHITELISTED_ADDRESSES || '').split(' ');
    if (!admins.includes(req.body.user.address)) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const {gameId, announcedWinner} = req.body;
    const gameDetails = await gameCollection.findOne({gameId});

    // if the data not sent then use the existing data
    if(gameDetails){
      if (!announcedWinner) announcedWinner = gameDetails.announcedWinner;
    }

    await gameCollection.updateOne({gameId}, {$set: {announcedWinner}}, { upsert: true });
    res.status(200).send({message: 'Game details updated'});
  } catch(error){
    console.error('Error updating game details:', error);
    return res.status(500).send({error: 'Internal Server Error'});
  }
})


module.exports = app;
