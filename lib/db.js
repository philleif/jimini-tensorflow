'use strict'

require('dotenv').config()

const mongoose = require('mongoose')
const DB_URL = process.env.DB_URL

const Order = mongoose.model('Trade', new mongoose.Schema({
  pair: String,
  exchange: String,
  position: String,
  price: Number,
  time: Date,
  amount: Number
}))

const Position = mongoose.model('Position', new mongoose.Schema({
  pair: String,
  timeframe: String,
  exchange: String,
  openPrice: Number,
  closePrice: Number,
  time: Number,
  status: String,
  amount: Number
}))

async function run() {
  // No need to `await` on this, mongoose 4 handles connection buffering
  // internally
  mongoose.connect(DB_URL);
}

run().catch(error => console.error(error.stack))

module.exports = {
  Order,
  Position
}