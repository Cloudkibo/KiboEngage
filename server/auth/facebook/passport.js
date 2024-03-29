/**
 * Created by sojharo on 24/07/2017.
 */

const passport = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy
const PassportFacebookExtension = require('passport-facebook-extension')
const needle = require('needle')
const _ = require('lodash')

const logger = require('../../components/logger')
const TAG = 'api/auth/facebook/passport'

const options = {
  headers: {
    'X-Custom-Header': 'CloudKibo Web Application'
  },
  json: true
}

exports.setup = function (User, config) {
  passport.use(new FacebookStrategy(
    {
      clientID: config.facebook.clientID,
      clientSecret: config.facebook.clientSecret,
      callbackURL: config.facebook.callbackURL,
      profileFields: ['id', 'displayName', 'photos', 'email']
    },
    (accessToken, refreshToken, profile, done) => {
      let FBExtension = new PassportFacebookExtension(config.facebook.clientID,
        config.facebook.clientSecret)

      // todo do this for permissions error
      FBExtension.permissionsGiven(profile.id, accessToken)
        .then(permissions => {
          profile.permissions = permissions
        })
        .fail(e => {
          const message = e || 'Permissions check error'
          logger.serverLog(message, `${TAG}: exports.setup`, {User, config}, {}, 'error')
        })

      FBExtension.extendShortToken(accessToken).then((error) => {
        const message = error || 'Extending token error'
        logger.serverLog(message, `${TAG}: exports.setup`, {User, config}, {}, 'error')
        return done(error)
      }).fail((response) => {
        accessToken = response.access_token
        needle.get(`${'https://graph.facebook.com/me?fields=' +
        'id,name,locale,email,timezone,gender,picture' +
        '&access_token='}${accessToken}`, options, (err, resp) => {
          if (err !== null) {
            const message = err || 'error from graph api to get user data'
            logger.serverLog(message, `${TAG}: exports.setup`, {User, config}, {}, 'error')
          }
          if (err) {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.setup`, {User, config}, {}, 'error')
            return done(err)
          }

          let payload = {
            name: resp.body.name,
            locale: resp.body.locale,
            gender: resp.body.gender,
            provider: 'facebook',
            timezone: resp.body.timezone,
            profilePic: resp.body.picture.data.url,
            fbToken: accessToken,
            fbId: resp.body.id
          }

          if (resp.body.email) {
            payload = _.merge(payload, {email: resp.body.email})
          }

          done(null, payload)
        })
      })
    }
  ))
}
