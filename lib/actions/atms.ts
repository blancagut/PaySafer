'use server'

import { createClient } from '@/lib/supabase/server'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const GOOGLE_PLACES_HOST = process.env.GOOGLE_PLACES_RAPIDAPI_HOST || 'google-map-places-new-v2.p.rapidapi.com'
const ATM_CACHE_MINUTES = Number(process.env.ATM_SEARCH_CACHE_MINUTES || '60')

const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 }
const DEFAULT_RADIUS = 12000

type CacheEntry = { expiresAt: number; data: ATMLocation[] }
type SuggestionCacheEntry = { expiresAt: number; data: ATMSuggestion[] }

declare global {
  var __atmSearchCache__: Map<string, CacheEntry> | undefined
  var __atmSuggestionCache__: Map<string, SuggestionCacheEntry> | undefined
}

const atmSearchCache = globalThis.__atmSearchCache__ || new Map<string, CacheEntry>()
if (!globalThis.__atmSearchCache__) globalThis.__atmSearchCache__ = atmSearchCache
const atmSuggestionCache = globalThis.__atmSuggestionCache__ || new Map<string, SuggestionCacheEntry>()
if (!globalThis.__atmSuggestionCache__) globalThis.__atmSuggestionCache__ = atmSuggestionCache

export interface ATMLocation {
  id: string
  name: string
  network: string
  address: string
  lat: number
  lng: number
  free_withdrawal: boolean
  fee: number
  currency: string
  hours: string
  features: string[]
  rating: number
}

export interface ATMSuggestion {
  placeId: string
  text: string
  secondaryText?: string
}

interface GetATMsOptions {
  query?: string
  center?: { lat: number; lng: number }
  radius?: number
}

function normalize(value: string | null | undefined): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function mapSupabaseATM(row: ATMLocation): ATMLocation {
  return {
    id: row.id,
    name: row.name,
    network: row.network,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    free_withdrawal: Boolean(row.free_withdrawal),
    fee: Number(row.fee),
    currency: row.currency || 'AED',
    hours: row.hours || '24/7',
    features: row.features ?? [],
    rating: Number(row.rating ?? 0),
  }
}

function filterSupabaseATMs(rows: ATMLocation[], query: string): ATMLocation[] {
  const q = normalize(query)
  if (!q) return rows

  return rows.filter((atm) => {
    return [atm.name, atm.network, atm.address, ...(atm.features || [])]
      .map(normalize)
      .some((value) => value.includes(q))
  })
}

function mergeGoogleWithSupabase(google: ATMLocation[], supabase: ATMLocation[]): ATMLocation[] {
  const usedSupabaseIds = new Set<string>()

  const mergedGoogle = google.map((g) => {
    const gName = normalize(g.name)
    const gAddress = normalize(g.address)

    const match = supabase.find((s) => {
      const sName = normalize(s.name)
      const sAddress = normalize(s.address)
      return (
        (sName && (gName.includes(sName) || sName.includes(gName))) ||
        (sAddress && gAddress && (sAddress.includes(gAddress) || gAddress.includes(sAddress)))
      )
    })

    if (!match) return g

    usedSupabaseIds.add(match.id)
    return {
      ...g,
      network: match.network || g.network,
      free_withdrawal: match.free_withdrawal,
      fee: Number(match.fee),
      currency: match.currency || g.currency,
      hours: match.hours || g.hours,
      features: match.features?.length ? match.features : g.features,
      rating: match.rating || g.rating,
    }
  })

  const unmatchedSupabase = supabase.filter((s) => !usedSupabaseIds.has(s.id))
  return [...mergedGoogle, ...unmatchedSupabase]
}

function mapGooglePlaceToATM(place: Record<string, unknown>, index: number): ATMLocation {
  const location = (place.location as { latitude?: number; longitude?: number } | undefined)
    || ((place.geometry as { location?: { latitude?: number; longitude?: number } } | undefined)?.location)

  const displayName = (place.displayName as { text?: string } | undefined)?.text
    || (place.name as string | undefined)
    || `ATM ${index + 1}`

  const formattedAddress = (place.formattedAddress as string | undefined)
    || (place.shortFormattedAddress as string | undefined)
    || (place.vicinity as string | undefined)
    || 'Address unavailable'

  const types = (place.types as string[] | undefined) || []
  const openingHours = (place.currentOpeningHours as { openNow?: boolean } | undefined)

  return {
    id: (place.id as string | undefined) || `google-atm-${index}`,
    name: displayName,
    network: types.includes('bank') ? 'Bank ATM' : 'ATM Network',
    address: formattedAddress,
    lat: Number(location?.latitude ?? DEFAULT_CENTER.lat),
    lng: Number(location?.longitude ?? DEFAULT_CENTER.lng),
    free_withdrawal: false,
    fee: 2.5,
    currency: 'AED',
    hours: openingHours?.openNow ? 'Open now' : 'See listing',
    features: ['ATM'],
    rating: Number(place.rating ?? 0),
  }
}

