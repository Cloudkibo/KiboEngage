const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const config = require('../../../config/environment/index')
const og = require('open-graph')

const prepareMessengerPayloadForVideo = (tweet, savedMsg, tweetId, userName, page) => {
  let messageData = {
    'attachment': {
      'type': 'video',
      'payload': {
        'url': getVideoURL(tweet.media[0].video_info.variants)
      }
    }
  }
  return messageData
}

const prepareMessengerPayloadForLink = (urls, savedMsg, tweetId, userName) => {
  return new Promise(function (resolve, reject) {
    prepareGalleryForLink(urls, savedMsg, tweetId).then(gallery => {
      let messageData = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': gallery
          }
        }
      }
      resolve({messageData: messageData, showButton: !(gallery.length > 0)})
    })
  })
}

const prepareGalleryForLink = (urls, savedMsg, tweetId) => {
  return new Promise(function (resolve, reject) {
    let gallery = []
    let buttons = []
    prepareViewTweetButton(savedMsg, tweetId).then(button => {
      buttons.push(button)
      buttons.push(prepareShareButton(savedMsg, tweetId, null, 'card'))
    })
    for (let i = 0; i < urls.length; i++) {
      og(urls[i].expanded_url, (err, meta) => {
        if (err) {
          console.log('error in fetching metdata')
        }
        if (meta !== {} && meta.image && meta.title) {
          console.log('metadata', meta)
          gallery.push({
            'title': meta.title,
            'subtitle': 'kibopush.com',
            'image_url': meta.image.url,
            'buttons': buttons
          })
          if (i === urls.length - 1) {
            resolve(gallery)
          }
        } else {
          if (i === urls.length - 1) {
            resolve(gallery)
          }
        }
      })
    }
  })
}

const prepareMessengerPayloadForImage = (tweet, savedMsg, tweetId, userName) => {
  let gallery = prepareGallery(tweet.media, savedMsg, tweetId, userName)
  let messageData = {
    'attachment': {
      'type': 'template',
      'payload': {
        'template_type': 'generic',
        'elements': gallery
      }
    }
  }
  return messageData
}

function prepareGallery (media, savedMsg, tweetId, userName) {
  let length = media.length <= 10 ? media.length : 10
  let elements = []
  let buttons = []
  prepareViewTweetButton(savedMsg, tweetId).then(button => {
    buttons.push(button)
    buttons.push(prepareShareButton(savedMsg, tweetId, null, 'card'))
  })
  for (let i = 0; i < length; i++) {
    elements.push({
      'title': userName,
      'subtitle': 'kibopush.com',
      'image_url': media[i].media_url,
      'buttons': buttons
    })
  }
  return elements
}

const prepareMessengerPayloadForText = (type, body, savedMsg, tweetId, showButton) => {
  let messageData = {}
  let buttons = []
  if (showButton) {
    prepareViewTweetButton(savedMsg, tweetId).then(button => {
      buttons.push(button)
      buttons.push(prepareShareButton(savedMsg, tweetId, body))
    })
    messageData = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': body.text,
          'buttons': buttons
        }
      }
    }
  } else {
    messageData = {
      'text': body.text
    }
  }
  return messageData
}

const prepareViewTweetButton = (savedMsg, tweetId) => {
  return new Promise(function (resolve, reject) {
    let URLObject = {
      originalURL: `https://twitter.com/statuses/${tweetId}`,
      module: {
        id: savedMsg._id,
        type: 'autoposting'
      }
    }
    URLDataLayer.createURLObject(URLObject)
      .then(savedurl => {
        let newURL = config.domain + '/api/URL/' + savedurl._id
        let button = {
          'type': 'web_url',
          'url': newURL,
          'title': 'View Tweet'
        }
        resolve(button)
      })
  })
}
const prepareShareButton = (savedMsg, tweetId, body, type) => {
  let button
  if (type && type === 'card') {
    button = {
      'type': 'element_share'
    }
  } else {
    button = {
      'type': 'element_share',
      'share_contents': {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [{
              'title': body.text,
              'subtitle': 'kibopush.com',
              'default_action': {
                'type': 'web_url',
                'url': `https://twitter.com/statuses/${tweetId}`
              },
              'buttons': []
            }]
          }
        }
      }
    }
  }
  return button
}

const getVideoURL = (variants) => {
  let url = ''
  for (let i = 0; i < variants.length; i++) {
    if (variants[i].content_type === 'video/mp4' && (variants[i].bitrate === 2176000 || variants[i].bitrate === 0)) {
      url = variants[i].url
      break
    }
  }
  return url
}

exports.prepareMessengerPayloadForVideo = prepareMessengerPayloadForVideo
exports.prepareMessengerPayloadForLink = prepareMessengerPayloadForLink
exports.prepareMessengerPayloadForImage = prepareMessengerPayloadForImage
exports.prepareMessengerPayloadForText = prepareMessengerPayloadForText
exports.getVideoURL = getVideoURL
