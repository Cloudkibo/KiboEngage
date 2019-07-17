exports.getScheduledTime = (interval) => {
  let hours
  if (interval === '24 hours') {
    hours = 24
  } else if (interval === '12 hours') {
    hours = 12
  } else if (interval === '8 hours') {
    hours = 8
  }
  let date = new Date()
  date.setTime(date.getTime() + (hours * 60 * 60 * 1000))
  return date
}
