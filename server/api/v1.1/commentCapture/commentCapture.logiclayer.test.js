const { getPostId, handleVideo, getMetaUrls, handleText, handleImage, preparePayloadToPost } = require('./commentCapture.logiclayer.js')

describe('Validate getPostId', () => {
  test('give correct postId', () => {
    let input = 'https://www.facebook.com/watch/?v=800105130406040'
    expect(getPostId(input)).toEqual('800105130406040')
  })
  test('give correct postId', () => {
    let input = 'https://www.facebook.com/1748876175156768/photos/a.2629333130444397/2629333097111067/?type=3&__tn__=-R'
    expect(getPostId(input)).toEqual('2629333097111067')
  })
  test('give correct postId', () => {
    let input = 'https://www.facebook.com/permalink.php?story_fbid=2799292190115156&id=1748876175156768&__tn__=-R'
    expect(getPostId(input)).toEqual('2799292190115156')
  })
  test('give correct postId', () => {
    let input = 'https://www.facebook.com/unofficialclothesbyAC/posts/605009796681637?__tn__=-R'
    expect(getPostId(input)).toEqual('605009796681637')
  })
  test('give correct postId', () => {
    let input = 'https://www.facebook.com/1748876175156768/videos/800105130406040/?__xts__[0]=68.ARDlJRz_Rwe-kM5uPK6mZLZsUD7n9pHPFuW3lSbqJcWpjZx3cZ6KFfDBFUtV-oLfY0Xgl921rEl3urQGCEnFcWMAYSKAXKo38cntTRxcWZR_tv24tzeixr9kVs76rm8FVJdl0THAH1YYkP-RRKIT1O6QM0OI73GPrDt4ZoUXpqvHZYKfvRBU-VIgc5pFCYOSTPIRfd_unNBifnhdVKKDItvMEN_d-fsHf9hHIK4VH38QCIPqBVcMF6Lj3EhtFbiLgVYvxwZn7UPSUjWNzEogGwa1YrJCMZA_NHl_mwQYEWnmuZ_9bKOFIHQndU_gh14JgmtTFLlsbCBZxEmCEIvVXHCKkntlrCmpwMtp3PC4&__tn__=-R'
    expect(getPostId(input)).toEqual('800105130406040')
  })
  test('give empty postId', () => {
    let input = 'https://www.youtube.com/'
    expect(getPostId(input)).toEqual('')
  })
})

