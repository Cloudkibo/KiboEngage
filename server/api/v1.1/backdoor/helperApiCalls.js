const { callApi } = require('../utility')
const DataLayer = require('./datalayer')
const PollResponseDataLayer = require('../polls/pollresponse.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyQuestionDataLayer = require('../surveys/surveyquestion.datalayer')
const SurveyResponseDataLayer = require('../surveys/surveyresponse.datalayer')

exports._getUsersUsingQuery = (data, next) => {
  callApi(`user/query`, 'post', data.userQueryCriteria)
    .then(usersData => { next(null, usersData) })
    .catch(err => next(err))
}

exports._getUsersUsingAggregate = (data, next) => {
  callApi(`user/aggregate`, 'post', data.userAggregateCriteria)
    .then(users => { next(null, users) })
    .catch(err => next(err))
}

exports._getPagesUsingQuery = (data, next) => {
  callApi(`pages/query`, 'post', data.pageCriteria)
    .then(pages => {
      data.pages = pages
      let pageIds = pages.map((p) => p._id)
      data.subscriberCriteria = {pageId: {$in: pageIds}, isSubscribed: true}
      next(null)
    })
    .catch(err => next(err))
}

exports._getPagesUsingAggregate = (data, next) => {
  callApi(`pages/aggregate`, 'post', data.pageAggregateCriteria)
    .then(result => {
      data.pages = result
      next(null)
    })
    .catch(err => next(err))
}

exports._getPagesCount = (data, next) => {
  callApi(`pages/aggregate`, 'post', data.pageCountCriteria)
    .then(result => {
      data.count = result
      next(null)
    })
    .catch(err => next(err))
}

exports._getBroadcastsCount = (data, next) => {
  DataLayer.countBroadcasts(data.broadcastsCountCriteria)
    .then(broadcastsCount => {
      data.count = broadcastsCount
      next(null)
    })
    .catch(err => next(err))
}

exports._getBroadcastsUsingAggregate = (data, next) => {
  DataLayer.aggregateForBroadcasts(
    data.broadcastsAggregate.match,
    undefined,
    data.broadcastsAggregate.lookup,
    data.broadcastsAggregate.limit,
    data.broadcastsAggregate.sort,
    data.broadcastsAggregate.skip
  )
    .then(broadcasts => {
      data.broadcasts = broadcasts
      next(null)
    })
    .catch(err => {
      console.log(err)
      next(err)
    })
}

exports._getSubscribersUsingQuery = (data, next) => {
  callApi(`subscribers/query`, 'post', data.subscriberCriteria)
    .then(subscribers => {
      data.subscribers = subscribers
      next(null)
    })
    .catch(err => next(err))
}

exports._getPollsCount = (data, next) => {
  DataLayer.countPolls(data.pollsCountCriteria)
    .then(pollsCount => {
      data.count = pollsCount
      next(null)
    })
    .catch(err => next(err))
}

exports._getPollsUsingAggregate = (data, next) => {
  DataLayer.aggregateForPolls(
    data.pollsAggregate.match,
    undefined,
    data.pollsAggregate.lookup,
    data.pollsAggregate.limit,
    data.pollsAggregate.sort,
    data.pollsAggregate.skip
  )
    .then(polls => {
      data.polls = polls
      next(null)
    })
    .catch(err => next(err))
}

exports._getSurveysCount = (data, next) => {
  DataLayer.countSurveys(data.surveysCountCriteria)
    .then(surveysCount => {
      data.count = surveysCount
      next(null)
    })
    .catch(err => next(err))
}

exports._getSurveysUsingAggregate = (data, next) => {
  DataLayer.aggregateForSurveys(
    data.surveysAggregate.match,
    undefined,
    data.surveysAggregate.lookup,
    data.surveysAggregate.limit,
    data.surveysAggregate.sort,
    data.surveysAggregate.skip
  )
    .then(surveys => {
      data.surveys = surveys
      next(null)
    })
    .catch(err => next(err))
}

exports._getSubscribersCount = (data, next) => {
  callApi(`subscribers/aggregate`, 'post', data.subscribersCountCriteria)
    .then(subscribersCount => {
      data.count = subscribersCount
      next(null)
    })
    .catch(err => next(err))
}

exports._getSubscribersUsingAggregate = (data, next) => {
  callApi(`subscribers/aggregate`, 'post', data.subscribersAggregateCriteria)
    .then(subscribers => {
      data.subscribers = subscribers
      next(null)
    })
    .catch(err => next(err))
}

exports._getOnePoll = (data, next) => {
  DataLayer.findOnePoll(data.pollId)
    .then(poll => {
      data.poll = poll
      next(null)
    })
    .catch(err => next(err))
}

exports._getPollResponses = (data, next) => {
  PollResponseDataLayer.genericFindForPollResponse(data.pollResponsesCriteria)
    .then(pollResponses => {
      data.pollResponses = pollResponses
      next(null)
    })
    .catch(err => next(err))
}

exports._getPollPages = (data, next) => {
  PollPageDataLayer.genericFind(data.pollPagesCriteria)
    .then(pollPages => {
      data.pollPages = pollPages
      next(null)
    })
    .catch(err => next(err))
}

exports._getSurveys = (data, next) => {
  DataLayer.findSurvey(data.surveysCriteria)
    .then(survey => {
      data.survey = survey
      next(null)
    })
    .catch(err => next(err))
}

exports._getSurveyResponses = (data, next) => {
  SurveyResponseDataLayer.genericFind(data.surveyResponsesCriteria)
    .then(responses => {
      data.surveyResponses = responses
      next(null)
    })
    .catch(err => next(err))
}

exports._getSurveyQuestions = (data, next) => {
  SurveyQuestionDataLayer.findSurveyWithId(data.surveyQuestionsCriteria)
    .then(questions => {
      data.surveyQuestions = questions
      next(null)
    })
    .catch(err => next(err))
}
