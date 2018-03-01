"use strict"

const StateMachine = require("javascript-state-machine")

const Position = StateMachine.factory({
  init: "new",
  transitions: [
    { name: "open", from: "new", to: "open" },
    { name: "close", from: "open", to: "closed" }
  ],
  data: function(id) {
    return {
      id: id // key for mongo
    }
  },
  methods: {
    onOpen: async (data) => {
      console.log("opening position with ", data)
    },
    onClose: async (price) => {
      console.log("closing position at", price)
    }
  }
})

module.exports = {
  Position
}
