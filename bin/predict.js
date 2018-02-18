"use strict"

const exchanges = require("../lib/exchanges")
const csv = require("../lib/csv")
const config = require("config")
const db = require("../lib/db")
const trade = require("../lib/trade")
const indicators = require("../lib/indicators").indicators
const agenda = require("../lib/agenda").agenda

let PAIRS = config.get("trading.pairs")
let TIMEFRAME = config.get("trading.timeframe")
let TRADE_AMOUNT = 5
let TRADE_BALANCE = 1000 // per currency

// bitfinex to agenda dictionary
const TIMEFRAMES = {
  "1m": "1 minute",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "30m": "30 minutes",
  "1h": "1 hour",
  "3h": "3 hours"
}

const run = async () => {
  try {
    console.log("Starting up...")

    db.Position.remove({}, function() {})
    db.AgendaJob.remove({}, function() {})

    agenda.define("run loop", async (job, done) => {
      try {
        console.log("Running prediction loop...", Date())

        // TODO: separate job for each pair/timeframe
        // rate limits?
        for (let pair of PAIRS) {
          await runLoop(pair, TIMEFRAME)
        }

        done()
      } catch (error) {
        console.log(error)
        done()
      }
    })

    agenda.on("ready", async () => {
      agenda.every(TIMEFRAMES[TIMEFRAME], "run loop")

      agenda.start()
    })
  } catch (error) {
    throw error
  }
}

const runLoop = async (pair, timeframe) => {
  try {
    console.log("Running prediction loop for", pair, timeframe, "...")

    // get candles and compute indicators
    let exchangeData = await exchanges.getCandles(pair, timeframe)
    let dataLabels = exchanges.labels
    let data = {}

    for (let i = 0; i < dataLabels.length; i++) {
      data[dataLabels[i]] = []

      for (let j = 0; j < exchangeData.length; j++) {
        data[dataLabels[i]].push(exchangeData[j][i])
      }
    }

    // TODO: use current currency price (not close price) when calculating
    // indicators

    // fetch indicator data
    for (let indicator of config.get("indicators")) {
      let indicatorData = await indicators[indicator](data)

      // add additional labels and indicator data
      for (let field of Object.keys(indicatorData)) {
        dataLabels.push(field)
        data[field] = indicatorData[field]
      }
    }

    data = await csv.formatDataForCsv(data)

    let lastCandle = data[data.length - 1]

    console.log(lastCandle)

    // get prediction
    let predictObject = {
      apo: lastCandle.apo,
      bop: lastCandle.bop,
      tsf_net_percent: lastCandle.tsf_net_percent,
      emv: lastCandle.emv,
      ppo_smoothed: lastCandle.ppo_smoothed
    }

    console.log(predictObject)

    let prediction = await trade.getPrediction(predictObject)

    console.log("Prediction:", prediction)

    // check for existing position
    let position = await db.Position.findOne({
      pair: pair,
      status: "OPEN"
    })

    // prediction: BUY, no current position
    // open a new position
    if (prediction === "BUY" && !position) {
      let newPosition = await new db.Position({
        pair: pair,
        timeframe: timeframe,
        time: lastCandle.mts,
        status: "OPEN",
        exchange: "bitfinex",
        orderCount: 1
      })

      newPosition.openPrice = await exchanges.getPrice(pair)
      newPosition.amount = Math.round(TRADE_BALANCE / newPosition.openPrice)

      await newPosition.save()

      console.log(
        "Opened position",
        newPosition.amount,
        pair,
        timeframe,
        "@",
        newPosition.openPrice
      )
    }

    // prediction BUY, current open position
    // accumulate
    if (prediction === "BUY" && position) {
      let newPrice = await exchanges.getPrice(pair)
      let prevAmount = position.amount
      let addlAmount = Math.round(TRADE_BALANCE / position.openPrice)
      console.log(newPrice, prevAmount)

      // TODO: test this math
      position.amount += addlAmount
      position.orderCount += 1

      console.log(
        newPrice,
        prevAmount,
        position.openPrice,
        position.amount,
        position.orderCount
      )

      position.openPrice =
        (position.openPrice * prevAmount + newPrice * addlAmount) /
        position.amount

      await position.save()
    }

    // prediction: SELL, current open position
    // close position
    if (prediction === "SELL" && position) {
      position.closePrice = await exchanges.getPrice(pair)
      position.net =
        position.amount * (position.closePrice - position.openPrice)
      position.status = "CLOSED"

      await position.save()
      console.log("Closed position", pair, timeframe)
    }

    return true
  } catch (error) {
    throw error
  }
}

run()
