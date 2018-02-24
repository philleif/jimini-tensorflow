"use strict"

// Utility functions for trades
//

const { exec } = require("child_process")
const fs = require("fs")
const exchanges = require("./exchanges")
const csv = require("./csv")
const db = require("./db")

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

    console.log(p)

    p.closePrice = price
    p.net = p.amount * (p.closePrice - p.openPrice)
    p.status = "CLOSED"

    await p.save()

    console.log("Closed position", p.pair)
  } catch (error) {
    throw error
  }
}

const prophetPromise = async pair => {
  return new Promise((resolve, reject) => {
    console.log("Getting forecast from Prophet...")
    exec(
      `python bin/python/prophet.py --csv ./tmp/prophet-${pair}.csv`,
      (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          console.log(err)
        }

        let ppoRegex = /\*\*\n(.*)/
        let ppoPrediction = `${ppoRegex.exec(stdout)[1]}`

        let highRegex = /UPPER:\n(\d.*)/
        let highPrediction = `${highRegex.exec(stdout)[1]}`

        let lowRegex = /LOWER:\n(\d.*)/
        let lowPrediction = `${lowRegex.exec(stdout)[1]}`

        resolve({
          ppo: Number(ppoPrediction),
          high: Number(highPrediction),
          low: Number(lowPrediction)
        })
      }
    )
  })
}

const getPrediction = async (predictionObject, pair) => {
  try {
    // write prediction object to file
    await writeFilePromise(predictionObject, pair)

    // get and parse prediction from tensorflow/google cloud
    let prediction = await gcloudPredictionPromise(pair)

    return prediction
  } catch (error) {
    console.log(error)
  }
}

const gcloudPredictionPromise = async pair => {
  return new Promise((resolve, reject) => {
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

        resolve(STRATEGIES[prediction])
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

module.exports = {
  getPrediction,
  prophetPromise,
  closePosition
}
