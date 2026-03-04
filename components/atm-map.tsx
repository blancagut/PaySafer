"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import "leaflet/dist/leaflet.css"

export interface ATM {
  id: string
  name: string
  network: string
  address: string
  distance: string
  distanceMeters: number
  lat: number
  lng: number
  freeWithdrawal: boolean
  fee: number
  currency: string
  hours: string
  features: string[]
  rating: number
}

interface ATMMapProps {
  atms: ATM[]
  selectedId?: string | null
  onSelectATM?: (atmId: string) => void
  center?: { lat: number; lng: number }
}

function RecenterOnSelected({ selectedATM }: { selectedATM?: ATM | null }) {
  const map = useMap()

  useEffect(() => {
    if (!selectedATM) return
    map.flyTo([selectedATM.lat, selectedATM.lng], 15, {
      duration: 0.8,
    })
  }, [selectedATM, map])

  return null
}

export default function ATMMap({ atms, selectedId, onSelectATM, center }: ATMMapProps) {
  const initialCenter = useMemo<LatLngExpression>(() => {
    if (center) return [center.lat, center.lng]
    if (atms.length > 0) return [atms[0].lat, atms[0].lng]
    return [25.2048, 55.2708]
  }, [center, atms])

  const initialZoom = center || atms.length > 0 ? 13 : 11

  const selectedATM = useMemo(
    () => (selectedId ? atms.find((a) => a.id === selectedId) ?? null : null),
    [selectedId, atms],
  )

  return (
    <div className="h-full w-full rounded-xl overflow-hidden relative">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterOnSelected selectedATM={selectedATM} />

        {atms.map((atm) => (
          <CircleMarker
            key={atm.id}
            center={[atm.lat, atm.lng]}
            radius={selectedId === atm.id ? 12 : 9}
            pathOptions={{
              color: atm.freeWithdrawal ? "#34d399" : "#f59e0b",
              fillColor: atm.freeWithdrawal ? "#10b981" : "#f59e0b",
              fillOpacity: 0.85,
              weight: selectedId === atm.id ? 3 : 2,
            }}
            eventHandlers={{
              click: () => {
                onSelectATM?.(atm.id)
              },
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-sm mb-1">{atm.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{atm.network}</p>
                <p className="text-xs text-gray-500 mb-2">{atm.address}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Distance:</span>
                  <span className="font-medium">{atm.distance}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-600">Fee:</span>
                  <span className={`font-medium ${atm.freeWithdrawal ? "text-emerald-600" : "text-amber-600"}`}>
                    {atm.freeWithdrawal ? "Free" : `${atm.currency} ${atm.fee}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-600">Hours:</span>
                  <span className="font-medium">{atm.hours}</span>
                </div>
                {atm.features.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {atm.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg text-xs">
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-700">Fee-Free</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-700">With Fee</span>
          </div>
        </div>
      </div>
    </div>
  )
}
