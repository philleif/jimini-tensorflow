"use strict"

// Utility functions for trades
//

const { exec } = require("child_process")
const fs = require("fs")
const exchanges = require("./exchanges")

const STRATEGIES = {
  "1": "BUY",
  "0": "SELL"
}

const getPrediction = async predictionObject => {
  try {
    // write prediction object to file
    console.log("Writing prediction object...")

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
    console.log("Getting prediction...")
    exec(
      "gcloud ml-engine predict --model jimini --version v2 --json-instances ./tmp/predictionObject.json",
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
    console.log("Writing file...")

    fs.writeFile(
      "./tmp/predictionObject.json",
      JSON.stringify(content),
      function(err) {
        if (err) {
          reject(err)
        }
        console.log("Saved prediction file.")
        resolve(true)
      }
    )
  })
}

module.exports = {
  getPrediction
}
