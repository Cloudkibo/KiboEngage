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
              logger.serverLog(TAG, 'Tweet queue object deleted successfully!', 'debug')
            })
              .catch(err => {
                logger.serverLog(TAG, `Failed to delete tweet from tweets queue ${err}`, 'error')
              })
          }
        }
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch tweets queue ${err}`, 'error')
    })
}
