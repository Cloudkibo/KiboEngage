// WE are referring Messages as Broadcasts, broadcasts and messages will be same thing
// Zarmeen

let mongoose = require('mongoose')
let Schema = mongoose.Schema

const surveySchema = new Schema({
  title: String, // title of survey
  description: String, // description of survey
  category: [String],
  datetime: { type: Date, default: Date.now }
})

module.exports = mongoose.model('surveyTemplate', surveySchema)
