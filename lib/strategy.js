"use strict"

// Generate a BUY/SELL/HOLD strategy for trades

const STRATEGIES = {
  "SELL": {
    label: "SELL",
    index: 0
  },
  "BUY": {
    label: "BUY",
    index: 1
  },
  "HOLD": {
    index: 2
  }
}

const getStrategy = async (row, nextRow) => {
  let strategy = STRATEGIES["HOLD"]

  if(nextRow.close > row.close) {
    strategy = STRATEGIES["BUY"]
  } else if (nextRow.close < row.close) {
    strategy = STRATEGIES["SELL"]
  }

  return strategy
}

module.exports = {
  getStrategy
}