async function fetchGoogleATMs(query: string, center: { lat: number; lng: number }, radius: number): Promise<ATMLocation[]> {
  if (!RAPIDAPI_KEY) return []

  const response = await fetch(`https://${GOOGLE_PLACES_HOST}/v1/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': GOOGLE_PLACES_HOST,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.types,places.rating,places.currentOpeningHours.openNow',
    },
    body: JSON.stringify({
      textQuery: query ? `${query} ATM` : 'ATM near me',
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: {
            latitude: center.lat,
            longitude: center.lng,
          },
          radius,
        },
      },
      languageCode: 'en',
      regionCode: 'AE',
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google Places request failed (${response.status}): ${errorText}`)
  }

  const payload = await response.json() as { places?: Record<string, unknown>[] }
  const places = payload?.places ?? []

  return places
    .map((place, index) => mapGooglePlaceToATM(place, index))
    .filter((atm) => Number.isFinite(atm.lat) && Number.isFinite(atm.lng))
}

async function fetchGoogleAutocomplete(query: string, center: { lat: number; lng: number }, radius: number): Promise<ATMSuggestion[]> {
  if (!RAPIDAPI_KEY || !query.trim()) return []

  const response = await fetch(`https://${GOOGLE_PLACES_HOST}/v1/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': GOOGLE_PLACES_HOST,
      'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
    },
    body: JSON.stringify({
      input: `${query} ATM`,
      locationBias: {
        circle: {
          center: {
            latitude: center.lat,
            longitude: center.lng,
          },
          radius,
        },
      },
      languageCode: 'en',
      regionCode: 'AE',
      includeQueryPredictions: false,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Autocomplete request failed (${response.status}): ${errorText}`)
  }

  const payload = await response.json() as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string
        text?: { text?: string }
        structuredFormat?: {
          mainText?: { text?: string }
          secondaryText?: { text?: string }
        }
      }
    }>
  }

  const mapped: Array<ATMSuggestion | null> = (payload.suggestions || []).map((item) => {
    const place = item.placePrediction
    if (!place?.placeId) return null
    const main = place.structuredFormat?.mainText?.text || place.text?.text || ''
    const secondary = place.structuredFormat?.secondaryText?.text || ''
    return {
      placeId: place.placeId,
      text: main,
      secondaryText: secondary,
    }
  })

  return mapped
    .filter((item): item is ATMSuggestion => Boolean(item && item.text))
    .slice(0, 8)
}

export async function getATMSuggestions(options: {
  query: string
  center?: { lat: number; lng: number }
  radius?: number
}): Promise<{ data: ATMSuggestion[]; error?: string }> {
  const query = options.query.trim()
  const center = options.center || DEFAULT_CENTER
  const radius = options.radius || DEFAULT_RADIUS

  if (!query || query.length < 2) return { data: [] }

  const cacheKey = `${normalize(query)}:${center.lat.toFixed(4)}:${center.lng.toFixed(4)}:${radius}`
  const cached = atmSuggestionCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data }
  }

  try {
    const suggestions = await fetchGoogleAutocomplete(query, center, radius)
    atmSuggestionCache.set(cacheKey, {
      data: suggestions,
      expiresAt: Date.now() + ATM_CACHE_MINUTES * 60 * 1000,
    })
    return { data: suggestions }
  } catch (error) {
    console.error('[getATMSuggestions] Error:', error)
    return { data: [], error: 'Failed to load suggestions' }
  }
}

export async function getATMs(options?: GetATMsOptions): Promise<{ data: ATMLocation[]; error?: string }> {
  const query = options?.query?.trim() || ''
  const center = options?.center || DEFAULT_CENTER
  const radius = options?.radius || DEFAULT_RADIUS

  const cacheKey = `${normalize(query)}:${center.lat.toFixed(4)}:${center.lng.toFixed(4)}:${radius}`
  const cached = atmSearchCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.data }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('atms')
    .select('id, name, network, address, lat, lng, free_withdrawal, fee, currency, hours, features, rating')
    .eq('active', true)
    .order('name')

  if (error) return { data: [], error: error.message }

  const supabaseATMs = ((data ?? []) as ATMLocation[]).map(mapSupabaseATM)

  if (!RAPIDAPI_KEY) {
    const fallback = filterSupabaseATMs(supabaseATMs, query)
    return { data: fallback }
  }

  try {
    const googleATMs = await fetchGoogleATMs(query, center, radius)
    const merged = mergeGoogleWithSupabase(googleATMs, supabaseATMs)
    const filtered = filterSupabaseATMs(merged, query)

    atmSearchCache.set(cacheKey, {
      data: filtered,
      expiresAt: Date.now() + ATM_CACHE_MINUTES * 60 * 1000,
    })

    return { data: filtered }
  } catch (fetchError) {
    console.error('[getATMs] Google Places error:', fetchError)
    const fallback = filterSupabaseATMs(supabaseATMs, query)
    return {
      data: fallback,
      error: 'Google Places unavailable, showing cached ATM directory',
    }
  }
}
