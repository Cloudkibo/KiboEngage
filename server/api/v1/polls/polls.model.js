const mongoose = require('mongoose')

const Schema = mongoose.Schema

const pollSchema = new Schema({
  platform: String, // TODO define this as enum with values, for now value is facebook
  statement: String,
  options: [String],
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  datetime: { type: Date, default: Date.now },
  isSegmented: { type: Boolean, default: false },
  segmentationPageIds: [String],
  segmentationLocale: [String],
  segmentationGender: [String],
  segmentationTimeZone: String,
  segmentationTags: [String],
  isList: { type: Boolean, default: false },
  segmentationList: [String],
  segmentationPoll: [String],
  fbMessageTag: String

})

module.exports = mongoose.model('polls', pollSchema)
