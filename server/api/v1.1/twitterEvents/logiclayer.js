const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const config = require('../../../config/environment/index')

exports.checkType = function (body, subscriber, savedMsg) {
  return new Promise(function (resolve, reject) {
    let messageData = {}
    let text = ''
    if (body.truncated) {
      text = body.extended_tweet.full_text.split('https://t.co/')
    } else {
      text = body.text.split('https://t.co/')
    }
    if (text[0] && !text[1]) {
      // text only
      let URLObject = {
        originalURL: `https://twitter.com/${body.user.screen_name}`,
        subscriberId: subscriber._id,
        module: {
          id: savedMsg._id,
          type: 'autoposting'
        }
      }
      URLDataLayer.createURLObject(URLObject)
        .then(savedurl => {
          let newURL = config.domain + '/api/URL/' + savedurl._id
          messageData = preparePaylod(body, subscriber, newURL, 'text', text[0])
          resolve({messageData: messageData})
        })
    } else if (text[0] && text[1]) {
      // text with attachment
      let originalURL
      if (body.truncated) {
        originalURL = body.extended_tweet.entities.media[0].url
      } else {
        originalURL = body.entities.media[0].url
      }
      console.log('in both', body.entities.media)
      let URLObject = {
        originalURL: originalURL,
        subscriberId: subscriber._id,
        module: {
          id: savedMsg._id,
          type: 'autoposting'
        }
      }
      console.log('URLObject', URLObject)
      URLDataLayer.createURLObject(URLObject)
        .then(savedurl => {
          console.log('saved url', savedurl)
          let newURL = config.domain + '/api/URL/' + savedurl._id
          if ((body.extended_entities && body.extended_entities.media[0].type === 'photo') || (body.truncated && body.extended_tweet.extended_entities.media[0].type === 'photo')) {
            let otherMessage = preparePaylod(body, subscriber, newURL, 'text', text[0], true)
            messageData = preparePaylod(body, subscriber, newURL, 'photo', text[1])
            resolve({messageData: messageData, otherMessage: otherMessage})
          } else {
            let otherMessage = preparePaylod(body, subscriber, newURL, 'text', text[0], true)
            console.log('otherMessage', otherMessage)
            messageData = preparePaylod(body, subscriber, '', 'video', text[1])
            console.log('message', messageData)
            resolve({messageData: messageData, otherMessage: otherMessage})
          }
        })
        .catch(err => {
          console.log(`Error in creating Autoposting message object ${err}`)
        })
    } else {
      //  attachment only
      if (body.extended_entities.media[0].type === 'photo') {
        let URLObject = {
          originalURL: body.entities.media[0].url,
          subscriberId: subscriber._id,
          module: {
            id: savedMsg._id,
            type: 'autoposting'
          }
        }
        URLDataLayer.createURLObject(URLObject)
          .then(savedurl => {
            let newURL = config.domain + '/api/URL/' + savedurl._id
            messageData = preparePaylod(body, subscriber, newURL, 'photo', text[1])
            resolve({messageData: messageData})
          })
      } else {
        messageData = preparePaylod(body, subscriber, '', 'video')
        resolve({messageData: messageData})
      }
    }
  })
}
function preparePaylod (body, subscriber, newURL, type, text, otherMessage) {
  let messageData = {}
  if (type === 'text') {
    if (otherMessage) {
      messageData = {
        'messaging_type': 'UPDATE',
        'recipient': JSON.stringify({
          'id': subscriber.senderId
        }),
        'message': JSON.stringify({
          'text': text,
          'metadata': 'This is a meta data'
        })
      }
      return messageData
    } else {
      messageData = {
        'messaging_type': 'UPDATE',
        'recipient': JSON.stringify({
          'id': subscriber.senderId
        }),
        'message': JSON.stringify({
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'button',
              'text': text,
              'buttons': [
                {
                  'type': 'web_url',
                  'url': newURL,
                  'title': 'View Tweet'
                }
              ]
            }
          }
        })
      }
      return messageData
    }
  } else if (type === 'photo') {
    let gallery
    if (body.truncated) {
      gallery = prepareGallery(body.extended_tweet.extended_entities.media, text, newURL)
    } else {
      gallery = prepareGallery(body.extended_entities.media, text, newURL)
    }
    messageData = {
      'messaging_type': 'UPDATE',
      'recipient': JSON.stringify({
        'id': subscriber.senderId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': gallery
          }
        }
      })
    }
    return messageData
  } else {
    let videoUrl
    if (body.truncated) {
      videoUrl = getVideoURL(body.extended_tweet.extended_entities.media[0].video_info.variants)
    } else {
      videoUrl = getVideoURL(body.extended_entities.media[0].video_info.variants)
    }
    messageData = {
      'messaging_type': 'UPDATE',
      'recipient': JSON.stringify({
        'id': subscriber.senderId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'video',
          'payload': {
            'url': videoUrl
          }
        }
      })
    }
    return messageData
  }
}
function prepareGallery (media, text, newURL) {
  let length = media.length <= 10 ? media.length : 10
  let elements = []
  for (let i = 0; i < length; i++) {
    elements.push({
      'title': text,
      'image_url': media[i].media_url,
      'subtitle': 'www.kiboengage.cloudkibo.com',
      'buttons': [
        {
          'type': 'web_url',
          'url': newURL,
          'title': 'View Tweet'
        }
      ]
    })
  }
  return elements
}
function getVideoURL (variants) {
  let url = ''
  for (let i = 0; i < variants.length; i++) {
    if (variants[i].content_type === 'video/mp4' && (variants[i].bitrate === 2176000 || variants[i].bitrate === 0)) {
      url = variants[i].url
      break
    }
  }
  return url
}
