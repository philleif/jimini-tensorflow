"use strict"

// Functions for Bitfinex exchange
//

require("dotenv").config()

const axios = require("axios")
const BFX = require("bitfinex-api-node")

const SLEEP = 2500 // ms to wait between API calls
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

// fetches candles
//
const getCandles = async (pair, timeframe) => {
  await sleep(SLEEP)

  return new Promise((resolve, reject) => {
    let response = null

/*    bfxRest.candles(
      {
        symbol: pair,
        timeframe: timeframe,
        section: "hist"
      },
      (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data.reverse()) // oldest to newest
        }
      }
    )*/

    axios.get(
      `https://api.bitfinex.com/v2/candles/trade:${timeframe}:${pair}/hist?limit=500`
    ).then((results) => {
      resolve(results.data.reverse())
    })
  })
}

module.exports = {
  getCandles,
  labels
}
