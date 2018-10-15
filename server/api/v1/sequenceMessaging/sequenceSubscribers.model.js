let mongoose = require('mongoose')
let Schema = mongoose.Schema

const sequenceSubscribers = new Schema({
  subscriberId: { type: Schema.ObjectId, ref: 'subscribers' },
  sequenceId: { type: Schema.ObjectId, ref: 'sequences' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  status: String, // subscribed or unsubscribed
  datetime: { type: Date, default: Date.now }
})

module.exports = mongoose.model('sequenceSubcribers', sequenceSubscribers)
