"use strict"

// Functions for Bitfinex exchange
//

require("dotenv").config()

const axios = require("axios")
const BFX = require("bitfinex-api-node")

const SLEEP = 10 // ms to wait between API calls
const labels = ["mts", "open", "close", "high", "low", "volume"]

const bfx = new BFX({
  apiKey: process.env.BITFINEX_API_KEY,
  apiSecret: process.env.BITFINEX_API_SECRET
})

const bfxRest = bfx.rest()

// delay execution to respect API rate limits
//
function sleep(ms = 0) {
  return new Promise(r => setTimeout(r, ms))
}

// fetch price
//
const getPrice = async pair => {
  return new Promise((resolve, reject) => {
    bfxRest.ticker(pair,
      (err, data) => {
        if (err) {
          reject(err)
        } else {
          console.log(data[0])
          resolve(data[0])
        }
      }
    )
  })
}

// fetches candles
//
const getCandles = async (pair, timeframe) => {
  await sleep(SLEEP)

  return new Promise((resolve, reject) => {
    let response = null

    axios
      .get(
        `https://api.bitfinex.com/v2/candles/trade:${timeframe}:${pair}/hist?limit=500`
      )
      .then(results => {
        resolve(results.data.reverse())
      })
  })
}

module.exports = {
  getCandles,
  getPrice,
  labels
}
