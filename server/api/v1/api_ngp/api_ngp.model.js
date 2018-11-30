/**
 * Created by sojharo on 24/11/2017.
 */
'use strict'

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let ApiSettingsSchema = new Schema({
  company_id: String,
  app_id: String,
  app_secret: String,
  enabled: {type: Boolean, default: false}
})

module.exports = mongoose.model('api_ngp', ApiSettingsSchema)
