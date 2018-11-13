let mongoose = require('mongoose')
let Schema = mongoose.Schema

const sequenceSubscribers = new Schema({
  subscriberId: { type: Schema.ObjectId },
  sequenceId: { type: Schema.ObjectId, ref: 'sequences' },
  companyId: { type: Schema.ObjectId },
  status: String, // subscribed or unsubscribed
  datetime: { type: Date, default: Date.now }
})

module.exports = mongoose.model('sequenceSubcribers', sequenceSubscribers)
