"use strict"

require("dotenv").config()

const mongoose = require("mongoose")
const DB_URL = process.env.DB_URL

const JobSchema = new mongoose.Schema(
  {
    nextRunAt: Date
  },
  { collection: "agendaJobs" }
)

const AgendaJob = mongoose.model("AgendaJob", JobSchema)

const Order = mongoose.model(
  "Trade",
  new mongoose.Schema({
    pair: String,
    position: String,
    price: Number,
    time: Date,
    amount: Number,
    cid: String,
    oid: String
  })
)

const Position = mongoose.model(
  "Position",
  new mongoose.Schema({
    pair: String,
    strategy: String, // SHORT or LONG
    timeframe: String,
    exchange: String,
    openPrice: Number,
    forecastPercent: Number, // TODO: refactor this out
    forecastHigh: Number,
    forecastLow: Number,
    closePrice: Number,
    net: Number,
    orderCount: Number,
    probability: Number,
    time: Date,
    status: String, // OPEN or CLOSED
    amount: Number,
    cid: String,
    oid: String
  })
)

async function run() {
  // No need to `await` on this, mongoose 4 handles connection buffering
  // internally
  mongoose.connect(DB_URL)
}

run().catch(error => console.error(error.stack))

module.exports = {
  Order,
  Position,
  AgendaJob
}
