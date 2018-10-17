/**
 * Created by sojharo on 01/08/2017.
 */

const mongoose = require('mongoose')

const Schema = mongoose.Schema

const subscriberMessagesSchema = new Schema({
  pageId: String, // facebook page id
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  autopostingId: { type: Schema.ObjectId, ref: 'autopostings' },
  autoposting_messages_id: { type: Schema.ObjectId, ref: 'autoposting_messages' },
  subscriberId: String, // facebook id of subscribers
  datetime: { type: Date, default: Date.now },
  seen: {type: Boolean, default: false}
})

module.exports = mongoose.model('autoposting_subscriber_messages', subscriberMessagesSchema)
