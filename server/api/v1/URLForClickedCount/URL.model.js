let mongoose = require('mongoose')
let Schema = mongoose.Schema

let urlSchema = new Schema({
  originalURL: String,
  subscriberId: {type: Schema.ObjectId, ref: 'subscribers'},
  module: Schema.Types.Mixed
})

module.exports = mongoose.model('URL', urlSchema)
