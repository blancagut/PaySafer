/**
 * Haptic Feedback System — PaySafer 2026
 * Uses the Vibration API for tactile feedback on supported devices
 */

type HapticPattern = 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy' | 'payment' | 'receive' | 'milestone'

const patterns: Record<HapticPattern, number[]> = {
  light:     [10],
  medium:    [25],
  heavy:     [50],
  success:   [10, 50, 20],
  error:     [50, 30, 50, 30, 50],
  warning:   [30, 50, 30],
  payment:   [15, 40, 15, 40, 30],
  receive:   [10, 30, 10, 30, 10, 30, 50],
  milestone: [20, 60, 40, 60, 20, 60, 80],
}

/** Whether the device supports vibration */
export function supportsHaptics(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

/** Trigger a haptic feedback pattern */
export function haptic(pattern: HapticPattern = 'light'): void {
  if (!supportsHaptics()) return
  try {
    navigator.vibrate(patterns[pattern])
  } catch {
    // Silently fail — some browsers block vibration
  }
}

/** Cancel any ongoing vibration */
export function cancelHaptic(): void {
  if (!supportsHaptics()) return
  navigator.vibrate(0)
}

/** Convenience: short tap feedback for button presses */
export function tapHaptic(): void {
  haptic('light')
}

/** Convenience: payment confirmation feedback */
export function paymentHaptic(): void {
  haptic('payment')
}

/** Convenience: money received feedback */
export function receiveHaptic(): void {
  haptic('receive')
}
