const utility = require('../server/api/v1.1/utility')
const logger = require('../server/components/logger')
const needle = require('needle')
const TAG = 'scripts/update_profile_pic_script.js'

function updateSubscribersPic (pageTokens, companyId) {
  utility.callApi(`subscribers/query`, 'post', {companyId: companyId})
    .then(users => {
      for (let i = 0; i < users.length; i++) {
        let accessToken = pageTokens.filter((item) => item.id === users[i].pageId.pageId)[0].token
        needle.get(
          `https://graph.facebook.com/v2.10/${users[i].senderId}?access_token=${accessToken}`,
          (err, resp) => {
            if (err) {
              logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
            }
            console.log('resp.body', resp.body)
            // logger.serverLog(TAG, `resp ${JSON.stringify(resp.body)}`)
            utility.callApi(`subscribers/update`, 'put', {query: {_id: users[i]._id}, newPayload: {firstName: resp.body.first_name, lastName: resp.body.last_name, profilePic: resp.body.profile_pic, locale: resp.body.locale, timezone: resp.body.timezone, gender: resp.body.gender}, options: {}})
              .then(updated => {
                logger.serverLog(TAG, `Succesfully updated subscriber ${users[i]._id}`)
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to update subscriber ${JSON.stringify(err)}`)
              })
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscribers ${err} companyId: ${companyId}`)
    })
}

function getPageAccessTokenAndUpdate (companyId) {
  let pageTokens = []
  utility.callApi(`pages/query`, 'post', {companyId: companyId})
    .then(pages => {
      for (let i = 0; i < pages.length; i++) {
        needle.get(
          `https://graph.facebook.com/v2.10/${pages[i].pageId}?fields=access_token&access_token=${pages[i].accessToken}`,
          (err, resp) => {
            if (err) {
              logger.serverLog(TAG, `Page access token from graph api error ${err} pageId: ${pages[i].pageId} accessToken: ${pages[i].accessToken}`)
            } else {
              logger.serverLog(TAG, `Retrieved page access token for ${JSON.stringify(pages[i])}`)
              pageTokens.push({id: pages[i].pageId, token: resp.body.access_token})
              if (pageTokens.length === pages.length) {
                updateSubscribersPic(pageTokens, companyId)
              }
            }
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch pages ${JSON.stringify(err)}`)
    })
}

// exports.genericUpdatePayload = {
//   '$schema': 'http://json-schema.org/draft-04/schema#',
//   'type': 'object',
//   'properties': {
//     'query': {
//       'type': 'object'
//     },
//     'newPayload': {
//       'type': 'object'
//     },
//     'options': {
//       'type': 'object'
//     }
//   },
//   'required': [
//     'query',
//     'newPayload',
//     'options'
//   ]
// }

utility.callApi(`user/query`, 'post', {})
  .then(users => {
    users.forEach((user, index) => {
      if (user.facebookInfo) {
        needle.get(
          `https://graph.facebook.com/v2.10/${user.facebookInfo.fbId}?fields=picture&access_token=${user.facebookInfo.fbToken}`,
          (err, resp) => {
            if (err) {
              logger.serverLog(TAG, `ERROR in cron script update_profile_pic ${JSON.stringify(err)}`)
            }
            if (resp.body.picture) {
              utility.callApi(`user/update`, 'post', {query: {_id: user._id}, newPayload: {'facebookInfo.profilePic': resp.body.picture.data.url}, options: {}})
                .then(updated => {
                  logger.serverLog(TAG, `Succesfully updated user ${user._id}`)
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to update user ${JSON.stringify(err)}`)
                })
            }
          })
      }
    })
  })
  .catch(err => {
    logger.serverLog(TAG, `Failed to fetch users ${JSON.stringify(err)}`)
  })

utility.callApi(`companyUser/queryAll`, 'post', {})
  .then(profiles => {
    profiles.forEach(profile => {
      getPageAccessTokenAndUpdate(profile.companyId)
    })
  })
  .catch(err => {
    logger.serverLog(TAG, `Failed to fetch company users ${err}`)
  })
