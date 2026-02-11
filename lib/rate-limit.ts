/**
 * In-memory sliding-window rate limiter.
 * Works on Edge Runtime (Vercel / middleware) — no Redis needed.
 *
 * Usage:
 *   const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 })
 *   const { success } = await limiter.check(ip, 10) // 10 requests per interval
 */

interface RateLimitStore {
  timestamps: number[]
}

const tokenBuckets = new Map<string, RateLimitStore>()

// Periodically clean up stale entries every 5 minutes
let cleanupScheduled = false

function scheduleCleanup(interval: number) {
  if (cleanupScheduled) return
  cleanupScheduled = true
  setInterval(() => {
    const now = Date.now()
    for (const [key, store] of tokenBuckets) {
      store.timestamps = store.timestamps.filter((t) => now - t < interval)
      if (store.timestamps.length === 0) tokenBuckets.delete(key)
    }
  }, 300_000) // Clean every 5 min
}

export function rateLimit({
  interval = 60_000,
  uniqueTokenPerInterval = 500,
}: {
  interval?: number
  uniqueTokenPerInterval?: number
} = {}) {
  scheduleCleanup(interval)

  return {
    check(token: string, limit: number): { success: boolean; remaining: number; reset: number } {
      const now = Date.now()
      const key = token

      // Evict oldest entries beyond capacity
      if (tokenBuckets.size > uniqueTokenPerInterval) {
        const oldest = [...tokenBuckets.entries()].sort(
          (a, b) => (a[1].timestamps[0] ?? 0) - (b[1].timestamps[0] ?? 0)
        )[0]
        if (oldest) tokenBuckets.delete(oldest[0])
      }

      let store = tokenBuckets.get(key)
      if (!store) {
        store = { timestamps: [] }
        tokenBuckets.set(key, store)
      }

      // Remove timestamps outside the window
      store.timestamps = store.timestamps.filter((t) => now - t < interval)

      const remaining = Math.max(0, limit - store.timestamps.length)
      const reset = store.timestamps.length > 0
        ? store.timestamps[0] + interval
        : now + interval

      if (store.timestamps.length >= limit) {
        return { success: false, remaining: 0, reset }
      }

      store.timestamps.push(now)
      return { success: true, remaining: remaining - 1, reset }
    },
  }
}

// ─── Pre-configured limiters ───

/** General API: 60 req/min per IP */
export const apiLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 1000 })

/** Auth endpoints: 5 req/min per IP */
export const authLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 })

/** AI endpoints: 10 req/min per IP */
export const aiLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 })

/** Stripe webhooks: 100 req/min per IP */
export const webhookLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 200 })
