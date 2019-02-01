let _ = require('lodash')
exports.getCriterias = function (body, companyUser) {
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let findCriteria = {
    companyId: companyUser.companyId,
    'datetime': body.days !== '0' ? {
      $gte: startDate
    } : {$exists: true}
  }
  let finalCriteria = {}
  let recordsToSkip = 0
  if (body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $sort: {datetime: -1} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $lt: body.last_id } }] } },
      { $sort: {datetime: -1} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs((body.requested_page * body.number_of_records) - body.number_of_records)
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $gt: body.last_id } }] } },
      { $sort: {datetime: -1} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {countCriteria: countCriteria, fetchCriteria: finalCriteria}
}

exports.createSurveyPayload = function (req, companyUser) {
  let surveyPayload = {
    title: req.body.survey.title,
    description: req.body.survey.description,
    userId: req.user._id,
    companyId: companyUser.companyId,
    isresponded: 0
  }
  if (req.body.isSegmented) {
    surveyPayload.isSegmented = true
    surveyPayload.segmentationPageIds = (req.body.segmentationPageIds)
      ? req.body.segmentationPageIds
      : null
    surveyPayload.segmentationGender = (req.body.segmentationGender)
      ? req.body.segmentationGender
      : null
    surveyPayload.segmentationLocale = (req.body.segmentationLocale)
      ? req.body.segmentationLocale
      : null
    surveyPayload.segmentationTags = (req.body.segmentationTags)
      ? req.body.segmentationTags
      : null
    surveyPayload.segmentationSurvey = (req.body.segmentationSurvey)
      ? req.body.segmentationSurvey
      : null
  }
  if (req.body.isList) {
    surveyPayload.isList = true
    surveyPayload.segmentationList = (req.body.segmentationList)
      ? req.body.segmentationList
      : null
  }
  return surveyPayload
}

exports.pageFindCriteria = function (req, companyUser) {
  let pagesFindCriteria = {companyId: companyUser.companyId, connected: true}
  if (req.body.isSegmented) {
    if (req.body.segmentationPageIds.length > 0) {
      pagesFindCriteria = _.merge(pagesFindCriteria, {
        pageId: {
          $in: req.body.segmentationPageIds
        }
      })
    }
  }
  return pagesFindCriteria
}
