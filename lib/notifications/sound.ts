"use client"

/**
 * Notification sound utility.
 * Plays custom MP3 sounds based on notification type.
 *
 * Sound files in public/sounds/:
 *   money.mp3    → payments, transfers, requests, wallet
 *   message.mp3  → chat messages
 *   offer.mp3    → offers
 *   dispute.mp3  → disputes
 *   alert.mp3    → scam flags, admin, system
 */

type SoundCategory = 'money' | 'message' | 'offer' | 'dispute' | 'alert'

/**
 * Map notification type prefix → sound file.
 */
function getSoundForType(type?: string): SoundCategory {
  if (!type) return 'alert'

  if (
    type.startsWith('transaction.') ||
    type.startsWith('p2p_') ||
    type.startsWith('wallet.')
  ) return 'money'

  if (type.startsWith('message.')) return 'message'
  if (type.startsWith('offer.'))   return 'offer'
  if (type.startsWith('dispute.')) return 'dispute'

  // scam.*, admin.*, system, unknown
  return 'alert'
}

// Cache Audio elements per sound category to avoid re-creating them
const audioCache: Partial<Record<SoundCategory, HTMLAudioElement>> = {}

/**
 * Play the appropriate notification sound for the given notification type.
 * Handles browser autoplay restrictions gracefully.
 */
export function playNotificationSound(notificationType?: string) {
  try {
    const category = getSoundForType(notificationType)

    if (!audioCache[category]) {
      audioCache[category] = new Audio(`/sounds/${category}.mp3`)
      audioCache[category]!.volume = 0.5
    }

    const audio = audioCache[category]!
    audio.currentTime = 0
    audio.play().catch(() => {
      // Browser blocked autoplay — silently ignore.
    })
  } catch {
    // Audio not supported — ignore
  }
}
