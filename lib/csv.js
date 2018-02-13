"use strict"

const createCsvWriter = require("csv-writer").createObjectCsvWriter

// Writes a CSV file to a specified path
//
const writeCsv = async (data, filePath) => {
  try {
    let headers = []

    for (let header of Object.keys(data[0])) {
      // compile headers
      headers.push({
        id: header,
        title: header
      })
    }

    const csvWriter = createCsvWriter({
      path: filePath,
      header: headers
    })

    csvWriter.writeRecords(data).then(() => {
      console.log("Done")
    })
  } catch (error) {
    throw error
  }
}

module.exports = {
  writeCsv
}