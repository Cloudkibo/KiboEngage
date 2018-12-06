const mongoose = require('mongoose')

const Schema = mongoose.Schema

const surveySchema = new Schema({
  pageId: String,
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  surveyId: { type: Schema.ObjectId, ref: 'surveys' },
  subscriberId: String,
  datetime: { type: Date, default: Date.now },
  seen: {type: Boolean},
  sent: {type: Boolean}
})

module.exports = mongoose.model('page_surveys', surveySchema)
