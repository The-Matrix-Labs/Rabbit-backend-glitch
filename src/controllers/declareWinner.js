const { getDB } = require('../config/db');
const db = getDB();
const { ObjectId } = require('mongodb');

const depositTransactionCollection = db.collection('depositTransaction');
const userCollection = db.collection('userData');
const positionCollection = db.collection('positions');
const gameCollection = db.collection('games');

let gameId = { value: 0 };
const values = [1, 2, 3, 4];

async function checkTime() {
  try {
    console.log('...');
    const game = await gameCollection.findOne({ gameId: gameId.value });
    const currentTime = new Date().getTime();

    // if nothing exists then create
    if (!game) {
      await gameCollection.insertOne({
        gameId: gameId.value,
        startTime: currentTime + 1000 * 60 * 60,
        winnerAnnouncementTime: currentTime + 1000 * 60 * 60 * 2,
        announcedWinner: getRandomNumberFromSet(),
        totalAmount: 0,
      });
      return;
    }

    if (currentTime > game.winnerAnnouncementTime) {
      console.log('announce winner');
      manageTransactions(game.announcedWinner, game.totalAmount * 0.9, gameId.value);

      // create new document for game and position
      gameId.value++;
      const gameSchema = {
        gameId: gameId.value,
        startTime: currentTime + 1000 * 60 * 60,
        winnerAnnouncementTime: currentTime + 1000 * 60 * 60 * 2,
        announcedWinner: getRandomNumberFromSet(),
        totalAmount: 0,
      };
      const positionSchema = {
        gameId: gameId.value,
        position: 0,
        participants: [],
        totalAmount: 0,
      };

      Promise.all([
        gameCollection.insertOne(gameSchema),
        positionCollection.insertOne({ ...positionSchema, position: 0 }),
        positionCollection.insertOne({ ...positionSchema, position: 1 }),
        positionCollection.insertOne({ ...positionSchema, position: 2 }),
        positionCollection.insertOne({ ...positionSchema, position: 3 }),
      ]);
    }
  } catch (error) {
    console.log('Error in check time', error);
  }
}

async function manageTransactions(winPosition, poolSize, gameId) {
  try {
    let position = await positionCollection.findOne({ gameId, position: winPosition });
    let participantIds = position.participants.map((participant) => participant._id);

    const bulkUpdateWinners = participantIds.map((id, index) => {
      const contribution = position.participants[index].contribution;
      const amountToAddToBalance = (contribution / position.totalAmount) * poolSize;

      const bettingHistoryInfo = {
        gameId,
        status: 'won',
      };

      return [
        {
          updateOne: {
            filter: { _id: ObjectId(id) },
            update: { $inc: { balance: amountToAddToBalance } },
          },
        },
        {
          updateOne: {
            filter: { _id: ObjectId(id) },
            update: { $push: { bettingHistory: bettingHistoryInfo } },
          },
        },
      ];
    });

    // Perform bulkWrite to execute multiple update operations in a single batch
    await userCollection.bulkWrite(bulkUpdateWinners.flat());

    // ----------------------------------------------------------

    for (let n of values) {
      if (n === winPosition) continue;

      position = await positionCollection.findOne({ gameId, position: n });
      participantIds = position.participants.map((participant) => participant._id);
      const bulkUpdateLosers = participantIds.map((id) => {
        const bettingHistoryInfo = {
          gameId,
          status: 'lost',
        };

        return [
          {
            updateOne: {
              filter: { _id: ObjectId(id) },
              update: { $push: { bettingHistory: bettingHistoryInfo } },
            },
          },
        ];
      });
      await userCollection.bulkWrite(bulkUpdateLosers.flat());
    }
  } catch (error) {
    console.log('Manage Transactions error', error);
  }
}

function getRandomNumberFromSet() {
  const randomIndex = Math.floor(Math.random() * values.length);
  const randomNumber = values[randomIndex];
  return randomNumber;
}

module.exports = { checkTime, gameId };
