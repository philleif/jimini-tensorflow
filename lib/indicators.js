"use strict"

// Financial indicators from Tulip
//

const tulind = require("tulind")
const talib = require("talib")
const config = require("config")
const timeseries = require("timeseries-analysis")
const csv = require("./csv")

// Stochastic RSI
//
const stochRsi = async data => {
  try {
    let indicatorData = await getIndicator(data)

    return indicatorData
  } catch (error) {
    throw error
  }
}

function runTalibStochRsi(data) {
  return new Promise((resolve, reject) => {
    const period = 14
    const fastk = 3
    const fastd = 3

    talib.execute(
      {
        name: "STOCHRSI",
        startIdx: 0,
        endIdx: data.close.length - 1,
        real: data.close,
        inReal: data.close,
        optInTimePeriod: period,
        optInFastK_Period: fastk,
        optInFastD_Period: fastd,
        optInFastD_MAType: 0
      },
      function(err, result) {
        if (err) {
          console.log(err)
          reject(err)
        } else {
          result.result.date = data.date.slice(
            result.begIndex,
            data.date.length - 1
          )
          resolve(result.result)
        }
      }
    )
  })
}

const asyncTalibStochRsi = async data => {
  try {
    return await runTalib(data)
  } catch (error) {
    console.log(error)
    return new Error(error)
  }
}

// Absolute Price Oscillator
//
const apo = async data => {
  try {
    const options = [2, 5] // short period, long period
    let labels = ["apo"]
    const indicator = await getIndicator("apo", labels, [data.close], options)

    let offset = data.mts.length - indicator.apo.length

    indicator.apo = fixOffset(offset, indicator.apo)

    return indicator
  } catch (error) {
    throw error
  }
}

// Balance of Power
//
const bop = async data => {
  try {
    const options = []
    let labels = ["bop"]
    const indicator = await getIndicator(
      "bop",
      labels,
      [data.open, data.high, data.low, data.close],
      options
    )

    return indicator
  } catch (error) {
    throw error
  }
}

// Directional Movement
//
const dm = async data => {
  try {
    const options = [5] // period
    let labels = ["dm_plus", "dm_minus"]
    const indicator = await getIndicator(
      "dm",
      labels,
      [data.high, data.low],
      options
    )

    let offset = data.mts.length - indicator.dm_plus.length
    indicator.dm_plus = fixOffset(offset, indicator.dm_plus)

    offset = data.mts.length - indicator.dm_minus.length
    indicator.dm_minus = fixOffset(offset, indicator.dm_minus)

    return indicator
  } catch (error) {
    throw error
  }
}

// Time Series Forecast
//
const tsf = async data => {
  try {
    let ind = {}
    let options = [5] // period

    tulind.indicators.tsf.indicator([data.close], options, (err, results) => {
      let netPercent = []

      // calculate % forecast for model
      for (let i = 0; i < results[0].length; i++) {
        netPercent.push((results[0][i] - data.close[i]) / results[0][i])
      }

      ind = {
        tsf_forecast: results[0],
        tsf_net_percent: netPercent
      }
    })

    let offset = data.mts.length - ind.tsf_forecast.length
    ind.tsf_forecast = fixOffset(offset, ind.tsf_forecast)

    offset = data.mts.length - ind.tsf_net_percent.length
    ind.tsf_net_percent = fixOffset(offset, ind.tsf_net_percent)

    return ind
  } catch (error) {
    throw error
  }
}

// Fisher Transform
//
const fisher = async data => {
  try {
    const options = [5] // period
    let labels = ["fisher", "fisher_signal"]
    let indicator = await getIndicator(
      "fisher",
      labels,
      [data.high, data.low],
      options
    )

    return indicator
  } catch (error) {
    throw error
  }
}

// Double Exponential Moving Average
//
const dema = async data => {
  try {
    const options = [5] // period
    let labels = ["dema"]
    const indicator = await getIndicator("dema", labels, [data.close], options)

    return indicator
  } catch (error) {
    throw error
  }
}

// Commodity Channel Index
//
const cci = async data => {
  try {
    const options = [5] // period
    let labels = ["cci"]
    const indicator = await getIndicator(
      "cci",
      labels,
      [data.high, data.low, data.close],
      options
    )

    return indicator
  } catch (error) {
    throw error
  }
}

// Linear Regression Forecast
//
const linreg = async data => {
  try {
    let ind = {}
    let options = [5] // period

    tulind.indicators.linreg.indicator(
      [data.close],
      options, //
      (err, results) => {
        let netPercent = []

        // calculate % forecast for model
        for (let i = 0; i < results[0].length; i++) {
          netPercent.push((results[0][i] - data.close[i]) / results[0][i])
        }

        ind = {
          linreg_forecast: results[0],
          linreg_net_percent: netPercent
        }
      }
    )

    let offset = data.mts.length - ind.linreg_net_percent.length

    ind.linreg_net_percent = fixOffset(offset, ind.linreg_net_percent)
    ind.linreg_forecast = fixOffset(offset, ind.linreg_net_percent)

    return ind
  } catch (error) {
    throw error
  }
}

// Moving Average Convergence/Divergence
//
const macd = async data => {
  try {
    const options = [12, 26, 9] // short period, long period, signal
    let labels = ["macd", "macd_signal", "macd_histogram"]
    const indicator = await getIndicator("macd", labels, [data.close], options)

    return indicator
  } catch (error) {
    throw error
  }
}

