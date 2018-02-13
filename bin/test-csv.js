"use strict"

// Generates a CSV for a currency pair and timeframe
//

const exitHook = require("async-exit-hook")
const config = require("config")
const strategy = require("../lib/strategy")
const exchanges = require("../lib/exchanges")
const csv = require("../lib/csv")
const indicators = require("../lib/indicators").indicators

const run = async () => {
  let data = []
  // TODO: - command line arg for train v test dataset
  let pairs = config.get("datasets.test.pairs")
  let timeframes = config.get("datasets.test.timeframes")

  for (let pair of pairs) {
    for (let timeframe of timeframes) {
      console.log("Fetching", pair, timeframe)

      let pairTimeframeData = await getPairForTimeframeData(pair, timeframe)

      data.push(pairTimeframeData)
    }
  }

  const flatData = data.reduce(function(a, b) {
    return a.concat(b)
  }, [])

  await csv.writeCsv(flatData, "./tmp/test-csv.csv")
}

const getPairForTimeframeData = async (pair, timeframe) => {
  try {
    let exchangeData = await exchanges.getCandles(pair, timeframe)
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

    data = await formatDataForCsv(data)

    // assign metadata to trades
    for (let i = 0; i < data.length; i++) {
      data[i].pair = pair
      data[i].timeframe = timeframe
      data[i].mts = new Date(data[i].mts)
    }
    for (let i = 0; i < data.length - 1; i++) {
      data[i].strategy = await strategy.getStrategy(data[i], data[i + 1])
    }

    return data
  } catch (error) {
    throw error
  }
}

const formatDataForCsv = async data => {
  try {
    let csvHeaders = []
    let csvData = []

    for (let header of Object.keys(data)) {
      // compile headers
      csvHeaders.push({
        id: header,
        title: header
      })
    }

    for (let i = 0; i < data["mts"].length; i++) {
      let rowObject = {}

      for (let header of Object.keys(data)) {
        rowObject[header] = data[header][i]
      }

      csvData.push(rowObject)
    }

    return csvData
  } catch (error) {
    throw error
  }
}

run()
