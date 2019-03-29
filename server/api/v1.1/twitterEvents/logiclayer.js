const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const config = require('../../../config/environment/index')

exports.checkType = function (body, subscriber, savedMsg) {
  return new Promise(function (resolve, reject) {
    let messageData = {}
    let text = ''
    let button = true
    if (body.truncated) {
      text = body.extended_tweet.full_text.split('https://t.co/')
    } else {
      text = body.text.split('https://t.co/')
    }
    if (body.entities.urls && body.entities.urls.length > 0) {
      for (let i = 0; i < body.entities.urls.length; i++) {
        text[0] = text[0] + `\n${body.entities.urls[i].expanded_url}`
      }
    }
    console.log('text in checkTypes', text[0])
    console.log('text in checkTypes', text[1])
    if (text[0] && !text[1]) {
      // text only
      console.log('in text')
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
          messageData = preparePaylod(body, subscriber, newURL, 'text', text[0], button)
          resolve({messageData: messageData})
        })
    } else if (text[0] && text[1]) {
      // text with attachment
      let originalURL
      if (body.truncated) {
        if (body.extended_tweet.entities.media) {
          originalURL = body.extended_tweet.entities.media[0].url
        } else {
          originalURL = `https://twitter.com/${body.user.screen_name}`
        }
      } else {
        if (body.entities.media) {
          originalURL = body.entities.media[0].url
        } else {
          originalURL = `https://twitter.com/${body.user.screen_name}`
        }
      }
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
            button = false
            let otherMessage = preparePaylod(body, subscriber, newURL, 'text', text[0], button)
            messageData = preparePaylod(body, subscriber, newURL, 'photo', text[1])
            resolve({messageData: messageData, otherMessage: otherMessage})
          } else {
            if ((body.extended_entities && body.extended_entities.media[0].type === 'video') ||
            (body.truncated && body.extended_tweet.extended_entities.media[0].type === 'video') ||
            (body.truncated && body.extended_tweet.extended_entities.media[0].type === 'animated_gif') ||
            (body.truncated && body.extended_tweet.extended_entities.media[0].type === 'animated_gif')
            ) {
              button = false
              messageData = preparePaylod(body, subscriber, '', 'video', text[1])
            }
            let otherMessage = preparePaylod(body, subscriber, newURL, 'text', text[0], button)
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
function preparePaylod (body, subscriber, newURL, type, text, button) {
  let messageData = {}
  if (type === 'text') {
    if (button) {
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
    } else {
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
      'title': 'www.kiboengage.cloudkibo.com',
      'image_url': media[i].media_url,
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
