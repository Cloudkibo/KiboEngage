const MessengerPayload = require('./messengerPayload')
const FacebookPayload = require('./facebookPayload')

exports.handleTwitterPayload = function (req, savedMsg, page, actionType) {
  return new Promise((resolve, reject) => {
    let tagline = ''
    if (req.quote) {
      let originalUser = req.retweet.user
      let twitterUrls = req.urls.map((url) => url.url)
      let separators = [' ', '\n']
      let textArray = req.quote.split(new RegExp('[' + separators.join('') + ']', 'g'))
      // let textArray = req.quote.split(' ')
      tagline = `@${req.tweetUser.screen_name} retweeted @${originalUser.screen_name}:${prepareText(twitterUrls, textArray, req.urls)}\n\n@${originalUser.screen_name}'s tweet:`
      if (req.retweet.truncated) {
        handleTweet(
          tagline,
          req.retweet.extended_tweet.full_text,
          req.retweet.extended_tweet.extended_entities,
          req.retweet.extended_tweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page,
          actionType
        ).then(result => {
          resolve(result)
        })
      } else {
        handleTweet(
          tagline,
          req.retweet.text,
          req.retweet.extended_entities,
          req.retweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page,
          actionType
        ).then(result => {
          resolve(result)
        })
      }
    } else if (req.retweet) {
      let originalUser = req.retweet.user
      tagline = `@${req.tweetUser.screen_name} retweeted @${originalUser.screen_name}:`
      if (req.retweet.truncated) {
        handleTweet(
          tagline,
          req.retweet.extended_tweet.full_text,
          req.retweet.extended_tweet.extended_entities,
          req.retweet.extended_tweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page,
          actionType
        ).then(result => {
          resolve(result)
        })
      } else {
        handleTweet(
          tagline,
          req.retweet.text,
          req.retweet.extended_entities,
          req.retweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page,
          actionType
        ).then(result => {
          resolve(result)
        })
      }
    } else if (req.tweet) {
      tagline = `@${req.tweetUser.screen_name} tweeted:`
      if (req.tweet.truncated) {
        handleTweet(
          tagline,
          req.tweet.extended_tweet.full_text,
          req.tweet.extended_tweet.extended_entities,
          req.tweet.extended_tweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page,
          actionType
        ).then(result => {
          resolve(result)
        })
      } else {
        handleTweet(
          tagline,
          req.tweet.text,
          req.tweet.extended_entities,
          req.tweet.entities.urls,
          savedMsg,
          req.body.id_str,
          req.body.user.name,
          page,
          actionType
        ).then(result => {
          resolve(result)
        })
      }
    }
  })
}

const handleTweet = (tagline, text, tweet, urls, savedMsg, tweetId, userName, page, actionType) => {
  return new Promise((resolve, reject) => {
    if (actionType === 'messenger') {
      resolve(handleTweetForMessenger(tagline, text, tweet, urls, savedMsg, tweetId, userName, page))
    } else if (actionType === 'facebook') {
      resolve(handleTweetForFacebook(tagline, text, tweet, urls, tweetId, userName, page))
    }
  })
}

const handleTweetForFacebook = (tagline, text, tweet, urls, tweetId, userName, page) => {
  return new Promise((resolve, reject) => {
    let twitterUrls = urls.map((url) => url.url)
    let separators = [' ', '\n']
    let textArray = text.split(new RegExp('[' + separators.join('') + ']', 'g'))
    text = `${tagline}${prepareText(twitterUrls, textArray, urls)}`
    if (tweet && tweet.media && tweet.media.length > 0) {
      if (tweet.media[0].type === 'photo') {
        resolve(FacebookPayload.prepareFacebookPayloadForImage(text, tweet, tweetId))
      } else if (tweet.media[0].type === 'animated_gif' || tweet.media[0].type === 'video') {
        resolve(FacebookPayload.prepareFacebookPayloadForVideo(text, tweet, tweetId))
      }
    } else if (urls.length > 0) {
      resolve(FacebookPayload.prepareFacebookPayloadForText(text, tweetId, urls))
    } else {
      resolve(FacebookPayload.prepareFacebookPayloadForText(text, tweetId))
    }
  })
}

const handleTweetForMessenger = (tagline, text, tweet, urls, savedMsg, tweetId, userName, page) => {
  return new Promise((resolve, reject) => {
    let button = !(tweet && tweet.media && tweet.media.length > 0)
    let payload = []
    let twitterUrls = urls.map((url) => url.url)
    let separators = [' ', '\n']
    let textArray = text.split(new RegExp('[' + separators.join('') + ']', 'g'))
    // let textArray = text.split(' \n')
    text = `${tagline}${prepareText(twitterUrls, textArray, urls)}`
    payload.push(MessengerPayload.prepareMessengerPayloadForText('text', {text}, savedMsg, tweetId, button))
    if (tweet && tweet.media && tweet.media.length > 0) {
      if (tweet.media[0].type === 'photo') {
        payload.push(MessengerPayload.prepareMessengerPayloadForImage(tweet, savedMsg, tweetId, userName))
        resolve(payload)
      } else if (tweet.media[0].type === 'animated_gif' || tweet.media[0].type === 'video') {
        payload.push(MessengerPayload.prepareMessengerPayloadForVideo(tweet, savedMsg, tweetId, userName, page))
        resolve(payload)
      }
    } else if (urls.length > 0 && button) {
      MessengerPayload.prepareMessengerPayloadForLink(urls, savedMsg, tweetId, userName).then(linkpayload => {
        payload.push(linkpayload.messageData)
        if (!linkpayload.showButton) { // remove button from text
          payload[0] = {
            'text': payload[0].attachment.payload.text
          }
          resolve(payload)
        } else {
          resolve(payload)
        }
      })
    } else {
      resolve(payload)
    }
  })
}

const prepareText = (twitterUrls, textArray, urls) => {
  for (let i = 0; i < textArray.length; i++) {
    let index = twitterUrls.indexOf(textArray[i])
    if (index > -1) {
      textArray[i] = urls[index].expanded_url
    } else if (textArray[i].startsWith('http')) {
      textArray[i] = ''
    }
  }
  let text = textArray.join(' ')
  return text !== '' ? `\n${text}` : text
}
