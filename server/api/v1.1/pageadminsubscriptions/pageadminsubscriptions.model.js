'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var PageAdminSubscriptionsSchema = new Schema({

  companyId: { type: Schema.ObjectId },
  userId: { type: Schema.ObjectId },
  subscriberId: String,
  pageId: { type: Schema.ObjectId }

})

module.exports = mongoose.model('pageadminsubscriptions', PageAdminSubscriptionsSchema)
