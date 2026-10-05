const OPEN_MEET_EVENT_ID = 'bc6297bc-8483-4113-aa8d-b8ca19f0a980'

export const getPublicMeetLink = (event) => {
  if (event?.id !== OPEN_MEET_EVENT_ID || event.status !== 'published') return ''

  try {
    const url = new URL(event.live_link)
    return url.protocol === 'https:' && url.hostname === 'meet.google.com' ? url.href : ''
  } catch {
    return ''
  }
}
