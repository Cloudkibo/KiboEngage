var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
const logger = require('../../components/logger')
const TAG = 'api/auth/local/passport'

exports.setup = function (User, config) {
  passport.use('email-local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password' // this is the virtual field on the model
  },
  function (email, password, done) {
    User.findOne({
      email: email.toLowerCase()
    }, function (err, user) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.setup`, {User, config}, {}, 'error')
        return done(err)
      }

      if (!user) {
        return done(null, false, { message: 'This email is not registered.' })
      }
      if (!user.authenticate(password)) {
        return done(null, false, { message: 'This password is not correct.' })
      }
      return done(null, user)
    })
  }
  ))
}
