"use strict"

// Generate a BUY/SELL/HOLD strategy for trades

const getStrategy = async (row, nextRow) => {
  let strategy = "HOLD"

  if(nextRow.close > row.close) {
    strategy = "BUY"
  } else if (nextRow.close < row.close) {
    strategy = "SELL"
  }

  return strategy
}

module.exports = {
  getStrategy
}
