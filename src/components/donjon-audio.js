/** @module donjon-audio — Web Audio API engine for Donjon SFX + BGM */

const SOUND_CATALOG = {
  'fight-start': 'audio/donjon/fight-start.mp3',
  'score-impact': 'audio/donjon/score-impact.mp3',
  'stat-reveal': 'audio/donjon/stat-reveal.mp3',
  'win-large': 'audio/donjon/win-large.mp3',
  'win-small': 'audio/donjon/win-small.mp3',
  'draw': 'audio/donjon/draw.mp3',
  'loss-small': 'audio/donjon/loss-small.mp3',
  'loss-large': 'audio/donjon/loss-large.mp3',
  'lock': 'audio/donjon/lock.mp3',
  'finale-reveal': 'audio/donjon/finale-reveal.mp3',
  'arcade-bgm': 'audio/donjon/arcade-bgm.mp3',
}

let ctx = null
let muted = false
let bgmSource = null
let bgmBuffer = null
const bufferCache = new Map()

export async function init() {
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') await ctx.resume()
  } catch (_err) {
    ctx = null
  }
}

async function loadBuffer(soundId) {
  if (bufferCache.has(soundId)) return bufferCache.get(soundId)
  const path = SOUND_CATALOG[soundId]
  if (!path || !ctx) return null
  try {
    const response = await fetch(`./${path}`)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    bufferCache.set(soundId, audioBuffer)
    return audioBuffer
  } catch (_err) {
    return null
  }
}

export async function play(soundId) {
  if (muted || !ctx) return
  const buffer = await loadBuffer(soundId)
  if (!buffer) return
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.start(0)
}

export async function startBGM() {
  if (muted || !ctx) return
  stopBGM()
  if (!bgmBuffer) bgmBuffer = await loadBuffer('arcade-bgm')
  if (!bgmBuffer) return
  bgmSource = ctx.createBufferSource()
  bgmSource.buffer = bgmBuffer
  bgmSource.loop = true
  bgmSource.connect(ctx.destination)
  bgmSource.start(0)
}

export function stopBGM() {
  if (bgmSource) {
    try {
      bgmSource.stop()
    } catch (_e) {
      /* already stopped */
    }
    bgmSource = null
  }
}

export function setMuted(value) {
  muted = value
  if (muted) stopBGM()
}

export function isMuted() {
  return muted
}

export function destroy() {
  stopBGM()
  if (ctx) {
    try {
      ctx.close()
    } catch (_e) {
      /* ignore */
    }
    ctx = null
  }
  bufferCache.clear()
  bgmBuffer = null
  muted = false
}
