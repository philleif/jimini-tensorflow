"use strict"

require("../lib/agenda")
const exchanges = require("../lib/exchanges")
const csv = require("../lib/csv")
const config = require("config")
const db = require("../lib/db")
const trade = require("../lib/trade")
const indicators = require("../lib/indicators").indicators
const agenda = require("../lib/agenda").agenda

let PAIRS = config.get("trading.pairs")
let TIMEFRAME = config.get("trading.timeframe")
let TRADE_BALANCE = config.get("trading.balance") // per currency
let MAX_DRAWDOWN = config.get("trading.drawdown") // total
const TIMEFRAMES = config.get("timeframes")

const run = async () => {
  try {
    db.Position.remove({}, function() {})
    db.AgendaJob.remove({}, function() {})

    agenda.define("run loop", async (job, done) => {
      try {
        console.log("Running prediction loop...", Date())

        for (let pair of config.get("trading.pairs")) {
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
  // get candles and compute indicators
  console.log("Running prediction loop for", pair, timeframe, "...")

  let exchangeData = await exchanges.getCandles(pair, timeframe)
  let dataLabels = exchanges.labels
  let data = indicators.formatIndicatorData(exchangeData, dataLabels)

  await csv.writeCsv(data, "./tmp/prophet.csv")

  let prophetForecasts = await trade.getProphetorecast()
  let lastCandle = data[data.length - 1]

  // get prediction
  let predictObject = {
    apo: lastCandle.apo,
    bop: lastCandle.bop,
    tsf_net_percent: lastCandle.tsf_net_percent,
    emv: lastCandle.emv,
    ppo_smoothed: prophetForecasts.ppo
  }

  let prediction = await trade.getPrediction(predictObject).prediction

  console.log("Prediction:", prediction)

}

const currentPrice = async pair => {
  try {
    return await exchanges.getPrice(pair)
  } catch (error) {
    throw error
  }
}

run()
