const { callApi } = require('./index')

exports.incrementCompanyUsageMessage = (companyId, platform, increment) => {
  return callApi(`featureUsage/updateCompany`, 'put', {
    query: {companyId: companyId, platform: platform},
    newPayload: { $inc: { messages: increment } },
    options: {}
  })
}

exports.fetchUsages = (companyId, planId, platform, data) => {
  return new Promise((resolve, reject) => {
    callApi(`featureUsage/companyQuery`, 'post', {companyId: companyId, platform: platform})
      .then(companyUsage => {
        companyUsage = companyUsage[0]
        callApi(`featureUsage/planQuery`, 'post', {planId: planId})
          .then(planUsage => {
            planUsage = planUsage[0]
            if (!planUsage) {
              if (data) {
                planUsage = {messages: data.messages}
                resolve({planUsage, companyUsage})
              } else {
                callApi(`companyprofile/query`, 'post', {_id: companyId})
                  .then(company => {
                    planUsage = {messages: company.sms.messages}
                    resolve({planUsage, companyUsage})
                  })
                  .catch(err => {
                    reject(err)
                  })
              }
            } else {
              resolve({planUsage, companyUsage})
            }
          })
          .catch(err => {
            reject(err)
          })
      })
      .catch(err => {
        reject(err)
      })
  })
}
