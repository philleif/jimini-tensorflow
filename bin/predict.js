"use strict"

const exchanges = require("../lib/exchanges")
const csv = require("../lib/csv")
const config = require("config")
const db = require("../lib/db")
const trade = require("../lib/trade")
const indicators = require("../lib/indicators").indicators
const agenda = require("../lib/agenda").agenda

// TODO: move these to config
let PAIR = "tNEOUSD"
let TIMEFRAME = "1m"
let TRADE_AMOUNT = 5

const TIMEFRAMES = {
  "1m": "1 minute",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "30m": "30 minutes",
  "1h": "1 hour",
  "3h": "3 hours"
}

const run = async () => {
  agenda.define("run loop", async (job, done) => {
    console.log("Running prediction loop...", Date())

    await runLoop()

    done()
  })

  agenda.on("ready", function() {
    agenda.every(TIMEFRAMES[TIMEFRAME], "run loop")

    agenda.start()
  })
}

const runLoop = async () => {
  try {
    // get candles and compute indicators
    let exchangeData = await exchanges.getCandles(PAIR, TIMEFRAME)
    let dataLabels = exchanges.labels
    let data = {}

    for (let i = 0; i < dataLabels.length; i++) {
      data[dataLabels[i]] = []

      for (let j = 0; j < exchangeData.length; j++) {
        data[dataLabels[i]].push(exchangeData[j][i])
      }
    }

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

    // need the second to last candle to pull PPO
    // TODO: is this an offset bug?
    let lastCandles = [data[data.length - 1], data[data.length - 2]]

    // get prediction
    let predictObject = {
      apo: lastCandles[0].apo,
      bop: lastCandles[0].bop,
      tsf_net_percent: lastCandles[0].tsf_net_percent,
      ppo: lastCandles[1].ppo
    }

    let prediction = await trade.getPrediction(predictObject)

    console.log("Prediction:", prediction)

    // check for existing position
    let position = await db.Position.findOne({
      pair: PAIR,
      status: "OPEN"
    })

    // prediction: BUY, no current position
    // open a new position
    if (prediction === "BUY" && !position) {
      position = await new db.Position({
        pair: PAIR,
        timeframe: TIMEFRAME,
        time: lastCandles[0].mts,
        amount: TRADE_AMOUNT,
        status: "OPEN",
        exchange: "bitfinex"
      })

      position.openPrice = await exchanges.getPrice(PAIR)

      await position.save()
      console.log("Opened position", PAIR, TIMEFRAME)
    }

    // prediction: SELL, current open position
    // close position
    if (prediction === "SELL" && position) {
      position.closePrice = await exchanges.getPrice(PAIR)
      position.status = "CLOSED"

      await position.save()
      console.log("Closed position", PAIR, TIMEFRAME)
    }

    return true
  } catch (error) {
    throw error
  }
}

run()
