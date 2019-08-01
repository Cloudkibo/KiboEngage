const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const config = require('../../../config/environment/index')
const og = require('open-graph')
const remote = require('remote-file-size')
const fs = require('fs')
const https = require('https')
const path = require('path')

const prepareMessengerPayloadForVideo = (tweet, savedMsg, tweetId, userName, page) => {
  return new Promise((resolve, reject) => {
    let url = getVideoURL(tweet.media[0].video_info.variants)
    let messageData = {
      'attachment': {
        'type': 'video',
        'payload': {
          'url': url
        }
      }
    }
    remote(url, function (err, size) {
      if (err) console.log('err')
      let sizeInMb = (size / 1000) / 1000
      if (sizeInMb > 25) {
        chopVideo(url).then(result => {
          messageData.attachment.payload['url'] = result
          resolve(messageData)
        })
      } else {
        resolve(messageData)
      }
    })
  })
}

const prepareMessengerPayloadForLink = (urls, savedMsg, tweetId, userName, screenName) => {
  return new Promise(function (resolve, reject) {
    prepareGalleryForLink(urls, savedMsg, tweetId, screenName).then(gallery => {
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

const prepareGalleryForLink = (urls, savedMsg, tweetId, screenName) => {
  return new Promise(function (resolve, reject) {
    let gallery = []
    let buttons = []
    prepareViewTweetButton(savedMsg, tweetId, screenName).then(button => {
      buttons.push(button)
      buttons.push(prepareShareButton(savedMsg, tweetId, null, 'card', screenName))
    })
    for (let i = 0; i < urls.length; i++) {
      og(urls[i].expanded_url, (err, meta) => {
        if (err) {
          console.log('error in fetching metdata')
        }
        if (meta && meta !== {} && meta.image && meta.title) {
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

const prepareMessengerPayloadForImage = (tweet, savedMsg, tweetId, userName, screenName) => {
  let gallery = prepareGallery(tweet.media, savedMsg, tweetId, userName, screenName)
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

function prepareGallery (media, savedMsg, tweetId, userName, screenName) {
  let length = media.length <= 10 ? media.length : 10
  let elements = []
  let buttons = []
  prepareViewTweetButton(savedMsg, tweetId, screenName).then(button => {
    buttons.push(button)
    buttons.push(prepareShareButton(savedMsg, tweetId, null, 'card', screenName))
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

const prepareMessengerPayloadForText = (type, body, savedMsg, tweetId, showButton, screenName) => {
  let messageData = {}
  let buttons = []
  if (showButton) {
    prepareViewTweetButton(savedMsg, tweetId, screenName).then(button => {
      buttons.push(button)
      buttons.push(prepareShareButton(savedMsg, tweetId, body, null, screenName))
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

const prepareViewTweetButton = (savedMsg, tweetId, screenName) => {
  return new Promise(function (resolve, reject) {
    let URLObject = {
      originalURL: `https://twitter.com/${screenName}/status/${tweetId}`,
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
const prepareShareButton = (savedMsg, tweetId, body, type, screenName) => {
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
                'url': `https://twitter.com/${screenName}/status/${tweetId}`
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
    if (variants[i].content_type === 'video/mp4' && (variants[i].bitrate === 256000 || variants[i].bitrate === 2176000 || variants[i].bitrate === 0)) {
      url = variants[i].url
      break
    }
  }
  return url
}

function chopVideo (url) {
  return new Promise((resolve, reject) => {
    let filename = url.split('?')[0].split('/')[url.split('?')[0].split('/').length - 1]
    let dir = path.resolve(__dirname, '../../../../broadcastFiles/')
    https.get(url, function (response) {
      let file = fs.createWriteStream(dir + '/userfiles/' + filename)
      let stream = response.pipe(file)
      let size = 0
      response.on('data', function (data) {
        size += data.length
        if (size >= 20000000) {
          stream.end()
        }
      })
      stream.on('error', (error) => {
        console.log('error while writing', error)
        stream.end()
        // reject(error)
      })
      stream.on('finish', () => {
        console.log('finished writing')
        resolve(`${config.domain}/api/broadcasts/download/${filename}`)
      })
    })
  })
}

exports.prepareMessengerPayloadForVideo = prepareMessengerPayloadForVideo
exports.prepareMessengerPayloadForLink = prepareMessengerPayloadForLink
exports.prepareMessengerPayloadForImage = prepareMessengerPayloadForImage
exports.prepareMessengerPayloadForText = prepareMessengerPayloadForText
exports.getVideoURL = getVideoURL
