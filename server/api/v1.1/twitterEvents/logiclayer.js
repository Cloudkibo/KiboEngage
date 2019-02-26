const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const config = require('../../../config/environment/index')

exports.checkType = function (body, subscriber, savedMsg) {
  return new Promise(function (resolve, reject) {
    let messageData = {}
    let text = body.text.split('https://t.co/')
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
          if (body.extended_entities.media[0].type === 'photo') {
            let otherMessage = preparePaylod(body, subscriber, newURL, 'text', text[0])
            messageData = preparePaylod(body, subscriber, newURL, 'photo')
            resolve({messageData: messageData, otherMessage: otherMessage})
          } else {
            let otherMessage = preparePaylod(body, subscriber, newURL, 'text', text[0])
            messageData = preparePaylod(body, subscriber, '', 'video')
            resolve({messageData: messageData, otherMessage: otherMessage})
          }
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
            messageData = preparePaylod(body, subscriber, newURL, 'photo')
            resolve({messageData: messageData})
          })
      } else {
        messageData = preparePaylod(body, subscriber, '', 'video')
        resolve({messageData: messageData})
      }
    }
  //  if (!body.extended_entities || (body.extended_entities && body.extended_entities.media[0].type === 'photo')) {
  //    let URLObject = {
  //      originalURL: body.entities.media[0].url,
  //      subscriberId: subscriber._id,
  //      module: {
  //        id: savedMsg._id,
  //        type: 'autoposting'
  //      }
  //    }
  //    URLDataLayer.createURLObject(URLObject)
  //      .then(savedurl => {
  //        let newURL = config.domain + '/api/URL/' + savedurl._id
  //  } else {
  //    preparePaylod(body, subscriber, newURL)
  //  }
  })
}
function preparePaylod (body, subscriber, newURL, type, text) {
  let messageData = {}
  if (type === 'text') {
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
  } else if (type === 'photo') {
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
            'elements': prepareGallery(body.extended_entities.media, body, newURL)
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
        'attachment': {
          'type': 'video',
          'payload': {
            'url': getVideoURL(body.extended_entities.media[0].video_info.variants)
          }
        }
      })
    }
    return messageData
  }
}
function prepareGallery (media, body, newURL) {
  let length = media.length <= 10 ? media.length : 10
  let elements = []
  for (let i = 0; i < length; i++) {
    elements.push({
      'title': body.text,
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
