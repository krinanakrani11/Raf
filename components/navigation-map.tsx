"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, MapPin, Navigation, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Script from "next/script"
import { useToast } from "@/hooks/use-toast"

// Define severity types for the map legend
type Severity = "low" | "medium" | "high"

interface LocationSuggestion {
  name: string
  lat: number
  lon: number
}

export default function NavigationMap() {
  // State for map and routing
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [routingMachineLoaded, setRoutingMachineLoaded] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const routingControlRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // State for search inputs
  const [startPoint, setStartPoint] = useState("")
  const [endPoint, setEndPoint] = useState("")
  const [startSuggestions, setStartSuggestions] = useState<LocationSuggestion[]>([])
  const [endSuggestions, setEndSuggestions] = useState<LocationSuggestion[]>([])
  const [showStartSuggestions, setShowStartSuggestions] = useState(false)
  const [showEndSuggestions, setShowEndSuggestions] = useState(false)
  const [isLoadingStart, setIsLoadingStart] = useState(false)
  const [isLoadingEnd, setIsLoadingEnd] = useState(false)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [settingLocation, setSettingLocation] = useState<"start" | "end" | null>(null)

  // Selected coordinates
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null)
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null)

  const { toast } = useToast()

  // Initialize map after Leaflet is loaded
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import("leaflet")

        // Fix Leaflet icon issues
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        })

        // Create map centered on Gujarat, India
        const map = L.map(mapRef.current).setView([22.2587, 71.1924], 7)
        mapInstanceRef.current = map

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        // Add map legend
        const legend = L.control({ position: "bottomright" })
        legend.onAdd = () => {
          const div = L.DomUtil.create("div", "info legend")
          div.innerHTML = `
            <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; margin-bottom: 5px;">Severity Legend</div>
              <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background-color: #4ade80; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5); margin-right: 5px;"></div>
                <span>Low</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background-color: #facc15; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5); margin-right: 5px;"></div>
                <span>Medium</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5); margin-right: 5px;"></div>
                <span>High</span>
              </div>
            </div>
          `
          return div
        }
        legend.addTo(map)

        setMapLoaded(true)
      } catch (error) {
        console.error("Error initializing map:", error)
        toast({
          title: "Map Error",
          description: "There was an error loading the map. Please try again later.",
          variant: "destructive",
        })
      }
    }

    initMap()

    return () => {
      // Clean up map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [leafletLoaded, toast])

  // Search for locations using Nominatim API
  const searchLocations = async (query: string, isStart: boolean) => {
    if (!query || query.length < 2) return

    if (isStart) {
      setIsLoadingStart(true)
    } else {
      setIsLoadingEnd(true)
    }

    try {
      // Add Gujarat, India to the query to focus results
      const searchQuery = `${query}, Gujarat, India`
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
      )
      const data = await response.json()

      const suggestions: LocationSuggestion[] = data.map((item: any) => ({
        name: item.display_name,
        lat: Number.parseFloat(item.lat),
        lon: Number.parseFloat(item.lon),
      }))

      if (isStart) {
        setStartSuggestions(suggestions)
        setShowStartSuggestions(suggestions.length > 0)
        setIsLoadingStart(false)
      } else {
        setEndSuggestions(suggestions)
        setShowEndSuggestions(suggestions.length > 0)
        setIsLoadingEnd(false)
      }
    } catch (error) {
      console.error("Error searching locations:", error)
      toast({
        title: "Search Error",
        description: "Could not fetch location suggestions. Please try again.",
        variant: "destructive",
      })

      if (isStart) {
        setIsLoadingStart(false)
      } else {
        setIsLoadingEnd(false)
      }
    }
  }

  // Handle input changes with debounce
  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setStartPoint(value)

    // Clear previous timeout
    const timeoutId = setTimeout(() => {
      searchLocations(value, true)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEndPoint(value)

    // Clear previous timeout
    const timeoutId = setTimeout(() => {
      searchLocations(value, false)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  // Handle suggestion selection
  const handleSelectStartSuggestion = (suggestion: LocationSuggestion) => {
    setStartPoint(suggestion.name.split(",")[0]) // Use first part of name for display
    setStartCoords([suggestion.lat, suggestion.lon])
    setShowStartSuggestions(false)

    // Add marker for start point
    addMarker([suggestion.lat, suggestion.lon], "start")
  }

  const handleSelectEndSuggestion = (suggestion: LocationSuggestion) => {
    setEndPoint(suggestion.name.split(",")[0]) // Use first part of name for display
    setEndCoords([suggestion.lat, suggestion.lon])
    setShowEndSuggestions(false)

    // Add marker for end point
    addMarker([suggestion.lat, suggestion.lon], "end")
  }

  // Add marker to the map
  const addMarker = async (coords: [number, number], type: "start" | "end") => {
    if (!mapLoaded || !mapInstanceRef.current) return

    try {
      const L = await import("leaflet")

      // Create icon based on type
      const icon = L.divIcon({
        className: "custom-div-icon",
        html: `<div style="background-color: ${
          type === "start" ? "#22c55e" : "#ef4444"
        }; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      // Remove existing marker of the same type
      markersRef.current = markersRef.current.filter((marker) => {
        if (marker.options.markerType === type) {
          mapInstanceRef.current.removeLayer(marker)
          return false
        }
        return true
      })

      // Add new marker
      const marker = L.marker(coords, {
        icon,
        markerType: type,
      }).addTo(mapInstanceRef.current)

      marker.bindPopup(`<strong>${type === "start" ? "Start" : "Destination"} Point</strong>`).openPopup()
      markersRef.current.push(marker)

      // Center map on the marker
      mapInstanceRef.current.setView(coords, 12)
    } catch (error) {
      console.error("Error adding marker:", error)
    }
  }

  // Get user's current location
  const handleUseCurrentLocation = (type: "start" | "end") => {
    setSettingLocation(type)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude]

          // Reverse geocode to get location name
          reverseGeocode(coords, type)

          // Add marker
          addMarker(coords, type)

          // Set coordinates
          if (type === "start") {
            setStartCoords(coords)
          } else {
            setEndCoords(coords)
          }

          setSettingLocation(null)
        },
        (error) => {
          console.error("Geolocation error:", error)
          toast({
            title: "Location Error",
            description: "Could not get your current location. Please check your device settings.",
            variant: "destructive",
          })
          setSettingLocation(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      )
    } else {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      })
      setSettingLocation(null)
    }
  }

  // Reverse geocode coordinates to get location name
  const reverseGeocode = async (coords: [number, number], type: "start" | "end") => {
    try {
      const [lat, lon] = coords
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      )
      const data = await response.json()

      if (data && data.display_name) {
        const locationName = data.display_name.split(",")[0] || "Current Location"

        if (type === "start") {
          setStartPoint(locationName)
        } else {
          setEndPoint(locationName)
        }
      } else {
        const locationName = "Current Location"
        if (type === "start") {
          setStartPoint(locationName)
        } else {
          setEndPoint(locationName)
        }
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error)
      const locationName = "Current Location"
      if (type === "start") {
        setStartPoint(locationName)
      } else {
        setEndPoint(locationName)
      }
    }
  }

  // Calculate and display route
  const calculateRoute = async () => {
    if (!mapLoaded || !mapInstanceRef.current || !routingMachineLoaded) {
      toast({
        title: "Map Not Ready",
        description: "Please wait for the map to fully load before calculating a route.",
        variant: "destructive",
      })
      return
    }

    if (!startCoords || !endCoords) {
      toast({
        title: "Missing Locations",
        description: "Please select both start and end locations.",
        variant: "destructive",
      })
      return
    }

    setIsCalculatingRoute(true)

    try {
      const L = await import("leaflet")
      // @ts-ignore - Leaflet Routing Machine should be available globally
      const LRM = window.L.Routing

      // Clear existing route
      if (routingControlRef.current) {
        mapInstanceRef.current.removeControl(routingControlRef.current)
        routingControlRef.current = null
      }

      // Create waypoints
      const waypoints = [L.latLng(startCoords[0], startCoords[1]), L.latLng(endCoords[0], endCoords[1])]

      // Create routing control
      const routingControl = LRM.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        showAlternatives: true,
        altLineOptions: {
          styles: [
            { color: "black", opacity: 0.15, weight: 9 },
            { color: "white", opacity: 0.8, weight: 6 },
            { color: "blue", opacity: 0.5, weight: 2 },
          ],
        },
        lineOptions: {
          styles: [
            { color: "black", opacity: 0.15, weight: 9 },
            { color: "white", opacity: 0.8, weight: 6 },
            { color: "blue", opacity: 0.5, weight: 2 },
          ],
        },
        createMarker: () => {
          return null // Don't create markers, we already have our own
        },
      }).addTo(mapInstanceRef.current)

      routingControlRef.current = routingControl

      // Fit map to show the route
      routingControl.on("routesfound", (e) => {
        const routes = e.routes
        const summary = routes[0].summary

        // Calculate approximate time in minutes
        const timeInMinutes = Math.round(summary.totalTime / 60)

        // Calculate distance in kilometers
        const distanceInKm = (summary.totalDistance / 1000).toFixed(1)

        toast({
          title: "Route Found",
          description: `Distance: ${distanceInKm} km, Estimated Time: ${timeInMinutes} minutes`,
        })

        setIsCalculatingRoute(false)
      })
    } catch (error) {
      console.error("Error calculating route:", error)
      toast({
        title: "Routing Error",
        description: "Could not calculate a route. Please try again.",
        variant: "destructive",
      })
      setIsCalculatingRoute(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Load Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Load Leaflet JS */}
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin=""
        onLoad={() => setLeafletLoaded(true)}
      />

      {/* Load Leaflet Routing Machine */}
      <Script
        src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"
        onLoad={() => setRoutingMachineLoaded(true)}
      />

      <Card className="p-4">
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Navigation</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-point">Start Point</Label>
              <div className="relative">
                <div className="flex">
                  <div className="relative flex-1">
                    <Input
                      id="start-point"
                      placeholder="Enter starting location"
                      value={startPoint}
                      onChange={handleStartInputChange}
                      onFocus={() => setShowStartSuggestions(startSuggestions.length > 0)}
                      className="pl-9"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    {isLoadingStart && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2"
                    onClick={() => handleUseCurrentLocation("start")}
                    disabled={settingLocation === "start"}
                  >
                    {settingLocation === "start" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-1" />
                    )}
                    GPS
                  </Button>
                </div>

                {/* Autocomplete suggestions */}
                {showStartSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {startSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => handleSelectStartSuggestion(suggestion)}
                      >
                        <Search className="h-4 w-4 mr-2 text-gray-400" />
                        <div className="truncate">
                          {suggestion.name.split(",")[0]}
                          <span className="text-gray-400 text-xs ml-1">
                            {suggestion.name.split(",").slice(1, 3).join(",")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-point">End Point</Label>
              <div className="relative">
                <div className="flex">
                  <div className="relative flex-1">
                    <Input
                      id="end-point"
                      placeholder="Enter destination"
                      value={endPoint}
                      onChange={handleEndInputChange}
                      onFocus={() => setShowEndSuggestions(endSuggestions.length > 0)}
                      className="pl-9"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    {isLoadingEnd && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2"
                    onClick={() => handleUseCurrentLocation("end")}
                    disabled={settingLocation === "end"}
                  >
                    {settingLocation === "end" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-1" />
                    )}
                    GPS
                  </Button>
                </div>

                {/* Autocomplete suggestions */}
                {showEndSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {endSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => handleSelectEndSuggestion(suggestion)}
                      >
                        <Search className="h-4 w-4 mr-2 text-gray-400" />
                        <div className="truncate">
                          {suggestion.name.split(",")[0]}
                          <span className="text-gray-400 text-xs ml-1">
                            {suggestion.name.split(",").slice(1, 3).join(",")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            className="w-full md:w-auto"
            onClick={calculateRoute}
            disabled={isCalculatingRoute || !startCoords || !endCoords || !routingMachineLoaded}
          >
            {isCalculatingRoute ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculating Route...
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Start Navigation
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="relative overflow-hidden" style={{ height: "500px" }}>
        <div ref={mapRef} className="h-full w-full" />
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p>Loading map...</p>
          </div>
        )}
      </Card>
    </div>
  )
}
