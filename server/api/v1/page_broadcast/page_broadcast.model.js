/**
 * Created by sojharo on 01/08/2017.
 */

const mongoose = require('mongoose')

const Schema = mongoose.Schema

const broadcastSchema = new Schema({
  pageId: String,
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  subscriberId: String,
  broadcastId: { type: Schema.ObjectId, ref: 'broadcasts' },
  datetime: { type: Date, default: Date.now },
  seen: {type: Boolean},
  clicked: {type: Boolean}
})

module.exports = mongoose.model('page_broadcasts', broadcastSchema)
