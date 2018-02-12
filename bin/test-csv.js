"use strict"

// Generates a CSV for a currency pair and timeframe
//

const exitHook = require("async-exit-hook")
const exchanges = require("../lib/exchanges")
const csv = require("../lib/csv")

const run = async () => {
  try {
    let exchangeData = await exchanges.getCandles("tXRPUSD", "1h")

    let formattedData = await exchanges.formatData(exchangeData, exchanges.labels)
    //console.log(exchangeData)

    await csv.writeCsv(formattedData, "./tmp/test-csv.csv")
  } catch (error) {
    throw error
  }
}

run()
