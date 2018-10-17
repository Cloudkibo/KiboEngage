'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var InviteagenttokenSchema = new Schema({
  email: String,
  token: {type: String, required: true},
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  createdAt: {type: Date, required: true, default: Date.now, expires: '120h'},
  companyName: String,
  role: String,
  domain: String
})

module.exports = mongoose.model('inviteagenttoken', InviteagenttokenSchema)
