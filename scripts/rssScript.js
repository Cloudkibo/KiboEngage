const { callApi } = require('../server/api/v1.1/utility')
const logger = require('../server/components/logger')
const TAG = 'scripts/rssScript.js'

exports.runRSSScript = () => {
  callApi(`autoposting/`, 'get', {}, '', 'kiboengage')
    .then(autopostings => {
      autopostings.forEach(autoposting => {
        getTime(autoposting)
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch autoposting objects ${err}`, 'error')
    })
}

const getTime = (autoposting) => {
  if (autoposting.scheduledTime === '6 hours') {
    return addHours(autoposting.datetime, 6)
  } else if (autoposting.scheduledTime === '12 hours') {
    return addHours(autoposting.datetime, 12)
  } else if (autoposting.scheduledTime === '24 hours') {
    return addHours(autoposting.datetime, 24)
  }
}

const addHours = (datetime, hour) => {
  let date = new Date(datetime)
  date.setTime(date.getTime() + (hour * 60 * 60 * 1000))
  return date
}
