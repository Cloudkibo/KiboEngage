const { callApi } = require('../utility')
const PollsDataLayer = require('../polls/polls.datalayer')
const PollResponsesDataLayer = require('../polls/pollresponse.datalayer')
const SurveysDataLayer = require('../surveys/surveys.datalayer')
const PageBroadcastDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const PageSurveyDataLayer = require('../page_survey/page_survey.datalayer')
const PagePollDataLayer = require('../page_poll/page_poll.datalayer')
const SequenceDataLayer = require('../sequenceMessaging/sequence.datalayer')

exports._getCompanyUser = (data, next) => {
  callApi('companyUser/query', 'post', data.companyUserCriteria)
    .then(companyUser => {
      if (!companyUser) {
        next('The user account does not belong to any company. Please contact support')
      } else {
        next()
      }
    })
    .catch(err => next(err))
}

exports._getPagesUsingQuery = (data, next) => {
  callApi(`pages/query`, 'post', data.connectedPagesCriteria) // fetch connected pages
    .then(pages => {
      data.pages = pages
      data.pageIds = pages.map(p => p.pageId)
      data.page_Ids = pages.map(p => p._id)
      next()
    })
    .catch(err => next(err))
}

exports._getTotalPages = (data, next) => {
  let query = [
    {$match: data.totalPagesCriteria},
    {$group: {_id: '$pageId', count: {$sum: 1}}}
  ]
  callApi(`pages/aggregate`, 'post', query) // fetch connected pages
    .then(pages => {
      data.totalPages = pages
      next()
    })
    .catch(err => next(err))
}

exports._getCriterias = (data, next) => {
  let matchAggregate = {
    companyId: data.companyId,
    'pageId': data.pageId === 'all' ? {$in: data.pageIds} : data.pageId,
    'datetime': data.days === 'all' ? { $exists: true }
      : {
        $gte: new Date(
          (new Date().getTime() - (data.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      }
  }
  data.sentCriteria = matchAggregate
  let seen = matchAggregate
  seen['seen'] = true
  data.seenCriteria = seen
  next()
}

exports._getBroadcastSentCount = (data, next) => {
  PageBroadcastDataLayer.countDocuments(data.sentCriteria)
    .then(result => {
      data.broadcastSentCount = result.length > 0 ? result[0].count : 0
      next()
    })
    .catch(err => next(err))
}

exports._getBroadcastSeenCount = (data, next) => {
  PageBroadcastDataLayer.countDocuments(data.seenCriteria)
    .then(result => {
      data.broadcastSeenCount = result.length > 0 ? result[0].count : 0
      next()
    })
    .catch(err => next(err))
}

exports._getSurveysSentCount = (data, next) => {
  PageSurveyDataLayer.countDocuments(data.sentCriteria)
    .then(result => {
      data.surveySentCount = result.length > 0 ? result[0].count : 0
      next()
    })
    .catch(err => next(err))
}

exports._getSurveysSeenCount = (data, next) => {
  PageSurveyDataLayer.countDocuments(data.seenCriteria)
    .then(result => {
      data.surveySeenCount = result.length > 0 ? result[0].count : 0
      next()
    })
    .catch(err => next(err))
}

exports._getPollSentCount = (data, next) => {
  PagePollDataLayer.countDocuments(data.sentCriteria)
    .then(result => {
      data.pollSentCount = result.length > 0 ? result[0].count : 0
      next()
    })
    .catch(err => next(err))
}

exports._getPollSeenCount = (data, next) => {
  PagePollDataLayer.countDocuments(data.seenCriteria)
    .then(result => {
      data.pollSeenCount = result.length > 0 ? result[0].count : 0
      next()
    })
    .catch(err => next(err))
}

exports._getSurveyResponseCount = (data, next) => {
  SurveysDataLayer.aggregateForSurveys(data.surveyResponseCriteria.match, data.surveyResponseCriteria.group)
    .then(result => {
      data.surveyResponseCount = result.length > 0 ? result[0].responses : 0
      next()
    })
    .catch(err => next(err))
}

exports._getPollsResponseCount = (data, next) => {
  PollsDataLayer.genericFindForPolls(data.companyCriteria)
    .then(polls => {
      let pollIds = polls.map(p => p._id)
      let match = {pollId: {$in: pollIds}}
      let group = {_id: '$pollId', count: {$sum: 1}}
      PollResponsesDataLayer.aggregateForPollResponse(match, group)
        .then(result => {
          let responses = result.length > 0
            ? result.map(r => r.count) : [0]
          data.pollResponseCount = responses.reduce((a, b) => a + b, 0)
          next()
        })
        .catch(err => next(err))
    })
    .catch(err => next(err))
}

exports._getBroadcastGraphData = (data, next) => {
  PageBroadcastDataLayer.aggregateForBroadcasts(data.sentCriteria, data.groupAggregate)
    .then(broadcastsgraphdata => {
      data.broadcastsgraphdata = broadcastsgraphdata
      next()
    })
    .catch(err => next(err))
}

exports._getPollGraphData = (data, next) => {
  PagePollDataLayer.aggregateForPolls(data.sentCriteria, data.groupAggregate)
    .then(pollsgraphdata => {
      data.pollsgraphdata = pollsgraphdata
      next()
    })
    .catch(err => next(err))
}

exports._getSurveyGraphData = (data, next) => {
  PageSurveyDataLayer.aggregateForSurveys(data.sentCriteria, data.groupAggregate)
    .then(surveysgraphdata => {
      data.surveysgraphdata = surveysgraphdata
      next()
    })
    .catch(err => next(err))
}

exports._getSubscribersUsingQuery = (data, next) => {
  callApi('subscribers/query', 'post', {companyId: data.companyId, isSubscribed: true, pageId: {$in: data.page_Ids}})
    .then(subscribers => {
      data.subscribers = subscribers
      next()
    })
    .catch(err => next(err))
}

exports._getSequences = (data, next) => {
  SequenceDataLayer.countSequences({companyId: data.companyId})
    .then(sequences => {
      data.sequences = sequences.length > 0 ? sequences[0].count : 0
      next()
    })
    .catch(err => next(err))
}
