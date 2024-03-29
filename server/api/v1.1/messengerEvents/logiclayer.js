const fs = require('fs')
const path = require('path')
let request = require('request')
const config = require('../../../config/environment/index')

function prepareSendAPIPayload (subscriberId, body, fname, lname, isResponse) {
  return new Promise(function (resolve, reject) {
    let messageType = isResponse ? 'RESPONSE' : 'UPDATE'
    let payload = {}
    let text = body.text
    if (body.componentType === 'text' && !body.buttons) {
      if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
        text = text.replace(
          /{{user_full_name}}/g, fname + ' ' + lname)
      }
      if (body.text.includes('{{user_first_name}}')) {
        text = text.replace(
          /{{user_first_name}}/g, fname)
      }
      if (body.text.includes('{{user_last_name}}')) {
        text = text.replace(
          /{{user_last_name}}/g, lname)
      }
      payload = {
        'messaging_type': messageType,
        'recipient': JSON.stringify({
          'id': subscriberId
        }),
        'message': JSON.stringify({
          'text': text,
          'metadata': 'This is a meta data'
        })
      }
      resolve({payload})
    } else if (body.componentType === 'text' && body.buttons) {
      if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
        text = text.replace(
          /{{user_full_name}}/g, fname + ' ' + lname)
      }
      if (body.text.includes('{{user_first_name}}')) {
        text = text.replace(
          /{{user_first_name}}/g, fname)
      }
      if (body.text.includes('{{user_last_name}}')) {
        text = text.replace(
          /{{user_last_name}}/g, lname)
      }
      payload = {
        'messaging_type': messageType,
        'recipient': JSON.stringify({
          'id': subscriberId
        }),
        'message': JSON.stringify({
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'button',
              'text': text,
              'buttons': body.buttons
            }
          },
          'metadata': 'This is a meta data'
        })
      }
      resolve({payload})
    } else if (['image', 'audio', 'file', 'video'].indexOf(
      body.componentType) > -1) {
      let dir = path.resolve(__dirname, '../../../../broadcastFiles/')
      let fileToStore = ''
      if (body.componentType === 'file') {
        fileToStore = dir + '/userfiles/' + body.fileurl.name
      } else {
        fileToStore = dir + '/userfiles/' + body.fileurl.id
      }
      var stream = request(`${config.api_urls['accounts']}/files/download/${body.fileurl.id}`).pipe(fs.createWriteStream(fileToStore))
      stream.on('finish', function () {
        let fileReaderStream = fs.createReadStream(fileToStore)
        stream.on('close', function () {
          payload = {
            'messaging_type': messageType,
            'recipient': JSON.stringify({
              'id': subscriberId
            }),
            'message': JSON.stringify({
              'attachment': {
                'type': body.componentType,
                'payload': {}
              },
              'metadata': 'This is a meta data'
            }),
            'filedata': fileReaderStream
          }
          fs.unlink(fileToStore)
          resolve({payload})
        })
      })
      // todo test this one. we are not removing as we need to keep it for live chat
      // if (!isForLiveChat) deleteFile(body.fileurl)
    } else if (['gif', 'sticker', 'thumbsUp'].indexOf(
      body.componentType) > -1) {
      payload = {
        'messaging_type': messageType,
        'recipient': JSON.stringify({
          'id': subscriberId
        }),
        'message': JSON.stringify({
          'attachment': {
            'type': 'image',
            'payload': {
              'url': body.fileurl
            }
          },
          'metadata': 'This is a meta data'
        })
      }
      resolve({payload})
    } else if (body.componentType === 'card') {
      payload = {
        'messaging_type': messageType,
        'recipient': JSON.stringify({
          'id': subscriberId
        }),
        'message': JSON.stringify({
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'generic',
              'elements': [
                {
                  'title': body.title,
                  'image_url': body.image_url,
                  'subtitle': body.description,
                  'buttons': body.buttons
                }
              ]
            }
          },
          'metadata': 'This is a meta data'
        })
      }
      resolve({payload})
    } else if (body.componentType === 'gallery') {
      var galleryCards = []
      if (body.cards && body.cards.length > 0) {
        for (var g = 0; g < body.cards.length; g++) {
          var card = body.cards[g]
          var galleryCard = {}
          galleryCard.image_url = card.image_url
          galleryCard.title = card.title
          galleryCard.buttons = card.buttons
          galleryCard.subtitle = card.subtitle
          if (card.default_action) {
            galleryCard.default_action = card.default_action
          }
          galleryCards.push(galleryCard)
        }
      }
      payload = {
        'messaging_type': messageType,
        'recipient': JSON.stringify({
          'id': subscriberId
        }),
        'message': JSON.stringify({
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'generic',
              'elements': galleryCards
            }
          },
          'metadata': 'This is a meta data'
        })
      }
      resolve({payload})
    }
  })
}
exports.prepareSendAPIPayload = prepareSendAPIPayload
