const { callApi } = require('../utility')

exports.allPolls = () => {
  return callApi(`templates/poll`, 'get', {}, '', 'kiboengage')
}

exports.pollTemplateaggregateCount = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`templates/poll/query`, 'post', query, '', 'kiboengage')
}
exports.pollTemplateaggregateLimit = (aggregateObject) => {
  let query = {
    purpose: 'aggregate',
    match: aggregateObject.findCriteria,
    sort: {datetime: -1},
    limit: aggregateObject.req.body.number_of_records
  }
  return callApi(`templates/poll/query`, 'post', query, '', 'kiboengage')
}
exports.pollTemplateaggregateLimitNextPrevious = (aggregateObject) => {
  let query = {
    purpose: 'aggregate',
    match: {$and: [aggregateObject.findCriteria, {_id: {$lt: aggregateObject.req.body.last_id}}]},
    sort: {datetime: -1},
    skip: aggregateObject.recordsToSkip,
    limit: aggregateObject.req.body.number_of_records
  }
  return callApi(`templates/poll/query`, 'post', query, '', 'kiboengage')
}

exports.allSurvey = () => {
  return callApi(`templates/survey`, 'get', {}, '', 'kiboengage')
}

exports.surveyTemplateaggregateCount = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`templates/survey/query`, 'post', query, '', 'kiboengage')
}

exports.surveyTemplateaggregateLimit = (aggregateObject) => {
  let query = {
    purpose: 'aggregate',
    match: aggregateObject.findCriteria,
    sort: {datetime: -1},
    limit: aggregateObject.req.body.number_of_records
  }
  return callApi(`templates/survey/query`, 'post', query, '', 'kiboengage')
}
exports.surveyTemplateaggregateLimitNextPrevious = (aggregateObject) => {
  let query = {
    purpose: 'aggregate',
    match: {$and: [aggregateObject.findCriteria, {_id: {$lt: aggregateObject.req.body.last_id}}]},
    sort: {datetime: -1},
    skip: aggregateObject.recordsToSkip,
    limit: aggregateObject.req.body.number_of_records
  }
  return callApi(`templates/survey/query`, 'post', query, '', 'kiboengage')
}
exports.createPoll = (payload) => {
  return callApi(`templates/poll`, 'post', payload, '', 'kiboengage')
}

exports.editPoll = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`templates/poll`, 'put', query, '', 'kiboengage')
}

exports.editSurveys = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`templates/survey`, 'put', query, '', 'kiboengage')
}

exports.createSurveys = (payload) => {
  return callApi(`templates/survey`, 'post', payload, '', 'kiboengage')
}

exports.CategoryFind = (companyUser) => {
  let query = {
    purpose: 'findAll',
    match: {'$or': [{companyId: companyUser.companyId}, {createdBySuperUser: true}]}
  }
  return callApi(`templates/category/query`, 'post', query, '', 'kiboengage')
}
exports.createCategory = (payload) => {
  return callApi(`templates/category`, 'post', payload, '', 'kiboengage')
}
exports.editCategory = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`templates/category`, 'put', query, '', 'kiboengage')
}

exports.findCategroryById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.body._id}
  }
  return callApi(`templates/category/query`, 'post', query, '', 'kiboengage')
}

exports.findSurveyById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.params.surveyid}
  }
  console.log('query in findSurveyById', query)
  return callApi(`templates/survey/query`, 'post', query, '', 'kiboengage')
}

exports.findQuestionById = (req) => {
  let query = {
    purpose: 'findAll',
    match: {surveyId: req.params.surveyid}
  }
  return callApi(`templates/survey/question/query`, 'post', query, '', 'kiboengage')
}

exports.findPollById = (id) => {
  let query = {
    purpose: 'findOne',
    match: {_id: id}
  }
  return callApi(`templates/poll/query`, 'post', query, '', 'kiboengage')
}

exports.removePoll = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`templates/poll`, 'delete', query, '', 'kiboengage')
}

exports.pollCategoryById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.params.id}
  }
  return callApi(`templates/category/query`, 'post', query, '', 'kiboengage')
}

exports.removeCategory = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`templates/category`, 'delete', query, '', 'kiboengage')
}

