'use strict'
// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/passwordresettoken/passwordresettoken.controller.js'
let Passwordresettoken = require('./passwordresettoken.model')
let User = require('./../user/Users.model')
const config = require('./../../../config/environment/index')
let crypto = require('crypto')
let path = require('path')
const utility = require('../utility')
exports.forgot = function (req, res) {
  User.findOne({email: req.body.email},
    function (err, gotUser) {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!gotUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'Sorry! No such account or company exists in our database.'
        })
      }

      var today = new Date()
      var uid = crypto.randomBytes(5).toString('hex')
      let tokenString = 'f' + uid + '' + today.getFullYear() + '' +
        (today.getMonth() + 1) + '' + today.getDate() + '' +
        today.getHours() + '' + today.getMinutes() + '' +
        today.getSeconds()

      let newToken = new Passwordresettoken({
        userId: gotUser._id,
        token: tokenString
      })

      newToken.save(function (err) {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }
        let sendgrid = require('sendgrid')(config.sendgrid.username,
          config.sendgrid.password)

        var email = new sendgrid.Email({
          to: gotUser.email,
          from: 'support@cloudkibo.com',
          subject: 'KiboPush: Password Reset',
          text: 'Password Reset'
        })

        email.setHtml(
          '<body style="min-width: 80%;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;margin: 0;padding: 0;direction: ltr;background: #f6f8f1;width: 80% !important;"><table class="body", style="width:100%"> ' +
          '<tr> <td class="center" align="center" valign="top"> <!-- BEGIN: Header --> <table class="page-header" align="center" style="width: 100%;background: #1f1f1f;"> <tr> <td class="center" align="center"> ' +
          '<!-- BEGIN: Header Container --> <table class="container" align="center"> <tr> <td> <table class="row "> <tr>  </tr> </table> <!-- END: Logo --> </td> <td class="wrapper vertical-middle last" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;"> <!-- BEGIN: Social Icons --> <table class="six columns"> ' +
          '<tr> <td> <table class="wrapper social-icons" align="right" style="float: right;"> <tr> <td class="vertical-middle" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;padding: 0 2px !important;width: auto !important;"> ' +
          '<p style="color: #ffffff"> KiboPush - Reset Password </p> </td></tr> </table> </td> </tr> </table> ' +
          '<!-- END: Social Icons --> </td> </tr> </table> </td> </tr> </table> ' +
          '<!-- END: Header Container --> </td> </tr> </table> <!-- END: Header --> <!-- BEGIN: Content --> <table class="container content" align="center"> <tr> <td> <table class="row note"> ' +
          '<tr> <td class="wrapper last"> <p> Hello, <br> This is to inform you that you have requested to change your password for your KiboPush account </p> <p> </p>  <!-- BEGIN: Note Panel --> <table class="twelve columns" style="margin-bottom: 10px"> ' +
          '<tr> <td class="panel" style="background: #ECF8FF;border: 0;padding: 10px !important;"> </td> <td class="expander"> </td> </tr> </table> <p> Use the following link to change your password <br><br> <a href="' +
          config.domain + '/api/reset_password/verify/' +
          tokenString +
          '"> ' + config.domain + '/api/reset_password/verify/' + tokenString +
          '</a> </p> <!-- END: Note Panel --> </td> </tr> </table><span class="devider" style="border-bottom: 1px solid #eee;margin: 15px -15px;display: block;"></span> <!-- END: Disscount Content --> </td> </tr> </table> </td> </tr> </table> <!-- END: Content --> <!-- BEGIN: Footer --> <table class="page-footer" align="center" style="width: 100%;background: #2f2f2f;"> <tr> <td class="center" align="center" style="vertical-align: middle;color: #fff;"> <table class="container" align="center"> <tr> <td style="vertical-align: middle;color: #fff;"> <!-- BEGIN: Unsubscribet --> <table class="row"> <tr> <td class="wrapper last" style="vertical-align: middle;color: #fff;"><span style="font-size:12px;"><i>This is a system generated email and reply is not required.</i></span> </td> </tr> </table> <!-- END: Unsubscribe --> ' +
          '<!-- END: Footer Panel List --> </td> </tr> </table> </td> </tr> </table> <!-- END: Footer --> </td> </tr></table></body>')

        sendgrid.send(email, function (err, json) {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error ${JSON.stringify(err)}`
            })
          }

          res.status(200).json({
            status: 'success',
            description: 'Password Reset Link has been sent to your email address. Check your spam or junk folder if you have not received our email.'
          })
        })
      })
    })
}

exports.reset = function (req, res) {
  let token = req.body.token

  Passwordresettoken.findOne({token: token}, function (err, doc) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    logger.serverLog(TAG,
    `Password Reset Token ${JSON.stringify(doc)}`)
    if (!doc) {
      res.sendFile(
        path.join(config.root, 'client/pages/change_password_failed.html'))
    }
    if (doc) {
      User.findOne({_id: doc.userId}, function (err, user) {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }
        if (!user) {
          return res.status(404).json({
            status: 'failed',
            description: 'User does not exist'
          })
        }

        if (user.authenticate(req.body.new_password)) {
          return res.status(404).json({
            status: 'failed',
            description: 'New password cannot be same as old password'
          })
        }
        user.password = String(req.body.new_password)
        user.save(function (err) {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error ${JSON.stringify(err)}`
            })
          }
          Passwordresettoken.remove({token: token}, function (err, doc) {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error ${JSON.stringify(err)}`
              })
            }
            res.status(200).json({
              status: 'success',
              description: 'Password successfully changed. Please login with your new password.'
            })
          })
        })
      })
    }
  })
}

exports.verify = function (req, res) {
  Passwordresettoken.findOne({token: req.params.id}, function (err, doc) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (!doc) {
      res.sendFile(
        path.join(config.root, 'client/pages/change_password_failed.html'))
    }
    return res.sendFile(
      path.join(config.root, 'client/pages/change_password.html'))
  })
}

exports.change = function (req, res) {

  utility.callApi('reset_password/change', 'post', {old_password: req.body.old_password, new_password:req.body.new_password}, req.headers.authorization)
  .then((result) => {
    console.log('result', result)
    logger.serverLog(TAG, 'result from invite endpoint accounts')
    logger.serverLog(TAG, result)
    res.status(200).json({status: 'success', description: result})
  })
  .catch((err) => {
    logger.serverLog(TAG, err)
    console.log('err.status', err.error.status)
    console.log('err.payload', err.error.payload)
    res.status(200).json({status: 'failed', description: err.error.description})
  })
 /* let userId = req.user._id
  let oldPass = String(req.body.old_password)
  let newPass = String(req.body.new_password)

  User.findById(userId, function (err, user) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (user.authenticate(oldPass)) {
      user.password = newPass
      user.save(function (err) {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }
        res.status(200).json(
          {status: 'success', description: 'Password changed successfully.'})
      })
    } else {
      res.status(403)
        .json({status: 'failed', description: 'Wrong current password.'})
    }
  })*/
}

exports.forgotWorkspaceName = function (req, res) {
  console.log('req.body--', JSON.stringify(req.body))
  User.findOne({email: req.body.email},
    function (err, user) {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!user) {
        return res.status(404).json({
          status: 'failed',
          description: 'Sorry! No such account or company exists in our database.'
        })
      }
      logger.serverLog(TAG, `User data ${JSON.stringify(user)}`)
      let sendgrid = require('sendgrid')(config.sendgrid.username,
          config.sendgrid.password)

      var email = new sendgrid.Email({
        to: user.email,
        from: 'support@cloudkibo.com',
        subject: 'KiboPush: Workspace Name',
        text: 'Workspace Name'
      })

      email.setHtml(
          '<body style="min-width: 80%;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;margin: 0;padding: 0;direction: ltr;background: #f6f8f1;width: 80% !important;"><table class="body", style="width:100%"> ' +
          '<tr> <td class="center" align="center" valign="top"> <!-- BEGIN: Header --> <table class="page-header" align="center" style="width: 100%;background: #1f1f1f;"> <tr> <td class="center" align="center"> ' +
          '<!-- BEGIN: Header Container --> <table class="container" align="center"> <tr> <td> <table class="row "> <tr>  </tr> </table> <!-- END: Logo --> </td> <td class="wrapper vertical-middle last" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;"> <!-- BEGIN: Social Icons --> <table class="six columns"> ' +
          '<tr> <td> <table class="wrapper social-icons" align="right" style="float: right;"> <tr> <td class="vertical-middle" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;padding: 0 2px !important;width: auto !important;"> ' +
          '<p style="color: #ffffff"> KiboPush - Workspace Name </p> </td></tr> </table> </td> </tr> </table> ' +
          '<!-- END: Social Icons --> </td> </tr> </table> </td> </tr> </table> ' +
          '<!-- END: Header Container --> </td> </tr> </table> <!-- END: Header --> <!-- BEGIN: Content --> <table class="container content" align="center"> <tr> <td> <table class="row note"> ' +
          '<tr> <td class="wrapper last"> <p> Hello, <br> This email has been sent to you to inform you about the workspace name for your kibopush account. If this was not requested by you, you can ignore it. </p> <p> </p>  <!-- BEGIN: Note Panel --> <table class="twelve columns" style="margin-bottom: 10px"> ' +
           '<tr> <p>The workspace name for your account is: <b>' + user.domain + '</b></p></tr>',
          '</a> </p> <!-- END: Note Panel --> </td> </tr> </table><span class="devider" style="border-bottom: 1px solid #eee;margin: 15px -15px;display: block;"></span> <!-- END: Disscount Content --> </td> </tr> </table> </td> </tr> </table> <!-- END: Content --> <!-- BEGIN: Footer --> <table class="page-footer" align="center" style="width: 100%;background: #2f2f2f;"> <tr> <td class="center" align="center" style="vertical-align: middle;color: #fff;"> <table class="container" align="center"> <tr> <td style="vertical-align: middle;color: #fff;"> <!-- BEGIN: Unsubscribet --> <table class="row"> <tr> <td class="wrapper last" style="vertical-align: middle;color: #fff;"><span style="font-size:12px;"><i>This is a system generated email and reply is not required.</i></span> </td> </tr> </table> <!-- END: Unsubscribe --> ' +
          '<!-- END: Footer Panel List --> </td> </tr> </table> </td> </tr> </table> <!-- END: Footer --> </td> </tr></table></body>')

      sendgrid.send(email, function (err, json) {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }

        res.status(200).json({
          status: 'success',
          description: 'Workspace Name has been sent to your email address. Check your spam or junk folder if you have not received our email.'
        })
      })
    })
}
