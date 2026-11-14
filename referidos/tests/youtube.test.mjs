import test from 'node:test'
import assert from 'node:assert/strict'
import { getYouTubeId, ordenarVideos } from '../src/utils/youtube.js'

test('acepta los formatos de enlaces de YouTube admitidos por el backend', () => {
  for (const url of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3', 'youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'https://youtube.com/live/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']) {
    assert.equal(getYouTubeId(url), 'dQw4w9WgXcQ')
  }
})

test('no admite esquemas, credenciales, dominios similares ni playlists', () => {
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ', 'https://evil.test@youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/playlist?list=abc', 'https://youtu.be/no-id', '', null]) {
    assert.equal(getYouTubeId(url), '')
  }
})

test('ordenar no modifica el catálogo y respeta el orden numérico', () => {
  const videos = [{ id: 'a', orden: 10 }, { id: 'b', orden: 2 }]
  assert.equal(ordenarVideos(videos)[0].id, 'b')
  assert.equal(videos[0].id, 'a')
})
