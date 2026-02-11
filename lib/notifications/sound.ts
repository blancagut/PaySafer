"use client"

/**
 * Notification sound utility.
 * Uses Web Audio API to synthesize a pleasant two-tone chime.
 * No external audio file needed.
 */

let audioCtx: AudioContext | null = null

/**
 * Play a synthesized two-tone notification chime.
 * Handles browser autoplay restrictions gracefully.
 */
export function playNotificationSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    // Resume context if suspended (autoplay policy)
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {})
    }

    const now = audioCtx.currentTime

    // Two-tone chime: C6 (1047 Hz) then E6 (1319 Hz)
    const frequencies = [1047, 1319]
    const duration = 0.12
    const gap = 0.08

    frequencies.forEach((freq, i) => {
      const oscillator = audioCtx!.createOscillator()
      const gainNode = audioCtx!.createGain()

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(freq, now)

      // Quick fade in/out for a clean chime
      const start = now + i * (duration + gap)
      gainNode.gain.setValueAtTime(0, start)
      gainNode.gain.linearRampToValueAtTime(0.3, start + 0.01)
      gainNode.gain.linearRampToValueAtTime(0, start + duration)

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx!.destination)

      oscillator.start(start)
      oscillator.stop(start + duration)
    })
  } catch {
    // Audio not supported — ignore
  }
}
