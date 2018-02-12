"use strict"

// Functions for Bitfinex exchange
//

require("dotenv").config()

const crypto = require("crypto")
const request = require("request")
const BFX = require("bitfinex-api-node")

const SLEEP = 6000 // ms to wait between API calls
const RESULTS = 50 // number of results to request from API
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
const getCandles = async(pair, timeframe) => {
  return new Promise((resolve, reject) => {
    let response = null

    bfxRest.candles({
      symbol: pair,
      timeframe: timeframe,
      section: "hist"
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

// formats data rows into object
const formatData = async (data, labels) => {
  let formattedData = []

  for (let i = 0; i < data.length; i++) {
    let row = {}

    for (let j = 0; j < labels.length; j++) {
      row[labels[j]] = data[i][j]
    }

    formattedData.push(row)
  }

  return formattedData
}

module.exports = {
  getCandles,
  formatData,
  labels
}