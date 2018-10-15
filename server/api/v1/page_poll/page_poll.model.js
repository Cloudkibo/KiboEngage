const mongoose = require('mongoose')

const Schema = mongoose.Schema

const pollSchema = new Schema({
  pageId: String,
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  pollId: { type: Schema.ObjectId, ref: 'polls' },
  subscriberId: String,
  datetime: { type: Date, default: Date.now },
  seen: {type: Boolean}
})

module.exports = mongoose.model('page_polls', pollSchema)
