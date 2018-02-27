"use strict"

// Functions for Bitfinex exchange
//

require("dotenv").config()

const axios = require("axios")
const BFX = require("bitfinex-api-node")
const Order = BFX.Models.Order
const SLEEP = 6000 // ms to wait between API calls
const labels = ["mts", "open", "close", "high", "low", "volume"]

const bfx = new BFX({
  apiKey: process.env.BITFINEX_API_KEY,
  apiSecret: process.env.BITFINEX_API_SECRET
})

const bfxRest = bfx.rest()
const ws = bfx.ws(2)

ws.on("error", err => {
  console.log(err)
})

ws.on("open", () => {
  ws.auth()
})

ws.open()

const placeOrder = async (pair, amount) => {
  return new Promise(async (resolve, reject) => {
    // make sure we're still authenticated
    if (!ws._isAuthenticated) {
      ws.auth()
      await sleep(500)
    }

    // Build new order
    const o = new Order(
      {
        cid: Date.now(),
        symbol: pair,
        amount: amount,
        type: "MARKET"
      },
      ws
    )

    // Enable automatic updates
    o.registerListeners()

    console.log("submitting order %d", o.cid)

    o
      .submit()
      .then(() => {
        console.log("got submit confirmation for order %d [%d]", o.cid, o.id)
        resolve({
          cid: o.cid,
          id: o.id
        })
      })
      .catch(err => {
        reject(err)
      })
  })
}

// delay execution to respect API rate limits
//
function sleep(ms = 0) {
  return new Promise(r => setTimeout(r, ms))
}

// fetch multiple ticker prices
//
const getPrices = async pairs => {
  return new Promise((resolve, reject) => {
    bfxRest.tickers(pairs, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data[0])
      }
    })
  })
}

// fetch price
//
const getPrice = async pair => {
  return new Promise((resolve, reject) => {
    bfxRest.ticker(pair, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data[0])
      }
    })
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
  placeOrder,
  labels
}