exports.surveyFindById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.body._id}
  }
  return callApi(`templates/survey/query`, 'post', query, '', 'kiboengage')
}

exports.removeSurvey = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`templates/survey`, 'delete', query, '', 'kiboengage')
}

exports.BroadcastFindById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.params.id}
  }
  return callApi(`templates/broadcast/query`, 'post', query, '', 'kiboengage')
}

exports.broadcastFindbyId = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.body._id}
  }
  return callApi(`templates/broadcast/query`, 'post', query, '', 'kiboengage')
}

exports.removeBroadcast = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`templates/broadcast`, 'delete', query, '', 'kiboengage')
}

exports.createBroadcast = (payload) => {
  return callApi(`templates/broadcast`, 'post', payload, '', 'kiboengage')
}

exports.saveBroadcast = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`templates/broadcast`, 'put', query, '', 'kiboengage')
}

exports.findBroadcastById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.params.broadcastid}
  }
  return callApi(`templates/broadcast/query`, 'post', query, '', 'kiboengage')
}

exports.findBotById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.params.botid, companyId: req.user.companyId}
  }
  return callApi(`templates/bot/query`, 'post', query, '', 'kiboengage')
}
exports.BotFindById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.body._id, companyId: req.user.companyId}
  }
  return callApi(`templates/bot/query`, 'post', query, '', 'kiboengage')
}
exports.createBot = (payload) => {
  return callApi(`templates/bot`, 'post', payload, '', 'kiboengage')
}
exports.botSave = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return callApi(`templates/bot`, 'put', query, '', 'kiboengage')
}
exports.removeBot = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`templates/bot`, 'delete', query, '', 'kiboengage')
}
exports.botFind = (companyUser) => {
  let query = {
    purpose: 'findAll',
    match: {'$or': [{companyId: companyUser.companyId}, {createdBySuperUser: true}]}
  }
  return callApi(`templates/bot/query`, 'post', query, '', 'kiboengage')
}
exports.broadcastFind = (companyUser) => {
  let query = {
    purpose: 'findAll',
    match: {'$or': [{companyId: companyUser.companyId}, {createdBySuperUser: true}]}
  }
  return callApi(`templates/broadcast/query`, 'post', query, '', 'kiboengage')
}

exports.surveyId = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.body.survey._id}
  }
  return callApi(`templates/survey/query`, 'post', query, '', 'kiboengage')
}

exports.findQuestionSurveyById = (req) => {
  let query = {
    purpose: 'findOne',
    match: {surveyId: req.body.survey._id}
  }
  return callApi(`templates/survey/question/query`, 'post', query, '', 'kiboengage')
}

exports.broadcastTemplateaggregateCount = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  console.log('broadcastTemplateaggregateCount', query)
  return callApi(`templates/broadcast/query`, 'post', query, '', 'kiboengage')
}
exports.broadcastTemplateaggregateLimit = (aggregateObject) => {
  let query = {
    purpose: 'aggregate',
    match: aggregateObject.findCriteria,
    sort: {datetime: -1},
    limit: aggregateObject.req.body.number_of_records
  }
  return callApi(`templates/broadcast/query`, 'post', query, '', 'kiboengage')
}
exports.broadcastTemplateaggregateLimitNextPrevious = (aggregateObject) => {
  let query = {
    purpose: 'aggregate',
    match: {$and: [aggregateObject.findCriteria, {_id: {$lt: aggregateObject.req.body.last_id}}]},
    sort: {datetime: -1},
    skip: aggregateObject.recordsToSkip,
    limit: aggregateObject.req.body.number_of_records
  }
  return callApi(`templates/broadcast/query`, 'post', query, '', 'kiboengage')
}

exports.removeQuestion = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`templates/survey/question`, 'delete', query, '', 'kiboengage')
}

exports.surveyFindId = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.params.id}
  }
  return callApi(`templates/survey/query`, 'post', query, '', 'kiboengage')
}
exports.FindByIdPoll = (req) => {
  let query = {
    purpose: 'findOne',
    match: {_id: req.params.id}
  }
  return callApi(`templates/poll/query`, 'post', query, '', 'kiboengage')
}
