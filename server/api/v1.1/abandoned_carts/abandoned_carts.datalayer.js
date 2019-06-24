const { callApi } = require('../utility')

exports.createStoreInfo = (payload) => {
  return callApi(`abandoned_cart/storeinfo`, 'post', payload, '', 'kiboengage')
}

exports.createStoreAnalytics = (payload) => {
  return callApi(`abandoned_cart/storeanalytics`, 'post', payload, '', 'kiboengage')
}

exports.findOneStoreAnalytics = (storeId) => {
  let query = {
    purpose: 'findOne',
    match: {storeId}
  }
  return callApi(`abandoned_cart/storeanalytics/query`, 'post', query, '', 'kiboengage')
}

exports.findAllStoreInfo = (companyId) => {
  let query = {
    purpose: 'findAll',
    match: {companyId}
  }
  return callApi(`abandoned_cart/storeinfo/query`, 'post', query, '', 'kiboengage')
}

exports.findOneStoreInfo = (companyId) => {
  let query = {
    purpose: 'findOne',
    match: {companyId}
  }
  return callApi(`abandoned_cart/storeinfo/query`, 'post', query, '', 'kiboengage')
}

exports.findOneStoreInfoGeneric = (payload) => {
  let query = {
    purpose: 'findOne',
    match: payload
  }
  return callApi(`abandoned_cart/storeinfo/query`, 'post', query, '', 'kiboengage')
}

exports.createCartInfo = (payload) => {
  return callApi(`abandoned_cart/cartinfo`, 'post', payload, '', 'kiboengage')
}

exports.findOneCartInfo = (payload) => {
  let query = {
    purpose: 'findOne',
    match: payload
  }
  return callApi(`abandoned_cart/cartinfo/query`, 'post', query, '', 'kiboengage')
}

exports.createCheckOutInfo = (payload) => {
  return callApi(`abandoned_cart/checkoutinfo`, 'post', payload, '', 'kiboengage')
}

exports.findOneCheckOutInfo = (payload) => {
  let query = {
    purpose: 'findOne',
    match: payload
  }
  return callApi(`abandoned_cart/checkoutinfo/query`, 'post', query, '', 'kiboengage')
}

exports.findOneStoreInfoObjectAndUpdate = (queryObject, update) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: update
  }
  return callApi(`abandoned_cart/storeinfo`, 'put', query, '', 'kiboengage')
}

exports.findOneCartInfoObjectAndUpdate = (queryObject, update) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: update
  }
  return callApi(`abandoned_cart/cartinfo`, 'put', query, '', 'kiboengage')
}

exports.findOneStoreAnalyticsObjectAndUpdate = (queryObject, update) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: update
  }
  return callApi(`abandoned_cart/storeanalytics`, 'put', query, '', 'kiboengage')
}

exports.findOneCheckOutInfoObjectAndUpdate = (queryObject, update) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: update
  }
  return callApi(`abandoned_cart/checkoutinfo`, 'put', query, '', 'kiboengage')
}

exports.deleteAllCartInfoObjects = (storeId) => {
  let query = {
    purpose: 'deleteAll',
    match: {storeId}
  }
  return callApi(`abandoned_cart/cartinfo`, 'delete', query, '', 'kiboengage')
}

exports.deleteAllCartInfoObjectsGeneric = (payload) => {
  let query = {
    purpose: 'deleteAll',
    match: payload
  }
  return callApi(`abandoned_cart/cartinfo`, 'delete', query, '', 'kiboengage')
}

exports.deleteOneCartInfoObject = (payload) => {
  let query = {
    purpose: 'deleteOne',
    match: payload
  }
  return callApi(`abandoned_cart/cartinfo`, 'delete', query, '', 'kiboengage')
}

exports.deleteOneCheckOutInfoObject = (checkoutInfoId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: checkoutInfoId}
  }
  return callApi(`abandoned_cart/checkoutinfo`, 'delete', query, '', 'kiboengage')
}

exports.deleteAllCheckoutInfoObjects = (storeId) => {
  let query = {
    purpose: 'deleteAll',
    match: {storeId}
  }
  return callApi(`abandoned_cart/checkoutinfo`, 'delete', query, '', 'kiboengage')
}

exports.deleteAllStoreAnalyticsObjects = (payload) => {
  let query = {
    purpose: 'deleteAll',
    match: payload
  }
  return callApi(`abandoned_cart/storeanalytics`, 'delete', query, '', 'kiboengage')
}

exports.deleteOneStoreInfoObject = (payload) => {
  let query = {
    purpose: 'deleteOne',
    match: payload
  }
  return callApi(`abandoned_cart/storeinfo`, 'delete', query, '', 'kiboengage')
}

exports.deleteAllStoreInfoObject = (payload) => {
  let query = {
    purpose: 'deleteAll',
    match: payload
  }
  return callApi(`abandoned_cart/storeinfo`, 'delete', query, '', 'kiboengage')
}
