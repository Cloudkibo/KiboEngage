const logger = require('../../../components/logger')
const TAG = 'api/autoposting/migrations.controller.js'
const TwitterUtility = require('../../../config/integrations/twitter')

const prepareAutopostingPayload = (req, companyUser) => {
  let autoPostingPayload = {
    userId: req.user._id,
    companyId: companyUser.companyId,
    subscriptionUrl: req.body.subscriptionUrl,
    subscriptionType: req.body.subscriptionType,
    accountTitle: req.body.accountTitle
  }
  if (req.body.isSegmented) {
    autoPostingPayload.isSegmented = true
    autoPostingPayload.segmentationPageIds = (req.body.segmentationPageIds)
      ? req.body.pageIds
      : null
    autoPostingPayload.segmentationGender = (req.body.segmentationGender)
      ? req.body.segmentationGender
      : null
    autoPostingPayload.segmentationLocale = (req.body.segmentationLocale)
      ? req.body.segmentationLocale
      : null
    autoPostingPayload.segmentationTags = (req.body.segmentationTags)
      ? req.body.segmentationTags
      : null
  }
  return autoPostingPayload
}

const checkPlanLimit = (subscriptionType, planUsage, companyUsage) => {
  if (subscriptionType === 'twitter') {
    if (planUsage.twitter_autoposting !== -1 && companyUsage.twitter_autoposting >= planUsage.twitter_autoposting) {
      return false
    }
  } else if (subscriptionType === 'facebook') {
    if (planUsage.facebook_autoposting !== -1 && companyUsage.facebook_autoposting >= planUsage.facebook_autoposting) {
      return false
    }
  } else if (subscriptionType === 'wordpress') {
    if (planUsage.wordpress_autoposting !== -1 && companyUsage.wordpress_autoposting >= planUsage.wordpress_autoposting) {
      return false
    }
  }
}

const handleTwitterAutoposts = (subscriptionUrl, autoPostingPayload) => {
  let url = subscriptionUrl
  let urlAfterDot = url.substring(url.indexOf('.') + 1)
  let screenName = urlAfterDot.substring(urlAfterDot.indexOf('/') + 1)
  if (screenName.indexOf('/') > -1) screenName = screenName.substring(0, screenName.length - 1)
  TwitterUtility.findUser(screenName, (err, data) => {
    if (err) {
      logger.serverLog(TAG, `Twitter URL parse Error ${err}`)
    }
    autoPostingPayload.accountUniqueName = data.screen_name
    let payload = {
      id: data.id,
      name: data.name,
      screen_name: data.screen_name,
      profile_image_url: data.profile_image_url_https
    }
    autoPostingPayload.payload = payload
    return autoPostingPayload
  })
}

const getFacebookScreenName = (subscriptionUrl) => {
  let url = subscriptionUrl
  let urlAfterDot = url.substring(url.indexOf('.') + 1)
  let screenName = urlAfterDot.substring(urlAfterDot.indexOf('/') + 1)
  while (screenName.indexOf('-') > -1) screenName = screenName.substring(screenName.indexOf('-') + 1)
  if (screenName.indexOf('/') > -1) screenName = screenName.substring(0, screenName.length - 1)
  return screenName
}

const getChannelName = (subscriptionUrl) => {
  let url = subscriptionUrl
  let urlAfterDot = url.substring(url.indexOf('.') + 1)
  let firstParse = urlAfterDot.substring(urlAfterDot.indexOf('/') + 1)
  let channelName = firstParse.substring(firstParse.indexOf('/') + 1)
  return channelName
}

const prepareEditPayload = (req) => {
  var autoposting = {}
  autoposting.accountTitle = req.body.accountTitle
  autoposting.isSegmented = req.body.isSegmented
  autoposting.segmentationPageIds = req.body.segmentationPageIds
  autoposting.segmentationGender = req.body.segmentationGender
  autoposting.segmentationLocale = req.body.segmentationLocale
  autoposting.segmentationTags = req.body.segmentationTags
  autoposting.isActive = req.body.isActive
  return autoposting
}
exports.prepareAutopostingPayload = prepareAutopostingPayload
exports.checkPlanLimit = checkPlanLimit
exports.handleTwitterAutoposts = handleTwitterAutoposts
exports.getFacebookScreenName = getFacebookScreenName
exports.getChannelName = getChannelName
exports.prepareEditPayload = prepareEditPayload
