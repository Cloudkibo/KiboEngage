const Sessions = require('./sessions.model')



exports.aggregateSession = (query) => {
  return Sessions.aggregate(query)
    .exec()
}
