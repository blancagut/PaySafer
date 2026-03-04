"use client"

import { useEffect, useMemo, useState } from "react"
import Map, { Marker, Popup, NavigationControl, GeolocateControl, ViewStateChangeEvent } from "react-map-gl/mapbox"
import { MapPin } from "lucide-react"
import "mapbox-gl/dist/mapbox-gl.css"

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

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export default function ATMMap({ atms, selectedId, onSelectATM, center }: ATMMapProps) {
  const token = useMemo(() => MAPBOX_TOKEN.trim(), [])
  const [viewState, setViewState] = useState({
    longitude: center?.lng ?? 0,
    latitude: center?.lat ?? 20,
    zoom: center ? 13 : 1.8,
  })
  const [popupInfo, setPopupInfo] = useState<ATM | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  // Center on selected ATM
  useEffect(() => {
    if (selectedId) {
      const atm = atms.find((a) => a.id === selectedId)
      if (atm) {
        setViewState((prev) => ({
          ...prev,
          longitude: atm.lng,
          latitude: atm.lat,
          zoom: 15,
        }))
        setPopupInfo(atm)
      }
    }
  }, [selectedId, atms])

  if (!token) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white/[0.03] rounded-xl">
        <p className="text-sm text-muted-foreground">
          Mapbox token missing. Add NEXT_PUBLIC_MAPBOX_TOKEN in .env.local and restart dev server.
        </p>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white/[0.03] rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Mapbox failed to load: {mapError}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden">
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        onError={(event: { error?: { message?: string } }) =>
          setMapError(event.error?.message || "Unknown Mapbox error")
        }
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={token}
        minZoom={1}
        maxZoom={20}
        reuseMaps
        style={{ width: "100%", height: "100%" }}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />

        {/* Geolocate Control */}
        <GeolocateControl
          position="top-right"
          trackUserLocation
          showUserHeading
        />

        {/* ATM Markers */}
        {atms.map((atm) => (
          <Marker
            key={atm.id}
            longitude={atm.lng}
            latitude={atm.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent?.stopPropagation?.()
              setPopupInfo(atm)
              onSelectATM?.(atm.id)
            }}
          >
            <div
              className="cursor-pointer transition-transform hover:scale-110"
              title={atm.name}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                  atm.freeWithdrawal
                    ? "bg-emerald-500 ring-2 ring-emerald-400/50"
                    : "bg-amber-500 ring-2 ring-amber-400/50"
                } ${selectedId === atm.id ? "ring-4 scale-125" : ""}`}
              >
                <MapPin className="w-4 h-4 text-white" />
              </div>
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="atm-popup"
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">{popupInfo.name}</h3>
              <p className="text-xs text-gray-600 mb-2">{popupInfo.network}</p>
              <p className="text-xs text-gray-500 mb-2">{popupInfo.address}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium">{popupInfo.distance}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-600">Fee:</span>
                <span
                  className={`font-medium ${
                    popupInfo.freeWithdrawal ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {popupInfo.freeWithdrawal ? "Free" : `${popupInfo.currency} ${popupInfo.fee}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-600">Hours:</span>
                <span className="font-medium">{popupInfo.hours}</span>
              </div>
              {popupInfo.features.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {popupInfo.features.map((feature) => (
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
        )}
      </Map>

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
