"use strict"

const exchanges = require("../lib/exchanges")
const csv = require("../lib/csv")
const config = require("config")
const indicators = require("../lib/indicators").indicators

// TODO: move these to config
let PAIR = "tNEOUSD"
let TIMEFRAME = "15m"

const run = async () => {
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

    let lastCandles = [data[data.length - 1], data[data.length - 2]]


    // check for existing position


    // handle existing position if it exists

    // pass it to prediction
    let predictObject = {
      apo: lastCandles[0].apo,
      bop: lastCandles[0].bop,
      tsf_net_percent: lastCandles[0].tsf_net_percent,
      ppo: lastCandles[1].ppo,
    }

    console.log(predictObject)

    // save position and make trade

  } catch (error) {
    throw error
  }
}

run()
