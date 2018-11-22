
'use strict'

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let InvitationsSchema = new Schema({
  name: String,
  email: String,
  companyId: {type: Schema.ObjectId},
  createdAt: {type: Date, required: true, default: Date.now}
})

module.exports = mongoose.model('invitations', InvitationsSchema)