describe('Validate handleVideo', () => {
  test('gives prepared payload', () => {
    let videoComponents = [{componentType: 'video',
      url: 'https://accounts.cloudkibo.com/api/v1/files/download/f30450a410120191031121752.mp4'}
    ]
    let textComponents = []
    let output = {
      type: 'video',
      payload: {
        'file_url': 'https://accounts.cloudkibo.com/api/v1/files/download/f30450a410120191031121752.mp4'
      }
    }
    expect(handleVideo(videoComponents, textComponents)).toEqual(output)
  })
  test('gives prepared payload', () => {
    let videoComponents = [{componentType: 'video',
      url: 'https://accounts.cloudkibo.com/api/v1/files/download/f30450a410120191031121752.mp4'}
    ]
    let textComponents = [{componentType: 'text', text: 'hello'}]
    let output = {
      type: 'video',
      payload: {
        'file_url': 'https://accounts.cloudkibo.com/api/v1/files/download/f30450a410120191031121752.mp4',
        description: 'hello'
      }
    }
    expect(handleVideo(videoComponents, textComponents)).toEqual(output)
  })
})
describe('Validate getmetaUrl', () => {
  test('gives urls', () => {
    let input = {text: 'hello there https://www.facebook.com/actesting/ hey https://business.facebook.com/Test-4-130986737581055/'}
    let output = ['https://www.facebook.com/actesting/', 'https://business.facebook.com/Test-4-130986737581055/']
    expect(getMetaUrls(input)).toEqual(output)
  })
  test('gives emty url', () => {
    let input = {text: 'hi'}
    expect(getMetaUrls(input)).toEqual(null)
  })
})
describe('Validate handleText', () => {
  test('gives prepared payload', () => {
    let textComponents = [{componentType: 'text', text: 'hi there'}]
    let output = {
      type: 'text',
      payload: {
        'message': 'hi there'
      }
    }
    expect(handleText(textComponents)).toEqual(output)
  })
  test('gives prepared payload with links', () => {
    let textComponents = [{componentType: 'text', text: 'hi there https://www.facebook.com/actesting/'}]
    let output = {
      type: 'text',
      payload: {
        'message': 'hi there https://www.facebook.com/actesting/',
        'link': 'https://www.facebook.com/actesting/'
      }
    }
    expect(handleText(textComponents)).toEqual(output)
  })
  test('gives prepared payload with multiple links', () => {
    let textComponents = [{componentType: 'text', text: 'hi https://business.facebook.com/Test-4-130986737581055/ there https://www.facebook.com/actesting/'}]
    let output = {
      type: 'text',
      payload: {
        'message': 'hi https://business.facebook.com/Test-4-130986737581055/ there https://www.facebook.com/actesting/',
        'link': 'https://kibopush.com',
        'child_attachments': [{'link': 'https://business.facebook.com/Test-4-130986737581055/'},
          {'link': 'https://www.facebook.com/actesting/'}]
      }
    }
    expect(handleText(textComponents)).toEqual(output)
  })
})
describe('Validate handleImage', () => {
  test('single image and no text', () => {
    let textComponents = []
    let imageComponents = [{componentType: 'image', url: 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'}]
    let output = {
      type: 'image',
      payload: {
        'url': 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'
      }
    }
    expect(handleImage(imageComponents, textComponents)).toEqual(output)
  })
  test('single image and text', () => {
    let textComponents = [{componentType: 'text', text: 'hi'}]
    let imageComponents = [{componentType: 'image', url: 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'}]
    let output = {
      type: 'image',
      payload: {
        'url': 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png',
        'caption': 'hi'
      }
    }
    expect(handleImage(imageComponents, textComponents)).toEqual(output)
  })
  test('multiple images and no text', () => {
    let textComponents = []
    let imageComponents = [{componentType: 'image', url: 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'},
      {componentType: 'image', url: 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'}]
    let output = {
      type: 'images',
      payload: {
        'link': `https://kibopush.com`,
        'child_attachments': [{'link': 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'},
          {'link': 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'}
        ]
      }
    }
    expect(handleImage(imageComponents, textComponents)).toEqual(output)
  })
  test('multiple images and text', () => {
    let textComponents = [{componentType: 'text', text: 'hi'}]
    let imageComponents = [{componentType: 'image', url: 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'},
      {componentType: 'image', url: 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'}]
    let output = {
      type: 'images',
      payload: {
        'message': 'hi',
        'link': `https://kibopush.com`,
        'child_attachments': [{'link': 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'},
          {'link': 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'}
        ]
      }
    }
    expect(handleImage(imageComponents, textComponents)).toEqual(output)
  })
})
describe('Validate preparePayloadToPost', () => {
  test('give preparePayload for image', () => {
    let input = [
      {componentType: 'text', text: 'hi'},
      {componentType: 'image', url: 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'},
      {componentType: 'image', url: 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'}]
    let output = {
      type: 'images',
      payload: {
        'message': 'hi',
        'link': `https://kibopush.com`,
        'child_attachments': [{'link': 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'},
          {'link': 'https://accounts.cloudkibo.com/api/v1/files/download/f0aa5dea8722019103112558.png'}
        ]
      }
    }
    expect(preparePayloadToPost(input)).toEqual(output)
  })
  test('give preparePayload for text', () => {
    let input = [
      {componentType: 'text', text: 'hi'}]
    let output = {
      type: 'text',
      payload: {
        'message': 'hi'
      }
    }
    expect(preparePayloadToPost(input)).toEqual(output)
  })
  test('give preparePayload for video', () => {
    let input = [
      {componentType: 'text', text: 'hi'},
      {componentType: 'video',
        url: 'https://accounts.cloudkibo.com/api/v1/files/download/f30450a410120191031121752.mp4'}]
    let output = {
      type: 'video',
      payload: {
        'file_url': 'https://accounts.cloudkibo.com/api/v1/files/download/f30450a410120191031121752.mp4',
        description: 'hi'
      }
    }
    expect(preparePayloadToPost(input)).toEqual(output)
  })
})
