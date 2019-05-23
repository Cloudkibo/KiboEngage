const compose = require('composable-middleware')

exports.checkTweetType = function () {
  return compose()
    .use((req, res, cb) => {
      let body = req.body
      req.tweetUser = req.body.user
      if (body.quoted_status) {
        req.retweet = body.quoted_status
        req.quote = body.extended_tweet ? body.extended_tweet.full_text : body.text
        req.urls = body.extended_tweet ? body.extended_tweet.entities.urls : body.entities.urls
        cb()
      } else if (body.retweeted_status) {
        req.retweet = body.retweeted_status
        cb()
      } else {
        req.tweet = body
        cb()
      }
    })
}
