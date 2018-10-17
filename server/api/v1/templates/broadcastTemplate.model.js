const mongoose = require('mongoose')

const Schema = mongoose.Schema

const broadcastSchema = new Schema({
  title: String,
  category: [String],
  payload: Schema.Types.Mixed,
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  createdBySuperUser: {type: Boolean, default: false},
  datetime: { type: Date, default: Date.now }

})

module.exports = mongoose.model('broadcastTemplate', broadcastSchema)
