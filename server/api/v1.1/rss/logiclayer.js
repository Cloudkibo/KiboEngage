const og = require('open-graph')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/rss/logiclayer.js'

exports.prepareMessageData = (feed) => {
  return new Promise((resolve, reject) => {
    getMetaData(feed)
      .then(gallery => {
        console.log('total elements', gallery.length)
        let messageData = {
          recipient: {
            id: '2899360233423223'
          },
          message: JSON.stringify({
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: gallery
              }
            }
          })
        }
        resolve(messageData)
      })
  })
}

function getMetaData (feed) {
  return new Promise((resolve, reject) => {
    console.log('feed length', feed.length)
    let gallery = []
    for (let i = 0; i < feed.length; i++) {
      og(feed[i].link, (err, meta) => {
        if (err) {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: getMetaData`, {feed}, {}, 'error')
          console.log('error in fetching metdata')
        }
        console.log('meta', JSON.stringify(meta))
        gallery.push({
          title: meta.title,
          subtitle: 'kibopush.com',
          image_url: meta.image.url.constructor === Array ? meta.image.url[0] : meta.image.url,
          buttons: [
            {
              type: 'web_url',
              title: 'Read More...',
              url: feed[i].link
            }
          ]
        })
        if (gallery.length === feed.length) {
          resolve(gallery)
        }
      })
    }
  })
}
