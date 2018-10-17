/**
 * Created by sojharo on 30/08/2017.
 */
// WE are referring Messages as Broadcasts, broadcasts and messages will be same thing
// Zarmeen

let mongoose = require('mongoose')
let Schema = mongoose.Schema

let broadcastSchema = new Schema({
  platform: String, // TODO define this as enum with values, for now value is facebook
  payload: Schema.Types.Mixed,
  type: String, // TODO define this as enum with values ['text','attachment']
  title: String,
  text: String,
  fileurl: String,
  attachmentType: String,
  isSegmented: { type: Boolean, default: false },
  fbMessageTag: String,
  segmentationPageIds: [String],
  segmentationLocale: [String],
  segmentationGender: [String],
  segmentationTimeZone: String,
  segmentationTags: [String],
  isList: {type: Boolean, default: false},
  segmentationList: [String],
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  datetime: { type: Date, default: Date.now },
  clicks: {type: Number, default: 0}
})

module.exports = mongoose.model('broadcasts', broadcastSchema)
