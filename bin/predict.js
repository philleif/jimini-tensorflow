"use strict"

const exchanges = require("../lib/exchanges")
const csv = require("../lib/csv")
const config = require("config")
const db = require("../lib/db")
const trade = require("../lib/trade")

const indicators = require("../lib/indicators")
const agenda = require("../lib/agenda").agenda

let TIMEFRAME = config.get("trading.timeframe")
let TRADE_BALANCE = config.get("trading.balance") // per currency
let MAX_DRAWDOWN = config.get("trading.drawdown") // total
const TIMEFRAMES = config.get("timeframes")

const run = async () => {
  try {
    console.log("Starting up...")

    db.Position.remove({}, function() {})
    db.AgendaJob.remove({}, function() {})

    agenda.define("main trading loop", async (job, done) => {
      try {
        for (let pair of config.get("trading.pairs")) {
          agenda.now("run loop", { pair: pair, timeframe: TIMEFRAME })
        }

        done()
      } catch (error) {
        console.log(error)
        done()
      }
    })

    agenda.define("run loop", async (job, done) => {
      try {
        let data = job.attrs.data
        await runLoop(data.pair, data.timeframe)

        done()
      } catch (error) {
        console.log(error)
        done()
      }
    })

    agenda.define(
      "check prices",
      { priority: "high", concurrency: 5 },
      async (job, done) => {
        try {
          let position = job.attrs.data.position

          // check the current price
          let currentPrice = await exchanges.getPrice(position.pair)

          // capture profit if we get our prediction
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

          if (currentPrice >= position.forecastHigh) {
            console.log("Found profit on", position.pair)
            trade.closePosition(position, currentPrice)
          }

          if (currentPrice < position.forecastLow) {
            console.log("Took loss on ", position.pair)
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

    console.log(pair, "- PPO forcast:", ppoForecast)

    let lastCandle = data[data.length - 1]

    // get prediction
    let predictObject = {
      apo: lastCandle.apo,
      bop: lastCandle.bop,
      tsf_net_percent: lastCandle.tsf_net_percent,
      emv: lastCandle.emv,
      ppo_smoothed: ppoForecast
    }

    let prediction = await trade.getPrediction(predictObject, pair)

    console.log(pair, "- Prediction:", prediction)

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
    if (prediction === "BUY" && !position && currentDrawdown < MAX_DRAWDOWN) {
      let newPosition = await new db.Position({
        pair: pair,
        forecastHigh: prophetForecasts.high,
        forecastLow: prophetForecasts.low,
        timeframe: timeframe,
        time: lastCandle.mts,
        status: "OPEN",
        exchange: "bitfinex",
        orderCount: 1
      })

      newPosition.openPrice = await exchanges.getPrice(pair)

      // fixes a case where the prediction is less than the current price
      if (newPosition.openPrice > prophetForecasts.high) {
        newPosition.forecastHigh = newPosition.openPrice * 1.05
      }

      newPosition.amount = Math.round(TRADE_BALANCE / newPosition.openPrice)

      await newPosition.save()

      console.log(
        "Opened position",
        newPosition.amount,
        pair,
        "@",
        newPosition.openPrice
      )
    }

    // prediction BUY, current open position
    // accumulate
    if (prediction === "BUY" && position && currentDrawdown < MAX_DRAWDOWN) {
      let newPrice = await exchanges.getPrice(pair)
      let prevAmount = position.amount
      let addlAmount = Math.round(TRADE_BALANCE / position.openPrice)

      position.amount += addlAmount
      position.orderCount += 1

      position.openPrice =
        (position.openPrice * prevAmount + newPrice * addlAmount) /
        position.amount

      await position.save()
    }

    // prediction: SELL, current open position
    // close position
    if (prediction === "SELL" && position) {
      let currentPrice = await exchanges.getPrice(pair)

      trade.closePosition(position, currentPrice)
    }

    return true
  } catch (error) {
    throw error
  }
}

run()
