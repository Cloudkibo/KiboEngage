const _ = require('lodash')
const utility = require('../../components/utility')

exports.facebookBroadcast = (body) => {
  if (!_.has(body, 'platform')) return false
  if (!_.has(body, 'payload')) return false
  if (!_.has(body, 'title')) return false

  if (body.payload.length === 0) {
    return false
  } else {
    for (let i = 0; i < body.payload.length; i++) {
      if (body.payload[i].componentType === undefined) return false
      if (body.payload[i].componentType === 'text') {
        if (body.payload[i].text === undefined ||
          body.payload[i].text === '') return false
        if (body.payload[i].buttons) {
          for (let j = 0; j < body.payload[i].buttons.length; j++) {
            if (body.payload[i].buttons[j].type === 'web_url') {
              if (!utility.validateUrl(
                body.payload[i].buttons[j].url)) return false
            }
          }
        }
      }
      if (body.payload[i].componentType === 'card') {
        if (body.payload[i].title === undefined ||
          body.payload[i].title === '') return false
        if (body.payload[i].fileurl === undefined ||
          body.payload[i].fileurl === '') return false
        if (body.payload[i].image_url === undefined ||
          body.payload[i].image_url === '') return false
        if (body.payload[i].description === undefined ||
          body.payload[i].description === '') return false
        if (body.payload[i].buttons === undefined) return false
        if (body.payload[i].buttons.length === 0) return false
        if (!utility.validateUrl(body.payload[i].image_url)) return false
        for (let j = 0; j < body.payload[i].buttons.length; j++) {
          if (body.payload[i].buttons[j].type === 'web_url') {
            if (!utility.validateUrl(
              body.payload[i].buttons[j].url)) return false
          }
        }
      }
      if (body.payload[i].componentType === 'media') {
        if (body.payload[i].fileurl === undefined ||
          body.payload[i].fileurl === '') return false
        if (body.payload[i].mediaType === undefined ||
          body.payload[i].mediaType === '') return false
        for (let j = 0; j < body.payload[i].buttons.length; j++) {
          if (body.payload[i].buttons[j].type === 'web_url') {
            if (!utility.validateUrl(
              body.payload[i].buttons[j].url)) return false
          }
        }
      }
      if (body.payload[i].componentType === 'gallery') {
        if (body.payload[i].cards === undefined) return false
        if (body.payload[i].cards.length === 0) return false
        for (let j = 0; j < body.payload[i].cards.length; j++) {
          if (body.payload[i].cards[j].title === undefined ||
            body.payload[i].cards[j].title === '') return false
          if (body.payload[i].cards[j].image_url === undefined ||
            body.payload[i].cards[j].image_url === '') return false
          if (body.payload[i].cards[j].subtitle === undefined ||
            body.payload[i].cards[j].subtitle === '') return false
          if (body.payload[i].cards[j].buttons === undefined) return false
          if (body.payload[i].cards[j].buttons.length === 0) return false
          if (!utility.validateUrl(
            body.payload[i].cards[j].image_url)) return false
          for (let k = 0; k < body.payload[i].cards[j].buttons.length; k++) {
            if (body.payload[i].cards[j].buttons[k].type === 'web_url') {
              if (!utility.validateUrl(
                body.payload[i].cards[j].buttons[k].url)) return false
            }
          }
        }
      }
      if (body.payload[i].componentType === 'list') {
        if (body.payload[i].listItems === undefined) return false
        if (body.payload[i].listItems.length === 0) return false
        if (body.payload[i].topElementStyle === undefined ||
        body.payload[i].topElementStyle === '') return false
        for (let m = 0; m < body.payload[i].buttons.length; m++) {
          if (body.payload[i].buttons[m].type === undefined ||
          body.payload[i].buttons[m].type === '') return false
          if (body.payload[i].buttons[m].type !== 'element_share' && (body.payload[i].buttons[m].title === undefined ||
          body.payload[i].buttons[m].title === '')) return false
          if (body.payload[i].buttons[m].type === 'web_url') {
            if (!utility.validateUrl(
              body.payload[i].buttons[m].url)) return false
          }
        }
        for (let j = 0; j < body.payload[i].listItems.length; j++) {
          if (body.payload[i].listItems[j].title === undefined ||
            body.payload[i].listItems[j].title === '') return false
          if (body.payload[i].listItems[j].subtitle === undefined ||
            body.payload[i].listItems[j].subtitle === '') return false
          if (body.payload[i].listItems[j].default_action && (
            body.payload[i].listItems[j].default_action.type === undefined ||
            body.payload[i].listItems[j].default_action.type === '')) return false
          if (body.payload[i].listItems[j].default_action && (
            body.payload[i].listItems[j].default_action.url === undefined ||
            body.payload[i].listItems[j].default_action.url === '')) return false
          if (body.payload[i].listItems[j].image_url && !utility.validateUrl(
            body.payload[i].listItems[j].image_url)) return false
          if (body.payload[i].listItems[j].buttons) {
            for (let k = 0; k < body.payload[i].listItems[j].buttons.length; k++) {
              if (body.payload[i].listItems[j].buttons[k].type !== 'element_share' && (body.payload[i].listItems[j].buttons[k].title === undefined ||
              body.payload[i].listItems[j].buttons[k].title === '')) return false
              if (body.payload[i].listItems[j].buttons[k].type === undefined ||
              body.payload[i].listItems[j].buttons[k].type === '') return false
              if (body.payload[i].listItems[j].buttons[k].type === 'web_url') {
                if (!utility.validateUrl(
                  body.payload[i].listItems[j].buttons[k].url)) return false
              }
            }
          }
        }
      }
    }
  }

  return true
}
