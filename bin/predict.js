"use strict"

const exchanges = require("../lib/exchanges")
const csv = require("../lib/csv")
const config = require("config")
const db = require("../lib/db")
const trade = require("../lib/trade")
const indicators = require("../lib/indicators")
const agenda = require("../lib/agenda").agenda

const TIMEFRAME = config.get("trading.timeframe")
const TIMEFRAMES = config.get("timeframes")

const run = async () => {
  try {
    console.log("Starting up...")

    //db.Position.remove({}, function() {})
    db.AgendaJob.remove({}, function() {})

    agenda.define(
      "main trading loop",
      { priority: "high", concurrency: 3 },
      async (job, done) => {
        try {
          for (let pair of config.get("trading.pairs")) {
            agenda.now("run loop", { pair: pair, timeframe: TIMEFRAME })
          }

          done()
        } catch (error) {
          console.log(error)
          done()
        }
      }
    )

    agenda.define(
      "run loop",
      { priority: "high", concurrency: 3 },
      async (job, done) => {
        try {
          let data = job.attrs.data
          await runLoop(data.pair, data.timeframe)

          done()
        } catch (error) {
          console.log(error)
          done()
        }
      }
    )

    agenda.define(
      "check prices",
      { priority: "low", concurrency: 5 },
      async (job, done) => {
        try {
          let position = job.attrs.data.position

          // check the current price
          let currentPrice = await exchanges.getPrice(position.pair)

          // capture profit or hit stop loss
          console.log(
            "Price watch:",
            position.pair,
            "/ Current:",
            currentPrice,
            "Goal:",
            position.forecastHigh,
            "Stop:",
            position.forecastLow
          )

          if (
            currentPrice >= position.forecastHigh ||
            currentPrice < position.forecastLow
          ) {
            trade.closePosition(position, currentPrice)
          }

          done()
        } catch (error) {
          console.log(error)
          done()
        }
      }
    )

    agenda.define("price loop", async (job, done) => {
      try {
        // check prices changes to lock in profit
        let positions = await db.Position.find({ status: "OPEN" })

        for (let position of positions) {
          agenda.now("check prices", { position: position })
        }

        done()
      } catch (error) {
        console.log(error)
        done()
      }
    })

    agenda.on("ready", async () => {
      // run candle prediction loop
      agenda.every(TIMEFRAMES[TIMEFRAME], "main trading loop")

      agenda.every("1 minute", "price loop")

      agenda.start()
    })
  } catch (error) {
    throw error
  }
}

const runLoop = async (pair, timeframe) => {
  try {
    console.log(pair, "Running prediction loop", timeframe, "...")

    let exchangeData = await exchanges.getCandles(pair, timeframe)
    let dataLabels = exchanges.labels
    let data = await indicators.formatIndicatorData(exchangeData, dataLabels)

    await csv.writeCsv(data, `./tmp/prophet-${pair}.csv`)

    let prophetForecasts = await trade.prophetPromise(pair)
    let ppoForecast = await trade.ppoPromise(pair)
    let lastCandle = data[data.length - 1]

    // get prediction
    let predictObject = {
      apo: lastCandle.apo,
      bop: lastCandle.bop,
      tsf_net_percent: lastCandle.tsf_net_percent,
      emv: lastCandle.emv,
      ppo: ppoForecast
    }

    let prediction = await trade.getPrediction(predictObject, pair)

    console.log(pair, "- Prediction:", prediction.strategy)

    // check for existing position
    let position = await db.Position.findOne({
      pair: pair,
      status: "OPEN"
    })

    // calculate max drawdown
    let openPositions = await db.Position.find({ status: "OPEN" })
    let currentDrawdown = openPositions.reduce((acc, p) => {
      return acc + p.amount * p.openPrice
    }, 0)

    // prediction: BUY, no current position
    // open a new position
    if (prediction.strategy === "BUY" && !position) {
      trade.openPosition(
        pair,
        prophetForecasts,
        lastCandle,
        prediction.probabilities.buy
      )
    }

    // prediction: SELL, current open position
    // close position
    if (prediction.strategy === "SELL" && position) {
      let currentPrice = await exchanges.getPrice(pair)

      trade.closePosition(position, currentPrice)
    }

    return true
  } catch (error) {
    throw error
  }
}

run()
