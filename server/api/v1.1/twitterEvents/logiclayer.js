const MessengerPayload = require('./messengerPayload')
const FacebookPayload = require('./facebookPayload')

exports.handleTwitterPayload = function (req, savedMsg, page, actionType) {
  return new Promise((resolve, reject) => {
    // console.log('in handleTwitterPayload', JSON.stringify(req.body))
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
          actionType,
          req.tweetUser.screen_name
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
          actionType,
          req.tweetUser.screen_name
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
          actionType,
          req.tweetUser.screen_name
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
          actionType,
          req.tweetUser.screen_name
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
          actionType,
          req.tweetUser.screen_name
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
          actionType,
          req.tweetUser.screen_name
        ).then(result => {
          resolve(result)
        })
      }
    }
  })
}

exports.checkFilterStatus = function (postingItem, req) {
  if (postingItem.filterTweets) {
    let filter = false
    let text = ''
    if (req.quote) {
      text = req.quote + ' ' + getText(req.retweet)
    } else if (req.retweet) {
      text = getText(req.retweet)
    } else if (req.tweet) {
      text = getText(req.tweet)
    }
    for (let i = 0; i < postingItem.filterTags.length; i++) {
      if (text.toLowerCase().includes(postingItem.filterTags[i].toLowerCase())) {
        filter = true
        break
      }
    }
    if (filter) {
      return true
    } else {
      return false
    }
  } else {
    return true
  }
}

exports.prepareApprovalMessage = function (recipientId, postingItem, req) {
  let username = `@${req.tweetUser.screen_name}`
  let tweetUrl = `https://twitter.com/${req.tweetUser.screen_name}/status/${req.body.id_str}`
  let forwardPayload = {
    autopostingId: postingItem._id,
    tweetId: req.body.id_str,
    action: 'send_tweet'
  }
  let dontForwardPayload = {
    autopostingId: postingItem._id,
    tweetId: req.body.id_str,
    action: 'do_not_send_tweet'
  }
  let messageData = {
    'recipient': {
      'id': recipientId
    },
    'message': JSON.stringify({
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': `A new tweet has come from ${username}. Would you like to forward this to your subscribers?`,
          'buttons': [
            {
              'type': 'web_url',
              'title': 'View Tweet',
              'url': tweetUrl
            },
            {
              'type': 'postback',
              'title': 'Forward',
              'payload': JSON.stringify(forwardPayload)
            },
            {
              'type': 'postback',
              'title': 'Don\'t Forward',
              'payload': JSON.stringify(dontForwardPayload)
            }
          ]
        }
      }
    })
  }
  return messageData
}

const getText = (tweet) => {
  if (tweet.truncated) {
    return tweet.extended_tweet.full_text
  } else {
    return tweet.text
  }
}

const handleTweet = (tagline, text, tweet, urls, savedMsg, tweetId, userName, page, actionType, screenName) => {
  return new Promise((resolve, reject) => {
    if (actionType === 'messenger') {
      resolve(handleTweetForMessenger(tagline, text, tweet, urls, savedMsg, tweetId, userName, page, screenName))
    } else if (actionType === 'facebook') {
      resolve(handleTweetForFacebook(tagline, text, tweet, urls, tweetId, userName, page, screenName))
    }
  })
}

const handleTweetForFacebook = (tagline, text, tweet, urls, tweetId, userName, page, screenName) => {
  return new Promise((resolve, reject) => {
    let twitterUrls = urls.map((url) => url.url)
    let separators = [' ', '\n']
    let textArray = text.split(new RegExp('[' + separators.join('') + ']', 'g'))
    text = `${tagline}${prepareText(twitterUrls, textArray, urls)}`
    if (tweet && tweet.media && tweet.media.length > 0) {
      if (tweet.media[0].type === 'photo') {
        resolve(FacebookPayload.prepareFacebookPayloadForImage(text, tweet, tweetId, screenName))
      } else if (tweet.media[0].type === 'animated_gif' || tweet.media[0].type === 'video') {
        resolve(FacebookPayload.prepareFacebookPayloadForVideo(text, tweet, tweetId, screenName))
      }
    } else if (urls.length > 0) {
      resolve(FacebookPayload.prepareFacebookPayloadForText(text, tweetId, urls, screenName))
    } else {
      resolve(FacebookPayload.prepareFacebookPayloadForText(text, tweetId, null, screenName))
    }
  })
}

const handleTweetForMessenger = (tagline, text, tweet, urls, savedMsg, tweetId, userName, page, screenName) => {
  return new Promise((resolve, reject) => {
    let button = !(tweet && tweet.media && tweet.media.length > 0)
    let payload = []
    let twitterUrls = urls.map((url) => url.url)
    let separators = [' ', '\n']
    let textArray = text.split(new RegExp('[' + separators.join('') + ']', 'g'))
    // let textArray = text.split(' \n')
    text = `${tagline}${prepareText(twitterUrls, textArray, urls)}`
    payload.push(MessengerPayload.prepareMessengerPayloadForText('text', {text}, savedMsg, tweetId, button, screenName))
    if (tweet && tweet.media && tweet.media.length > 0) {
      if (tweet.media[0].type === 'photo') {
        payload.push(MessengerPayload.prepareMessengerPayloadForImage(tweet, savedMsg, tweetId, userName, screenName))
        resolve(payload)
      } else if (tweet.media[0].type === 'animated_gif' || tweet.media[0].type === 'video') {
        MessengerPayload.prepareMessengerPayloadForVideo(tweet, savedMsg, tweetId, userName, page, screenName).then(result => {
          if (result.attachment) {
            payload.push(result)
            resolve(payload)
          } else {
            let text = payload[0].text + '\n' + result.url
            let data = MessengerPayload.prepareMessengerPayloadForText('text', {text}, savedMsg, tweetId, true, screenName)
            payload[0] = data
          }
        })
      }
    } else if (urls.length > 0 && button) {
      MessengerPayload.prepareMessengerPayloadForLink(urls, savedMsg, tweetId, userName, screenName).then(linkpayload => {
        console.log('linkpayload.messageData', linkpayload.messageData)
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
