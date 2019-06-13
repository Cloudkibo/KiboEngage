const { getVideoURL } = require('./messengerPayload')

const prepareFacebookPayloadForText = (text, tweetId, urls) => {
  let payload = {
    type: 'text',
    payload: {
      'message': `${text}\n\nTweet link: https://twitter.com/statuses/${tweetId}`
    }
  }
  if (urls && urls.length === 1) {
    payload.payload['link'] = urls[0].expanded_url
  } else if (urls && urls.length > 1) {
    payload.payload['link'] = `https://twitter.com/statuses/${tweetId}`
    let links = []
    for (let i = 0; i < urls.length && i < 10; i++) {
      links.push({'link': urls[i].expanded_url})
    }
    payload.payload['child_attachments'] = links
  }
  return payload
}

const prepareFacebookPayloadForImage = (text, tweet, tweetId) => {
  let payload = {}
  if (tweet.media.length === 1) {
    payload = {
      type: 'image',
      payload: {
        'url': tweet.media[0].media_url_https,
        'caption': `${text}\n\nTweet link: https://twitter.com/statuses/${tweetId}`
      }
    }
  } else if (tweet.media.length > 1) {
    let links = []
    for (let i = 0; i < tweet.media.length && i < 10; i++) {
      links.push({'link': tweet.media[i].media_url_https})
    }
    payload = {
      type: 'images',
      payload: {
        'message': `${text}\n\nTweet link: https://twitter.com/statuses/${tweetId}`,
        'link': `https://twitter.com/statuses/${tweetId}`,
        'child_attachments': links
      }
    }
    console.log(JSON.stringify(payload))
  }
  return payload
}

const prepareFacebookPayloadForVideo = (text, tweet, tweetId) => {
  let payload = {
    type: 'video',
    payload: {
      'file_url': getVideoURL(tweet.media[0].video_info.variants),
      'description': `${text}\n\nTweet link: https://twitter.com/statuses/${tweetId}`
    }
  }
  return payload
}

exports.prepareFacebookPayloadForText = prepareFacebookPayloadForText
exports.prepareFacebookPayloadForImage = prepareFacebookPayloadForImage
exports.prepareFacebookPayloadForVideo = prepareFacebookPayloadForVideo