// Percentage Price Oscillator
//
const ppo = async data => {
  try {
    const options = [2, 5] // short period, long period
    let labels = ["ppo"]
    const indicator = await getIndicator("ppo", labels, [data.close], options)

    // smoothed data
    let t = new timeseries.main(timeseries.adapter.fromArray(indicator.ppo))
    let tsData = t.smoother({ period: 2 }).save("smoothed").data
    let smoothedData = []

    for (let i in tsData) {
      smoothedData.push(tsData[i][1])
    }

    let offset = data.mts.length - smoothedData.length

    indicator.ppo_smoothed = fixOffset(offset, smoothedData)

    return indicator
  } catch (error) {
    throw error
  }
}

// Rate of Change
//
const roc = async data => {
  try {
    const options = [5] // period
    let labels = ["roc"]
    const indicator = await getIndicator("roc", labels, [data.close], options)

    return indicator
  } catch (error) {
    throw error
  }
}

// Rate of Change Ratio
//
const rocr = async data => {
  try {
    const options = [5] // period
    let labels = ["rocr"]
    const indicator = await getIndicator("rocr", labels, [data.close], options)

    return indicator
  } catch (error) {
    throw error
  }
}

// Average Directional Movement Index
//
const adx = async data => {
  try {
    const options = [5] // long period
    let labels = ["adx"]
    const indicator = await getIndicator(
      "adx",
      labels,
      [data.high, data.low, data.close],
      options
    )

    let offset = data.mts.length - indicator.adx.length

    indicator.adx = fixOffset(offset, indicator.adx)

    return indicator
  } catch (error) {
    throw error
  }
}

// On Balance Volume
//
const obv = async data => {
  try {
    const options = []
    let labels = ["obv"]
    const indicator = await getIndicator(
      "obv",
      labels,
      [data.close, data.volume],
      options
    )

    return indicator
  } catch (error) {
    throw error
  }
}

// Relative Strength Index
//
const rsi = async data => {
  try {
    const options = [14]
    const labels = ["rsi"]
    const indicator = {}

    tulind.indicators.rsi.indicator([data.close], options, (err, results) => {
      for (let i = 0; i < results.length; i++) {
        indicator[labels[i]] = results[i]
      }
    })

    let offset = data.mts.length - indicator.rsi.length

    indicator.rsi = fixOffset(offset, indicator.rsi)

    return indicator
  } catch (error) {
    throw error
  }
}

// Ease of Movement
//
const emv = async data => {
  try {
    const options = [] // period
    let labels = ["emv"]
    const indicator = await getIndicator(
      "emv",
      labels,
      [data.high, data.low, data.volume],
      options
    )

    let offset = data.mts.length - indicator.emv.length

    indicator.emv = fixOffset(offset, indicator.emv)

    return indicator
  } catch (error) {
    throw error
  }
}

// Stochastic Oscillator
//
const stoch = async data => {
  try {
    const options = [5, 3, 3] // k period, slowing period, d period
    let labels = ["stoch", "stoch_d"]
    const indicator = await getIndicator(
      "stoch",
      labels,
      [data.high, data.low, data.close],
      options
    )

    // let offset = data.mts.length - indicator.stoch.length

    // indicator.stoch = fixOffset(offset, indicator.stoch)

    // offset = data.mts.length - indicator.stoch_d.length

    // indicator.stoch_d = fixOffset(offset, indicator.stoch_d)

    return indicator
  } catch (error) {
    throw error
  }
}

// Volume Oscillator
//
const vosc = async data => {
  try {
    const options = [2, 5] // short period, long period
    let labels = ["vosc"]
    const indicator = await getIndicator("vosc", labels, [data.volume], options)

    // let offset = data.mts.length - indicator.vosc.length

    // indicator.vosc = fixOffset(offset, indicator.vosc)

    return indicator
  } catch (error) {
    throw error
  }
}

// Trix
//
const trix = async data => {
  try {
    const options = [5] // period
    let labels = ["trix"]
    const indicator = await getIndicator("trix", labels, [data.close], options)

    let offset = data.mts.length - indicator.trix.length

    indicator.trix = fixOffset(offset, indicator.trix)

    return indicator
  } catch (error) {
    throw error
  }
}

// Qstick
//
const qstick = async data => {
  try {
    const options = [5] // period
    let labels = ["qstick"]
    const indicator = await getIndicator(
      "qstick",
      labels,
      [data.open, data.close],
      options
    )

    let offset = data.mts.length - indicator.qstick.length

    indicator.qstick = fixOffset(offset, indicator.qstick)

    return indicator
  } catch (error) {
    throw error
  }
}

const fixOffset = function(offset, arr) {
  for (let i = 0; i < offset; i++) {
    arr.unshift("")
  }

  return arr
}

// Use tulip to get indicator data
//
const getIndicator = async (ind, labels, data, options) => {
  try {
    let indicator = {}

    tulind.indicators[ind].indicator(data, options, (err, results) => {
      for (let i = 0; i < results.length; i++) {
        indicator[labels[i]] = results[i]
      }
    })

    return indicator
  } catch (error) {
    throw error
  }
}

const formatIndicatorData = async (exchangeData, dataLabels)  => {
  let data = {}

  for (let i in dataLabels) {
    data[dataLabels[i]] = []

    // populate data from exchange call
    for (let j in exchangeData) {
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

  return data
}

const indicators = {
  apo: apo,
  bop: bop,
  tsf: tsf,
  fisher: fisher,
  ppo: ppo,
  roc: roc,
  linreg: linreg,
  rocr: rocr,
  rsi: rsi,
  trix: trix,
  qstick: qstick,
  dm: dm,
  stoch: stoch,
  vosc: vosc,
  adx: adx,
  obv: obv,
  macd: macd,
  cci: cci,
  emv: emv,
  dema: dema
}

module.exports = {
  indicators,
  formatIndicatorData
}
