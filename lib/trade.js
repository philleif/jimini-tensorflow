"use strict"

// Utility functions for trades
//

const { exec } = require("child_process")
const fs = require("fs")
const exchanges = require("./exchanges")
const csv = require("./csv")

const STRATEGIES = {
  "1": "BUY",
  "0": "SELL"
}

const closePosition = async (position, price) => {
  try {
    position.closePrice = price
    position.net = position.amount * (position.closePrice - position.openPrice)
    position.status = "CLOSED"

    await position.save()

    console.log("Closed position", position.pair)
  } catch (error) {
    throw error
  }
}

const getProphetorecast = async () => {
  try {
    let prediction = await prophetPromise()

    return prediction
  } catch (error) {
    throw error
  }
}

const prophetPromise = async () => {
  return new Promise((resolve, reject) => {
    console.log("Getting forecast from Prophet...")
    exec("python bin/python/prophet.py", (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        console.log(err)
        reject(err)
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
    })
  })
}

const getPrediction = async predictionObject => {
  try {
    // write prediction object to file
    await writeFileAsync(predictionObject)

    // get and parse prediction from tensorflow/google cloud
    let prediction = await gcloudPredictionAsync()

    return prediction
  } catch (error) {
    throw error
  }
}

const gcloudPredictionAsync = async () => {
  try {
    return await gcloudPredictionPromise()
  } catch (error) {
    throw error
  }
}

const gcloudPredictionPromise = async () => {
  return new Promise((resolve, reject) => {
    exec(
      "gcloud ml-engine predict --model jimini --version v4 --json-instances ./tmp/predictionObject.json",
      (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          reject(err)
        }

        let regex = /\[(\d)\]/
        let prediction = `${regex.exec(stdout)[1]}`

        resolve(STRATEGIES[prediction])
      }
    )
  })
}

const writeFileAsync = async content => {
  try {
    return await writeFilePromise(content)
  } catch (error) {
    throw error
  }
}

const writeFilePromise = async content => {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      "./tmp/predictionObject.json",
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
  getProphetorecast,
  closePosition
}
