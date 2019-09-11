let _ = require('lodash')

exports.getCriterias = function (req) {
  let findCriteria = {}
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - req.body.filter_criteria.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  if (req.body.filter_criteria.search_value === '' && req.body.filter_criteria.type_value === '' && req.body.filter_criteria.MessageType === '') {
    findCriteria = {
      companyId: req.user.companyId,
      'datetime': req.body.filter_criteria.days !== '0' ? {
        $gte: startDate
      } : { $exists: true }
    }
  } else {
    if (req.body.filter_criteria.type_value === 'miscellaneous') {
      findCriteria = {
        companyId: req.user.companyId,
        'payload.1': { $exists: true },
        MessageType: (req.body.filter_criteria.MessageType === '' || req.body.filter_criteria.MessageType === 'all') ? { $in: [null, 'Non Promotional', 'Promotional'] } : req.body.filter_criteria.MessageType === 'Non Promotional' ? { $in: [null, 'Non Promotional'] } : { $in: ['Promotional'] },            
        title: req.body.filter_criteria.search_value !== '' ? { $regex: req.body.filter_criteria.search_value } : { $exists: true },
        'datetime': req.body.filter_criteria.days !== '0' ? {
          $gte: startDate
        } : { $exists: true }
      }
    } else {
      console.log('req.body.filter_criteria.MessageType', req.body.filter_criteria.MessageType)
      findCriteria = {
        companyId: req.user.companyId,
        $and: [{'payload.0.componentType': (req.body.filter_criteria.type_value !== '' && req.body.filter_criteria.type_value !== 'all') ? req.body.filter_criteria.type_value : { $exists: true }}, {'payload.1': (req.body.filter_criteria.type_value !== '' && req.body.filter_criteria.type_value !== 'all') ? { $exists: false } : { $exists: true }}],
        MessageType: (req.body.filter_criteria.MessageType === '' || req.body.filter_criteria.MessageType === 'all') ? { $in: [null, 'Non Promotional', 'Promotional'] } : req.body.filter_criteria.MessageType === 'Non Promotional' ? { $in: [null, 'Non Promotional'] } : { $in: ['Promotional'] },            
        title: req.body.filter_criteria.search_value !== '' ? { $regex: req.body.filter_criteria.search_value } : { $exists: true },
        'datetime': req.body.filter_criteria.days !== '0' ? {
          $gte: startDate
        } : { $exists: true }
      }
    }
  }
  console.log('After findCriteria', findCriteria)
  if (req.body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
  } else if (req.body.first_page === 'next') {
    recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: req.body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
  } else if (req.body.first_page === 'previous') {
    recordsToSkip = Math.abs(req.body.requested_page * req.body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: req.body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: req.body.number_of_records }
    ]
  }
  countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {
    finalCriteria,
    countCriteria
  }
}
exports.ListFindCriteria = function (body, user) {
  let ListFindCriteria = {
    companyId: user.companyId
  }
  ListFindCriteria = _.merge(ListFindCriteria,
    {
      _id: {
        $in: body.segmentationList
      }
    })
  return ListFindCriteria
}

exports.subsFindCriteriaForList = function (lists, page) {
  let subsFindCriteria = {pageId: page._id, companyId: page.companyId}
  let listData = []
  if (lists.length > 1) {
    for (let i = 0; i < lists.length; i++) {
      for (let j = 0; j < lists[i].content.length; j++) {
        if (exists(listData, lists[i].content[j]) === false) {
          listData.push(lists[i].content[j])
        }
      }
    }
    subsFindCriteria = _.merge(subsFindCriteria, {
      _id: {
        $in: listData
      }
    })
  } else {
    subsFindCriteria = _.merge(subsFindCriteria, {
      _id: {
        $in: lists[0].content
      }
    })
  }
  return subsFindCriteria
}
exports.subsFindCriteria = function (body, page) {
  let subscriberFindCriteria = {pageId: page._id, companyId: page.companyId, isSubscribed: true}
  if (body.isSegmented) {
    if (body.segmentationGender.length > 0) {
      subscriberFindCriteria = _.merge(subscriberFindCriteria,
        {
          gender: {
            $in: body.segmentationGender
          }
        })
    }
    if (body.segmentationLocale.length > 0) {
      subscriberFindCriteria = _.merge(subscriberFindCriteria, {
        locale: {
          $in: body.segmentationLocale
        }
      })
    }
  }
  return subscriberFindCriteria
}
function exists (list, content) {
  for (let i = 0; i < list.length; i++) {
    if (JSON.stringify(list[i]) === JSON.stringify(content)) {
      return true
    }
  }
  return false
}
