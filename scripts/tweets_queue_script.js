const logger = require('../server/components/logger')
const utility = require('../server/api/v1.1/utility')
const TAG = 'scripts/monodb_script.js'

exports.deleteFromQueue = function () {
  utility.callApi('tweets_queue', 'get', {}, '', 'kiboengage')
    .then(tweets => {
      if (tweets.length > 0) {
        for (let i = 0; i < tweets.length; i++) {
          let tweet = tweets[i]
          if (new Date(tweet.expiryTime).getTime() < new Date().getTime()) {
            utility.callApi(
              'tweets_queue',
              'delete',
              {purpose: 'deleteOne', match: {_id: tweet._id}},
              '',
              'kiboengage'
            ).then(deleted => {
            })
              .catch(err => {
                const message = err || 'Failed to delete tweet from tweets queue'
                logger.serverLog(message, `${TAG}: exports.deleteFromQueue`, tweets, {}, 'error')
              })
          }
        }
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch tweets queue'
      logger.serverLog(message, `${TAG}: exports.deleteFromQueue`, {}, {}, 'error')
    })
}
