const express = require('express');
const { connectToDB } = require('./config/db');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: '*',
  })
);

connectToDB()
  .then((res) => {
    app.listen(process.env.PORT || 8080, async () => {
      console.log('Listning on 8080');

      const { checkTime } = require('./controllers/declareWinner');
      const authRoutes = require('./routes/auth.routes');
      const betRoutes = require('./routes/bet.routes');
      const dataRoutes = require('./routes/data.routes');

      setInterval(() => {
        checkTime();
      }, 5000);

      app.use('/', authRoutes);
      app.use('/', betRoutes);
      app.use('/', dataRoutes);
    });
  })
  .catch((err) => console.log(err));
