
exports.getCriterias = function (req) {
  if (req.body.first_page === 'first') {
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: req.body.filter_criteria.search_value} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  } else if (req.body.first_page === 'next') {
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: req.body.filter_criteria.search_value} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  } else if (req.body.first_page === 'previous') {
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: req.body.filter_criteria.search_value} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  }
}
exports.getCriteriasBroadcast = function (object) {
  if (object.req.body.first_page === 'first') {
    let findCriteria = {
      '$or': [{companyId: object.companyUser.companyId}, {createdBySuperUser: true}],
      title: object.req.body.filter_criteria.search_value !== '' ? {$regex: object.req.body.filter_criteria.search_value} : {$exists: true},
      category: object.req.body.filter_criteria.category_value !== '' ? object.req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  } else if (object.req.body.first_page === 'next') {
    let findCriteria = {
      '$or': [{companyId: object.companyUser.companyId}, {createdBySuperUser: true}],
      title: object.req.body.filter_criteria.search_value !== '' ? {$regex: object.req.body.filter_criteria.search_value} : {$exists: true},
      category: object.req.body.filter_criteria.category_value !== '' ? object.req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  } else if (object.req.body.first_page === 'previous') {
    let findCriteria = {
      '$or': [{companyId: object.companyUser.companyId}, {createdBySuperUser: true}],
      title: object.req.body.filter_criteria.search_value !== '' ? {$regex: object.req.body.filter_criteria.search_value} : {$exists: true},
      category: object.req.body.filter_criteria.category_value !== '' ? object.req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  }
}
exports.createDataPolls = function (req) {
  let pollPayload = {
    title: req.body.title,
    statement: req.body.statement,
    options: req.body.options,
    category: req.body.category
  }
  return pollPayload
}
exports.createDataSurvey = function (req) {
  let surveyPayload = {
    title: req.body.survey.title,
    description: req.body.survey.description,
    category: req.body.survey.category
  }
  return surveyPayload
}

exports.createDataCategory = function (object) {
  let categoryPayload = {
    name: object.req.body.name,
    userId: object.req.user._id,
    companyId: object.companyUser.companyId
  }
  return categoryPayload
}

exports.createDataBots = function (req) {
  let botTemplatePayload = {
    title: req.body.title,
    category: req.body.category,
    payload: req.body.payload,
    userId: req.user._id,
    companyId: req.companyUser.companyId
  }
  return botTemplatePayload
}

exports.createDataBroadcast = function (req, companyUser) {
  let broadcastPayload = {
    title: req.body.title,
    category: req.body.category,
    payload: req.body.payload,
    userId: req.user._id,
    companyId: companyUser.companyId._id
  }
  return broadcastPayload
}
exports.getPoliticsBotTemplate = function () {
  let payload = [
    {
      questions: ['What is your policy on immigration?', 'How do you deal with illegal immigrants?', 'What is your policy for undocumented immigrants', 'How will you improve immigration system?'],
      answer: 'We called for fixing the "broken immigration system," including a path to citizenship for 11 million undocumented immigrants.',
      intent_name: 'q1-immigration'
    },
    {
      questions: ['What is your policy on same-sex marriage?', 'Do you agree with Supreme Court decision that legalized same-sex marriage?', 'Where do you stand on matter of same-sex marriage?'],
      answer: 'We applauded the U.S. Supreme Court decision that legalized same-sex marriage.',
      intent_name: 'q2-same-sex-marriage'
    },
    {
      questions: ['Are you in favor of abortion?', 'What is your policy on abortion?', 'Do you think every woman has right to abortion?'],
      answer: 'We believe unequivocally, like the majority of Americans, that every woman should have access to quality reproductive health care services, including safe and legal abortion.',
      intent_name: 'q2-abortion'
    },
    {
      questions: ['What is your policy on climate change?', 'Do you think climate change is a problem?', 'Ho do you tackle climate change?'],
      answer: 'Climate change poses a real and urgent threat to our economy, our national security, and our children\'s health and futures.',
      intent_name: 'q2-climate-change'
    },
    {
      questions: ['What is your policy on medicare?', 'How do you think can improve medicare?', 'What are facilities you would provide in the area of medicare?'],
      answer: 'We would not only would "fight any attempts by Republicans in Congress to privatize, voucherize, or \'phase out\' Medicare," but would allow Americans older than 55 to enroll.',
      intent_name: 'q2-medicare'
    },
    {
      questions: ['What is your stand on wall street issues?', 'What is your promise regarding wall street?', 'How can you improve the enforcement of regulations in wall street?'],
      answer: 'Our party promised to "vigorously implement, enforce, and build on" banking regulations enacted to curb risky practices by financial institutions and "will stop dead in its tracks every Republican effort to weaken it."',
      intent_name: 'q2-wall-street'
    },
    {
      questions: ['What are your views on Iran?', 'What is your policy regarding Iran?', 'What type of relations do you want with Iran?'],
      answer: 'President Barack Obama\'s agreement to relax economic sanctions on Iran in exchange for curbs on its nuclear program "verifiably cuts off all of Iran\'s pathways to a bomb without resorting to war."',
      intent_name: 'q2-iran'
    },
    {
      questions: ['What are your views of Israel??', 'What is your policy on Israel as Jewish state?', 'What are your views on conflict between Israel and Palestine'],
      answer: 'The platform backed a "secure and democratic Jewish state" of Israel and a chance for Palestinians to "govern themselves in their own viable state, in peace and dignity."',
      intent_name: 'q2-israel'
    },
    {
      questions: ['How do you think money should be used in politics?', 'What is your policy to fund your campaigns?', 'How do you raise money for your campaign?'],
      answer: 'We need to end secret, unaccountable money in politics by requiring, through executive order or legislation, significantly more disclosure and transparency -- by outside groups, federal contractors, and public corporations to their shareholders',
      intent_name: 'q2-money-in-politics'
    },
    {
      questions: ['What is your policy on voting rights?', 'How do you think you would ensure the right to vote for all the communities?', 'How you can implement voting rights in US?'],
      answer: 'We would fight laws requiring certain forms of voter identification "to preserve the fundamental right to vote."',
      intent_name: 'q2-voting-rights'
    }
  ]
  return payload
}
