const jwt = require('jsonwebtoken');
require('dotenv').config();

const verify = (req, res, next) => {
  try {
    const token = req.headers['authorization'];
    const details = jwt.verify(token, process.env.SECRET_KEY);
    req.body.user = details;
    next();
  } catch (err) {
    console.log(err.message);
    if (err.message === 'jwt expired') {
      return res.status(403).send({ error: 'Token expired' });
    }
    return res.status(403).send({ error: 'Invalid Token' });
  }
};

module.exports = verify;
