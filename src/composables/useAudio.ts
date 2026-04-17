import { type Ref } from 'vue'

export type SoundName =
  | 'click'
  | 'feed'
  | 'grab'
  | 'drop'
  | 'push'
  | 'happy'
  | 'summon'
  | 'coin'
  | 'shop'
  | 'notification'

/**
 * Audio manager composable.
 * Uses programmatic Web Audio API synthesis — no mp3 files needed.
 */
export function useAudio(volume: Ref<number>, muted: Ref<boolean>) {
  let audioCtx: AudioContext | null = null

  function getCtx(): AudioContext {
    if (!audioCtx) {
      audioCtx = new AudioContext()
    }
    return audioCtx
  }

  function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
    if (muted.value || volume.value <= 0) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      g.gain.value = gain * (volume.value / 100)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch {
      // Audio not available
    }
  }

  function playNotes(notes: Array<{ freq: number; time: number; duration: number; type?: OscillatorType; gain?: number }>) {
    if (muted.value || volume.value <= 0) return
    try {
      const ctx = getCtx()
      for (const note of notes) {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = note.type || 'sine'
        osc.frequency.value = note.freq
        const vol = (note.gain ?? 0.3) * (volume.value / 100)
        g.gain.value = vol
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.duration)
        osc.connect(g)
        g.connect(ctx.destination)
        osc.start(ctx.currentTime + note.time)
        osc.stop(ctx.currentTime + note.time + note.duration)
      }
    } catch {
      // Audio not available
    }
  }

  function playSound(name: SoundName) {
    if (muted.value || volume.value <= 0) return

    switch (name) {
      case 'click':
        // Short pop
        playTone(800, 0.08, 'sine', 0.2)
        break
      case 'feed':
        // Cute munch: two quick notes
        playNotes([
          { freq: 523, time: 0, duration: 0.1, type: 'triangle' },
          { freq: 659, time: 0.1, duration: 0.15, type: 'triangle' },
        ])
        break
      case 'grab':
        // Squeak! Rising tone
        playNotes([
          { freq: 600, time: 0, duration: 0.05, type: 'square', gain: 0.15 },
          { freq: 900, time: 0.05, duration: 0.1, type: 'square', gain: 0.1 },
        ])
        break
      case 'drop':
        // Thud + bounce
        playNotes([
          { freq: 150, time: 0, duration: 0.15, type: 'sine', gain: 0.4 },
          { freq: 300, time: 0.15, duration: 0.1, type: 'sine', gain: 0.2 },
        ])
        break
      case 'push':
        // Effort grunt: low rumble
        playNotes([
          { freq: 120, time: 0, duration: 0.2, type: 'sawtooth', gain: 0.15 },
          { freq: 180, time: 0.1, duration: 0.15, type: 'sawtooth', gain: 0.1 },
        ])
        break
      case 'happy':
        // Happy jingle: ascending notes
        playNotes([
          { freq: 523, time: 0, duration: 0.12, type: 'triangle', gain: 0.25 },
          { freq: 659, time: 0.12, duration: 0.12, type: 'triangle', gain: 0.25 },
          { freq: 784, time: 0.24, duration: 0.2, type: 'triangle', gain: 0.3 },
        ])
        break
      case 'summon':
        // Teleport whoosh
        playNotes([
          { freq: 400, time: 0, duration: 0.15, type: 'sine', gain: 0.2 },
          { freq: 600, time: 0.05, duration: 0.2, type: 'sine', gain: 0.25 },
          { freq: 800, time: 0.15, duration: 0.15, type: 'sine', gain: 0.2 },
        ])
        break
      case 'coin':
        // Coin collect ding
        playNotes([
          { freq: 988, time: 0, duration: 0.08, type: 'square', gain: 0.15 },
          { freq: 1319, time: 0.08, duration: 0.15, type: 'square', gain: 0.2 },
        ])
        break
      case 'shop':
        // Cash register
        playNotes([
          { freq: 523, time: 0, duration: 0.08, type: 'triangle', gain: 0.2 },
          { freq: 784, time: 0.08, duration: 0.08, type: 'triangle', gain: 0.25 },
          { freq: 1047, time: 0.16, duration: 0.2, type: 'triangle', gain: 0.3 },
        ])
        break
      case 'notification':
        // Bell ding-ding
        playNotes([
          { freq: 880, time: 0, duration: 0.15, type: 'sine', gain: 0.3 },
          { freq: 1109, time: 0.2, duration: 0.2, type: 'sine', gain: 0.35 },
        ])
        break
    }
  }

  return { playSound }
}
