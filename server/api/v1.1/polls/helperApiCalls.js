const PollResponseDataLayer = require('./pollresponse.datalayer')
const PollDataLayer = require('./polls.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')

exports._getPollsUsingQuery = (data, next) => {
  PollDataLayer.genericFindForPolls(data.criteria)
    .then(polls => {
      data.polls = polls
      next()
    })
    .catch(err => next(err))
}

exports._getPollPagesUsingQuery = (data, next) => {
  PollPageDataLayer.genericFind(data.criteria)
    .then(pollpages => {
      data.pollPages = pollpages
      next()
    })
    .catch(err => next(err))
}

exports._getPollResponsesUsingAggregate = (data, next) => {
  PollResponseDataLayer.aggregateForPollResponse(data.responsesCriteria.match, data.responsesCriteria.group)
    .then(responsesCount => {
      data.responsesCount = responsesCount
      next()
    })
    .catch(err => next(err))
}

exports._countPolls = (data, next) => {
  PollDataLayer.countPolls(data.pollsCriteria.match)
    .then(pollsCount => {
      data.pollsCount = pollsCount.length > 0 ? pollsCount[0].count : 0
      next()
    })
    .catch(err => next(err))
}

exports._getPollsUsingAggregate = (data, next) => {
  PollDataLayer.aggregateForPolls(
    data.pollsCriteria.match,
    null,
    null,
    data.pollsCriteria.limit,
    data.pollsCriteria.sort,
    data.pollsCriteria.skip)
    .then(polls => {
      data.polls = polls
      next()
    })
    .catch(err => next(err))
}

exports._deletePolls = (data, next) => {
  PollDataLayer.deleteForPolls(data.pollId)
    .then(poll => {
      next()
    })
    .catch(err => next(err))
}

exports._deletePollPages = (data, next) => {
  PollPageDataLayer.deleteForPollPage({pollId: data.pollId})
    .then(pollpages => {
      next()
    })
    .catch(err => next(err))
}

exports._deletePollResponses = (data, next) => {
  PollResponseDataLayer.deleteForPollResponse({pollId: data.pollId})
    .then(pollresponses => {
      next()
    })
    .catch(err => next(err))
}
