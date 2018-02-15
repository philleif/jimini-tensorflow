"use strict"

require("dotenv").config()

const Agenda = require("agenda")

const agenda = new Agenda({ db: { address: process.env.DB_URL } })

module.exports = {
  agenda
}