"use strict"

// Utility functions for trades
//

const { exec } = require("child_process")
const fs = require("fs")
const exchanges = require("./exchanges")
const csv = require("./csv")
const db = require("./db")
const config = require("config")

const MODE = config.get("trading.mode")
const STRATEGIES = {
  "1": "BUY",
  "0": "SELL"
}

const closePosition = async (position, price) => {
  try {
    let p = await db.Position.findOne({
      status: "OPEN",
      pair: position.pair
    })

    p.closePrice = price
    p.net = p.amount * (p.closePrice - p.openPrice)
    p.status = "CLOSED"

    if (MODE === "live") {
      let closeAmount = -1 * p.amount
      let order = await exchanges.placeOrder(p.pair, closeAmount)

      p.cid = order.cid
      p.oid = order.oid
    }

    await p.save()

    console.log("Closed position", p.pair)
  } catch (error) {
    throw error
  }
}

const openPosition = async (
  pair,
  prophetForecasts,
  lastCandle,
  probability
) => {
  try {
    let newPosition = await new db.Position({
      pair: pair,
      forecastHigh: prophetForecasts.high,
      forecastLow: prophetForecasts.low,
      timeframe: config.get("trading.timeframe"),
      time: lastCandle.mts,
      status: "OPEN",
      exchange: "bitfinex",
      orderCount: 1
    })

    newPosition.openPrice = await exchanges.getPrice(pair)

    // fixes a case where the prediction is less than the current price
    if (newPosition.openPrice > prophetForecasts.high) {
      newPosition.forecastHigh = newPosition.openPrice * 1.02
    }

    newPosition.amount = Math.round(
      config.get("trading.balance") /
        newPosition.openPrice *
        (probability * probability) // auto format doesn't handle ^2
    )

    if (newPosition.amount < 1) {
      newPosition.amount = 1
    }

    if (MODE === "live") {
      let order = await exchanges.placeOrder(
        newPosition.pair,
        newPosition.amount
      )

      newPosition.cid = order.cid
      newPosition.oid = order.oid
    }

    await newPosition.save()

    console.log(
      "Opened position",
      newPosition.amount,
      pair,
      "@",
      newPosition.openPrice
    )
  } catch (error) {
    throw error
  }
}

const prophetPromise = async pair => {
  return new Promise((resolve, reject) => {
    console.log(pair, "- Getting forecast from Prophet...")
    exec(
      `python bin/python/prophet.py --csv ./tmp/prophet-${pair}.csv`,
      (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          console.log(err)
        }

        let highRegex = /UPPER:\n(\d.*)/
        let highPrediction = `${highRegex.exec(stdout)[1]}`

        let lowRegex = /LOWER:\n(\d.*)/
        let lowPrediction = `${lowRegex.exec(stdout)[1]}`

        resolve({
          high: Number(highPrediction),
          low: Number(lowPrediction)
        })
      }
    )
  })
}

const getPrediction = async (predictionObject, pair) => {
  return new Promise(async (resolve, reject) => {
    await writeFilePromise(predictionObject, pair)

    exec(
      `gcloud ml-engine predict --model jimini --version v4 --json-instances ./tmp/predictionObject-${pair}.json`,
      (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          reject(err)
        }

        console.log(stdout)

        let regex = /\[(\d)\]/
        let prediction = `${regex.exec(stdout)[1]}`

        let probabilityRegex = /(\d\.\d*, \d\.\d*)/
        let probabilityString = `${probabilityRegex.exec(stdout)[1]}`
        let probabilityArray = probabilityString.split(", ")
        let probabilities = {
          sell: Number(probabilityArray[0]),
          buy: Number(probabilityArray[1])
        }

        resolve({
          strategy: STRATEGIES[prediction],
          probabilities: probabilities
        })
      }
    )
  })
}

const writeFilePromise = async (content, pair) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      `./tmp/predictionObject-${pair}.json`,
      JSON.stringify(content),
      function(err) {
        if (err) {
          reject(err)
        }
        resolve(true)
      }
    )
  })
}

const ppoPromise = async pair => {
  return new Promise((resolve, reject) => {
    console.log(pair, "- Getting PPO forecast from RNN...")
    exec(
      `python bin/python/ppo.py --csv ./tmp/prophet-${pair}.csv`,
      (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          console.log(err)
          console.log(stderr)
          reject(err)
        }

        let ppoRegex = /\*\*\n(.*)/
        let ppoPrediction = `${ppoRegex.exec(stdout)[1]}`

        resolve(Number(ppoPrediction))
      }
    )
  })
}

module.exports = {
  getPrediction,
  prophetPromise,
  ppoPromise,
  closePosition,
  openPosition
}
