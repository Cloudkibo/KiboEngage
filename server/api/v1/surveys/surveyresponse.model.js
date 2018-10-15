// WE are referring Messages as Broadcasts, broadcasts and messages will be same thing
// Zarmeen

let mongoose = require('mongoose')
let Schema = mongoose.Schema

const surveyResponseSchema = new Schema({
  response: String, // response submitted by subscriber
  surveyId: { type: Schema.ObjectId, ref: 'surveys' },
  questionId: { type: Schema.ObjectId, ref: 'surveyquestions' },
  subscriberId: { type: Schema.ObjectId, ref: 'subscribers' },
  datetime: { type: Date, default: Date.now }
})

module.exports = mongoose.model('surveyresponse', surveyResponseSchema)
