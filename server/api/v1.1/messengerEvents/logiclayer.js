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
          '{{user_full_name}}', fname + ' ' + lname)
      }
      if (body.text.includes('{{user_first_name}}')) {
        text = text.replace(
          '{{user_first_name}}', fname)
      }
      if (body.text.includes('{{user_last_name}}')) {
        text = text.replace(
          '{{user_last_name}}', lname)
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
          '{{user_full_name}}', fname + ' ' + lname)
      }
      if (body.text.includes('{{user_first_name}}')) {
        text = text.replace(
          '{{user_first_name}}', fname)
      }
      if (body.text.includes('{{user_last_name}}')) {
        text = text.replace(
          '{{user_last_name}}', lname)
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
          }
        })
      }
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
        console.log('finished')
        let fileReaderStream = fs.createReadStream(fileToStore)
        payload = {
          'messaging_type': messageType,
          'recipient': JSON.stringify({
            'id': subscriberId
          }),
          'message': JSON.stringify({
            'attachment': {
              'type': body.componentType,
              'payload': {}
            }
          }),
          'filedata': fileReaderStream
        }
        console.log('in filedata', payload)
        resolve({payload})
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
          }
        })
      }
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
          }
        })
      }
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
          }
        })
      }
    } else if (body.componentType === 'list') {
      payload = {
        'messaging_type': messageType,
        'recipient': JSON.stringify({
          'id': subscriberId
        }),
        'message': JSON.stringify({
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'list',
              'top_element_style': body.topElementStyle,
              'elements': body.listItems,
              'buttons': body.buttons
            }
          }
        })
      }
    }
    resolve({payload})
  })
}
exports.prepareSendAPIPayload = prepareSendAPIPayload
