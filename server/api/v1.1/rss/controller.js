// let Parser = require('rss-parser')
// let parser = new Parser()
const feedparser = require('feedparser-promised')
const LogicLayer = require('./logiclayer')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
let { sendOpAlert } = require('./../../global/operationalAlert')

exports.fetchRssFeed = function (req, res) {
  let url = req.body.url
  feedparser.parse(url)
    .then(feed => {
      LogicLayer.prepareMessageData(feed)
        .then(data => {
          facebookApiCaller(
            'v3.3',
            `me/messages?access_token=EAAB4wFi3BuIBAFjYgHCwQZBiMeKGcxKugNfwljmZBiT3U0sueYEoPy7jQfUCG8gZB77qkE8kkZCf2FWFpxDW0ZCnmOuZB7P7JCvJ81LcFToxPL5anPZBXyY2FdzD5duv38VYYO4ZAkQRQIrO3mugsS1E2MZCNdJBofvCgIZC08ZApxBu4YxG2AffT5q`,
            'post',
            data
          )
            .then(response => {
              if (response.body.error) {
                sendOpAlert(response.body.error, 'rss controller in kiboengage', '', req.user._id, req.user.company_id)
                return res.status(500).json({
                  status: 'failed',
                  payload: JSON.stringify(response.body.error)
                })
              } else {
                return res.status(200).json({
                  status: 'sucess',
                  payload: 'Successfully sent!'
                })
              }
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                payload: err
              })
            })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        payload: err
      })
    })
}
