
'use strict'

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let iPCountrySchema = new Schema({
  startip: String,
  endip: String,
  startipint: Number,
  endipint: Number,
  ccode: String,
  country: String
})

module.exports = mongoose.model('ipcountry', iPCountrySchema)
