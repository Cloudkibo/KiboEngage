'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var PageAdminSubscriptionsSchema = new Schema({

  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  userId: { type: Schema.ObjectId, ref: 'users' },
  subscriberId: String,
  pageId: { type: Schema.ObjectId, ref: 'pages' }

})

module.exports = mongoose.model('pageadminsubscriptions', PageAdminSubscriptionsSchema)
