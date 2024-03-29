let mongoose = require('mongoose')
let Schema = mongoose.Schema

const pollResponseSchema = new Schema({
  response: String, // response submitted by subscriber
  pollId: { type: Schema.ObjectId, ref: 'polls' },
  subscriberId: { type: Schema.ObjectId, ref: 'subscribers' },
  datetime: { type: Date, default: Date.now }
  //  pageId: String, [discuss with sojharo, will we keep it or not]
})

module.exports = mongoose.model('pollresponse', pollResponseSchema)
