const checkTweetType = function (body) {
  if (body.quoted_status) {
    return 'quote'
  } else if (body.retweeted_status) {
    return 'retweet'
  } else {
    return 'tweet'
  }
}
const isExtendedTweet = function (tweet) {
  if (tweet.truncated) {
    return true
  } else {
    return false
  }
}
const isText = function (text) {
  let splitText = text.split('https://t.co/')
  if (splitText[0]) {
    return true
  } else {
    return false
  }
}
const isImage = function (tweet) {
  if (tweet.extended_entities && tweet.extended_entities.media &&
    tweet.extended_entities.media.length > 0 && tweet.extended_entities.media[0].type === 'photo') {
    return true
  } else {
    return false
  }
}
const isVideo = function (tweet) {
  if (tweet.extended_entities && tweet.extended_entities.media &&
    tweet.extended_entities.media.length > 0 &&
    (tweet.extended_entities.media[0].type === 'video' || tweet.extended_entities.media[0].type === 'animated_gif')) {
    return true
  } else {
    return false
  }
}
const isLink = function (tweet) {
  if (tweet.entities && tweet.entities.urls && tweet.entities.urls.length > 0) {
    return true
  } else {
    return false
  }
}
exports.preparePayload = function (body) {
  let text = ''
  let tweetUser = body.user
  if (checkTweetType(body) === 'quote') {
    let retweetUser = body.quoted_status.user
    text = `${tweetUser.name} @${tweetUser.screen_name} retweeted @${retweetUser.screen_name}:\n`
    if (isExtendedTweet(body)) { //tweetuser's text
      text = text + body.extended_tweet.full_text + '\n\n'
      if (isExtendedTweet(body.quoted_status)) {
        text = text + body.quoted_status.extended_tweet.full_text
      } else {
        if (isText(body.text)) {
          text = text + body.text
        }
      }
    } else {

    }
  } else if (checkTweetType(body) === 'retweet') {
    let retweetUser = body.retweeted_status.user
    text = `@${tweetUser.screen_name} retweeted @${retweetUser.screen_name}:\n`
  } else if (checkTweetType(body) === 'tweet') {
    text = `@${tweetUser.screen_name} tweeted:\n`
  }
}
function prepareText
