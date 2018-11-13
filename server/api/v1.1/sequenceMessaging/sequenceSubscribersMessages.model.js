let mongoose = require('mongoose')
let Schema = mongoose.Schema

const sequenceSubscribersMessages = new Schema({
  subscriberId: { type: Schema.ObjectId },
  messageId: { type: Schema.ObjectId, ref: 'sequenceMessages' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  datetime: { type: Date, default: Date.now },
  seen: {type: Boolean, default: false}
})

module.exports = mongoose.model('sequenceSubscribersMessages', sequenceSubscribersMessages)
