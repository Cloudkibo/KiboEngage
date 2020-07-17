var path = require('path')

exports.prepareChat = (payload, companyUser, contact) => {
  let MessageObject = {
    senderNumber: companyUser.companyId.flockSendWhatsApp.number,
    recipientNumber: contact.number,
    contactId: contact._id,
    companyId: companyUser.companyId._id,
    payload: payload
  }
  return MessageObject
}
exports.getCriterias = function (body, companyUser) {
  if (!body) {
    throw Error('body shouldnot be empty')
  }
  if (!(body.number_of_records)) {
    throw Error('body must contain number_of_records and should be valid payload')
  }
  if (!(companyUser && companyUser.companyId)) {
    throw Error('companyUser must contain companyId and should be valid payload')
  }
  let findCriteria = {}
  let startDate = new Date()
  startDate.setDate(startDate.getDate() - body.filter_criteria.days)
  startDate.setHours(0)
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  if (body.filter_criteria.search_value === '' && body.filter_criteria.type_value === '') {
    findCriteria = {
      companyId: companyUser.companyId,
      'datetime': body.filter_criteria.days !== '0' ? {
        $gte: startDate
      } : { $exists: true }
    }
  } else {
    if (body.filter_criteria.type_value === 'miscellaneous') {
      findCriteria = {
        companyId: companyUser.companyId,
        'payload.1': { $exists: true },
        title: body.filter_criteria.search_value !== '' ? { $regex: body.filter_criteria.search_value } : { $exists: true },
        'datetime': body.filter_criteria.days !== '0' ? {
          $gte: startDate
        } : { $exists: true }
      }
    } else {
      if (body.filter_criteria.type_value !== '' && body.filter_criteria.type_value !== 'all') {
        findCriteria = {
          companyId: companyUser.companyId,
          $and: [{'payload.0.componentType': (body.filter_criteria.type_value !== '' && body.filter_criteria.type_value !== 'all') ? body.filter_criteria.type_value : { $exists: true }}, {'payload.1': { $exists: false }}],
          title: body.filter_criteria.search_value !== '' ? { $regex: body.filter_criteria.search_value } : { $exists: true },
          'datetime': body.filter_criteria.days !== '0' ? {
            $gte: startDate
          } : { $exists: true }
        }
      } else {
        findCriteria = {
          companyId: companyUser.companyId,
          'payload.0.componentType': (body.filter_criteria.type_value !== '' && body.filter_criteria.type_value !== 'all') ? body.filter_criteria.type_value : { $exists: true },
          title: body.filter_criteria.search_value !== '' ? { $regex: body.filter_criteria.search_value } : { $exists: true },
          'datetime': body.filter_criteria.days !== '0' ? {
            $gte: startDate
          } : { $exists: true }
        }
      }
    }
  }
  countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]

  if (body.first_page === 'first') {
    if (body.current_page) {
      recordsToSkip = Math.abs(body.current_page * body.number_of_records)
    }
    finalCriteria = [
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}
exports.prepareBroadCastPayload = function (req, companyId) {
  let broadcastPayload = {
    platform: req.body.platform,
    payload: req.body.payload,
    userId: req.user._id,
    companyId,
    title: req.body.title
  }
  if (req.body.segmentation) {
    broadcastPayload.segmentation = req.body.segmentation
  }
  return broadcastPayload
}
exports.checkFilterValues = function (values, data) {
  if (!data) {
    throw Error('contact data must contain and should be valid payload')
  }
  if (!(data && data.name)) {
    throw Error('contact data must contain name and should be valid payload')
  }
  if (!(data && data.number)) {
    throw Error('contact data must contain number and should be valid payload')
  }
  var matchCriteria = true
  if (values && values.length > 0) {
    for (var i = 0; i < values.length; i++) {
      var filter = values[i]
      if (filter.criteria === 'is') {
        if (data[`${filter.condition}`] === filter.text) {
          matchCriteria = true
        } else {
          matchCriteria = false
          break
        }
      } else if (filter.criteria === 'contains') {
        if (data[`${filter.condition}`].toLowerCase().includes(filter.text.toLowerCase())) {
          matchCriteria = true
        } else {
          matchCriteria = false
          break
        }
      } else if (filter.criteria === 'begins') {
        var subText = data[`${filter.condition}`].substring(0, filter.text.length)
        if (subText.toLowerCase() === filter.text.toLowerCase()) {
          matchCriteria = true
        } else {
          matchCriteria = false
          break
        }
      }
    }
  }
  return matchCriteria
}

exports.createPayloadgetSubscribersCount = function (companyId, number) {
  if (!(companyId)) {
    throw Error('must contain companyId and should be valid payload')
  }
  if (!(number)) {
    throw Error('must contain contact number and should be valid payload')
  }
  let finalFindCriteria = {
    companyId: companyId,
    senderNumber: number,
    format: 'twilio'
  }
  let finalCriteria = {
    purpose: 'aggregate',
    match: finalFindCriteria,
    sort: {datetime: -1},
    limit: 1
  }
  return finalCriteria
}

exports.prepareFlockSendPayload = (payload, companyUser, contactNumbers) => {
  let route = ''
  let MessageObject = {
    token: companyUser.companyId.flockSendWhatsApp.accessToken,
    number_details: JSON.stringify(contactNumbers)
  }
  if (payload.componentType === 'text') {
    if (payload.templateName) {
      MessageObject.template_name = payload.templateName
      MessageObject.template_argument = payload.templateArguments
      MessageObject.language = 'en'
      route = 'hsm'
    } else {
      MessageObject.message = payload.text
      route = 'text'
    }
  } else if (payload.componentType === 'media') {
    if (payload.mediaType === 'image') {
      MessageObject.image = payload.fileurl.url || payload.fileurl
      route = 'image'
    } else if (payload.mediaType === 'video') {
      MessageObject.video = payload.fileurl.url || payload.fileurl
      route = 'video'
    }
  } else if (payload.componentType === 'file') {
    let ext = path.extname(payload.fileurl.name)
    let fileName = ''
    if (ext !== '') {
      fileName = payload.fileurl.name.replace(ext, '')
    }
    MessageObject.title = fileName
    MessageObject.file = payload.fileurl.url || payload.fileurl
    route = 'file'
  }
  return {
    MessageObject,
    route
  }
}
