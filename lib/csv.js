"use strict"

const createCsvWriter = require("csv-writer").createObjectCsvWriter

// Writes a CSV file to a specified path
//
const writeCsv = async (data, filePath) => {
  try {
    let headers = []

    for (let header of Object.keys(data[0])) {
      // compile headers
      // headers.push(header) // doesn't include headers
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
        if (header === "mts") {
          rowObject[header] = new Date(data[header][i])
        } else {
          rowObject[header] = data[header][i]
        }
      }

      csvData.push(rowObject)
    }

    return csvData
  } catch (error) {
    throw error
  }
}

module.exports = {
  writeCsv,
  cleanAndCompactCsv,
  formatDataForCsv
}
