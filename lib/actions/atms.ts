'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function getATMs(): Promise<{ data: ATMLocation[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('atms')
    .select('id, name, network, address, lat, lng, free_withdrawal, fee, currency, hours, features, rating')
    .eq('active', true)
    .order('name')

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as ATMLocation[] }
}
