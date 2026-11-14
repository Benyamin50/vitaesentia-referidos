export function getYouTubeId(value) {
  if (typeof value !== 'string') return ''
  try {
    const text = value.trim()
    const url = new URL(text.includes('://') ? text : `https://${text}`)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return ''
    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/')
    let id = ''
    if (
      ['youtu.be', 'www.youtu.be'].includes(url.hostname) &&
      parts.length === 1
    ) {
      id = parts[0]
    } else if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'music.youtube.com',
      ].includes(url.hostname)
    ) {
      if (url.pathname.replace(/\/$/, '') === '/watch')
        id = url.searchParams.get('v') || ''
      else if (
        parts.length === 2 &&
        ['embed', 'shorts', 'live'].includes(parts[0])
      )
        id = parts[1]
    } else if (
      ['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(
        url.hostname,
      ) &&
      parts.length === 2 &&
      parts[0] === 'embed'
    ) {
      id = parts[1]
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : ''
  } catch {
    return ''
  }
}

export const ordenarVideos = (videos) =>
  [...videos].sort(
    (a, b) =>
      Number(a.orden) - Number(b.orden) ||
      String(a.id).localeCompare(String(b.id)),
  )
