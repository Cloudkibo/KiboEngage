/**
 * Created by sojharo on 05/05/2018.
 */

const mongoose = require('mongoose')

const Schema = mongoose.Schema

const botsTemplateSchema = new Schema({
  title: String,
  category: [String],
  payload: [
    {
      questions: [String],
      answer: String,
      intent_name: String
    }],
  userId: { type: Schema.ObjectId, ref: 'users' },
  companyId: { type: Schema.ObjectId, ref: 'companyprofile' },
  createdBySuperUser: {type: Boolean, default: false},
  datetime: { type: Date, default: Date.now }

})

module.exports = mongoose.model('botsTemplate', botsTemplateSchema)
