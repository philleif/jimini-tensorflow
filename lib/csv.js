"use strict"

const createCsvWriter = require("csv-writer").createObjectCsvWriter

// Writes a CSV file to a specified path
//
const writeCsv = async (data, filePath) => {
  try {
    let headers = []

    console.log(data[0])

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

const cleanAndCompactCsv = async records => {
  try {
    let idx = 0

    for (let row of records) {
      let deleteMe = false

      for (let field of Object.keys(row)) {
        if (row[field] === "" || typeof row[field] === "undefined") {
          deleteMe = true
        }
      }

      if (deleteMe) {
        delete records[idx]
      }

      idx++
    }

    let compactRecords = records.filter(function(x) {
      return x !== (undefined || null || "" || {})
    })

    return compactRecords
  } catch (error) {
    throw error
  }
}

module.exports = {
  writeCsv,
  cleanAndCompactCsv
}
