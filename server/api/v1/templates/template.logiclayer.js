
exports.getCriteriasPolls = function (req) {
  if (req.body.first_page === 'first') {
    let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  }
  else if (req.body.first_page === 'next') {
    let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  }
  else if (req.body.first_page === 'previous') {
    let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    return findCriteria
  }
}