"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import Fuse from "fuse.js"
import type { SpeedBreaker } from "@/lib/data-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Navigation, Bell, BellOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Add this type for TypeScript
type LeafletType = any

// Fix Leaflet icon issues
const fixLeafletIcon = (L: LeafletType) => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  })
}

// Update the createSpeedBreakerIcon function to accept L as a parameter
const createSpeedBreakerIcon = (L: LeafletType, severity?: string) => {
  let color = "#3388ff" // default blue

  if (severity === "low")
    color = "#4ade80" // green
  else if (severity === "medium")
    color = "#facc15" // yellow
  else if (severity === "high") color = "#ef4444" // red

  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

// Haversine formula to calculate distance between two points
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

interface InteractiveMapProps {
  speedBreakers: SpeedBreaker[]
  height?: string
  showNavigation?: boolean
  onLocationSelect?: (lat: number, lng: number) => void
  selectedLocation?: [number, number] | null
  clickable?: boolean
}

export default function InteractiveMap({
  speedBreakers,
  height = "500px",
  showNavigation = false,
  onLocationSelect,
  selectedLocation,
  clickable = false,
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<LeafletType | null>(null)
  const routingControl = useRef<any>(null)
  const markersRef = useRef<LeafletType[]>([])
  const watchPositionId = useRef<number | null>(null)
  const [startPoint, setStartPoint] = useState("")
  const [endPoint, setEndPoint] = useState("")
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [startSuggestions, setStartSuggestions] = useState<string[]>([])
  const [endSuggestions, setEndSuggestions] = useState<string[]>([])
  const [showStartSuggestions, setShowStartSuggestions] = useState(false)
  const [showEndSuggestions, setShowEndSuggestions] = useState(false)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [nearbyHazards, setNearbyHazards] = useState<SpeedBreaker[]>([])
  const [lastAlertTime, setLastAlertTime] = useState<Record<string, number>>({})
  const { toast } = useToast()

  // Create a Fuse.js instance for fuzzy search
  const fuseRef = useRef<Fuse<string> | null>(null)

  // Clear all existing markers
  const clearMarkers = () => {
    if (leafletMap.current) {
      markersRef.current.forEach((marker) => {
        leafletMap.current?.removeLayer(marker)
      })
      markersRef.current = []
    }
  }

  // Check for nearby hazards
  const checkNearbyHazards = useCallback(
    (position: GeolocationPosition) => {
      if (!alertsEnabled) return

      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const alertDistance = 50 // meters
      const currentTime = Date.now()
      const alertCooldown = 30000 // 30 seconds

      const nearby = speedBreakers.filter((breaker) => {
        const distance = getDistanceFromLatLonInMeters(lat, lng, breaker.latitude, breaker.longitude)

        // Only alert if we haven't alerted for this hazard recently
        const canAlert = !lastAlertTime[breaker.id] || currentTime - lastAlertTime[breaker.id] > alertCooldown

        return distance <= alertDistance && canAlert
      })

      if (nearby.length > 0) {
        // Update last alert time for these hazards
        const newLastAlertTime = { ...lastAlertTime }
        nearby.forEach((hazard) => {
          newLastAlertTime[hazard.id] = currentTime
        })
        setLastAlertTime(newLastAlertTime)

        // Play alert sound
        const audio = new Audio("/alert.mp3")
        audio.play().catch((e) => console.error("Could not play alert sound:", e))

        // Set nearby hazards for display
        setNearbyHazards(nearby)
      } else {
        setNearbyHazards([])
      }
    },
    [alertsEnabled, lastAlertTime, speedBreakers],
  )

  // Update the useEffect for map initialization to use dynamic imports
  useEffect(() => {
    // Dynamically import Leaflet
    const loadLeaflet = async () => {
      try {
        // Import CSS
        await import("leaflet/dist/leaflet.css")

        // Import Leaflet
        const L = (await import("leaflet")).default

        // Fix icon issues
        fixLeafletIcon(L)

        if (!mapRef.current || leafletMap.current) return

        // Initialize map
        const map = L.map(mapRef.current).setView([40.7128, -74.006], 13)
        leafletMap.current = map

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        // Try to get user's location
        map.locate({ setView: true, maxZoom: 16 })
        map.on("locationfound", (e) => {
          setUserLocation([e.latlng.lat, e.latlng.lng])

          // Add a marker for user's location
          const userMarker = L.marker(e.latlng, {
            icon: L.divIcon({
              className: "custom-div-icon",
              html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          })
            .addTo(map)
            .bindPopup("You are here")
            .openPopup()

          markersRef.current.push(userMarker)

          // Start watching position for real-time alerts
          if (navigator.geolocation) {
            watchPositionId.current = navigator.geolocation.watchPosition(
              checkNearbyHazards,
              (error) => {
                console.error("Error watching position:", error)
              },
              { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
            )
          }
        })

        // Enable clicking on the map to set location
        if (clickable) {
          map.on("click", (e) => {
            if (onLocationSelect) {
              onLocationSelect(e.latlng.lat, e.latlng.lng)
            }
          })
        }
      } catch (error) {
        console.error("Error loading Leaflet:", error)
      }
    }

    loadLeaflet()

    // Clean up on unmount
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }

      // Clear the watch position
      if (watchPositionId.current !== null) {
        navigator.geolocation.clearWatch(watchPositionId.current)
      }
    }
  }, [clickable, onLocationSelect, checkNearbyHazards])

  // Update the useEffect for adding markers to use dynamic imports
  useEffect(() => {
    if (!leafletMap.current || !speedBreakers.length) return

    const addMarkers = async () => {
      try {
        const L = (await import("leaflet")).default

        // Clear existing markers first
        clearMarkers()

        // Add markers for speed breakers
        speedBreakers.forEach((breaker) => {
          const marker = L.marker([breaker.latitude, breaker.longitude], {
            icon: createSpeedBreakerIcon(L, breaker.severity),
          }).addTo(leafletMap.current!)

          marker.bindPopup(`
          <strong>${breaker.location}</strong><br>
          ${breaker.description}<br>
          <small>Severity: ${breaker.severity || "Not specified"}</small>
        `)

          markersRef.current.push(marker)
        })

        // If we have speed breakers, fit the map to show all of them
        if (speedBreakers.length > 0) {
          const bounds = L.latLngBounds(speedBreakers.map((b) => [b.latitude, b.longitude]))
          leafletMap.current.fitBounds(bounds, { padding: [50, 50] })
        }

        // Generate suggestions for navigation
        const locationSuggestions = speedBreakers.map((b) => b.location)
        setStartSuggestions(["My Location", ...locationSuggestions])
        setEndSuggestions(locationSuggestions)

        // Initialize Fuse.js for fuzzy search
        fuseRef.current = new Fuse(locationSuggestions, {
          includeScore: true,
          threshold: 0.3,
        })
      } catch (error) {
        console.error("Error adding markers:", error)
      }
    }

    addMarkers()
  }, [speedBreakers])

  // Add a marker for the selected location
  useEffect(() => {
    if (!leafletMap.current || !selectedLocation) return

    const updateSelectedLocation = async () => {
      try {
        const L = (await import("leaflet")).default

        // Clear any existing selected location markers
        const existingMarkers = document.querySelectorAll(".selected-location-marker")
        existingMarkers.forEach((marker) => marker.remove())

        // Add a new marker for the selected location
        const marker = L.marker(selectedLocation, {
          icon: L.divIcon({
            className: "selected-location-marker",
            html: `<div style="background-color: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(leafletMap.current)

        marker.bindPopup("Selected Location").openPopup()
        markersRef.current.push(marker)

        // Center the map on the selected location
        leafletMap.current.setView(selectedLocation, 16)
      } catch (error) {
        console.error("Error updating selected location:", error)
      }
    }

    updateSelectedLocation()
  }, [selectedLocation])

  // Update the calculateRoute function to use dynamic imports
  const calculateRoute = async () => {
    if (!leafletMap.current) return

    setIsCalculatingRoute(true)

    try {
      const L = (await import("leaflet")).default

      // Try to import leaflet-routing-machine
      try {
        await import("leaflet-routing-machine")
      } catch (error) {
        console.error("Error loading leaflet-routing-machine:", error)
        setIsCalculatingRoute(false)
        toast({
          title: "Routing Error",
          description: "Could not load routing functionality. Please try again later.",
          variant: "destructive",
        })
        return
      }

      // Clear existing route if any
      if (routingControl.current) {
        leafletMap.current.removeControl(routingControl.current)
        routingControl.current = null
      }

      // Parse coordinates from input
      let start: [number, number] | null = null
      let end: [number, number] | null = null

      // Use user's location if "my location" is entered
      if (startPoint.toLowerCase() === "my location" && userLocation) {
        start = userLocation
      } else {
        // Check if it's a speed breaker name
        const matchingStartBreaker = speedBreakers.find((b) => b.location.toLowerCase() === startPoint.toLowerCase())

        if (matchingStartBreaker) {
          start = [matchingStartBreaker.latitude, matchingStartBreaker.longitude]
        } else {
          // Try to parse coordinates like "40.7128, -74.006"
          const startCoords = startPoint.split(",").map((s) => Number.parseFloat(s.trim()))
          if (startCoords.length === 2 && !isNaN(startCoords[0]) && !isNaN(startCoords[1])) {
            start = [startCoords[0], startCoords[1]]
          }
        }
      }

      // For end point, check if it's a speed breaker name
      const matchingEndBreaker = speedBreakers.find((b) => b.location.toLowerCase() === endPoint.toLowerCase())

      if (matchingEndBreaker) {
        end = [matchingEndBreaker.latitude, matchingEndBreaker.longitude]
      } else {
        // Try to parse coordinates
        const endCoords = endPoint.split(",").map((s) => Number.parseFloat(s.trim()))
        if (endCoords.length === 2 && !isNaN(endCoords[0]) && !isNaN(endCoords[1])) {
          end = [endCoords[0], endCoords[1]]
        }
      }

      // Create routing if we have both points
      if (start && end) {
        // Create a simple route with a polyline instead of using the routing machine
        const routePoints = [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])]

        // Add start and end markers
        const startMarker = L.marker(routePoints[0], {
          icon: L.divIcon({
            className: "start-marker",
            html: `<div style="background-color: #22c55e; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(leafletMap.current)

        const endMarker = L.marker(routePoints[1], {
          icon: L.divIcon({
            className: "end-marker",
            html: `<div style="background-color: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(leafletMap.current)

        markersRef.current.push(startMarker, endMarker)

        // Create a polyline for the route
        const routeLine = L.polyline(routePoints, {
          color: "#3388ff",
          weight: 6,
          opacity: 0.7,
        }).addTo(leafletMap.current)

        // Fit the map to show the route
        const bounds = L.latLngBounds(routePoints)
        leafletMap.current.fitBounds(bounds, { padding: [50, 50] })

        // Store the route line for later removal
        routingControl.current = routeLine

        // Calculate approximate distance and time
        const distance = getDistanceFromLatLonInMeters(start[0], start[1], end[0], end[1]) / 1000 // km
        const time = Math.round(distance * 3) // Rough estimate: 3 minutes per km

        setIsCalculatingRoute(false)
        toast({
          title: "Route Found",
          description: `Distance: ${distance.toFixed(1)} km, Estimated Time: ${time} minutes`,
        })
      } else {
        setIsCalculatingRoute(false)
        toast({
          title: "Invalid Locations",
          description: "Please enter valid start and end locations",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error calculating route:", error)
      setIsCalculatingRoute(false)
      toast({
        title: "Routing Error",
        description: "Could not calculate a route. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setStartPoint(value)
    setShowStartSuggestions(value.length > 0)
  }

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEndPoint(value)
    setShowEndSuggestions(value.length > 0)
  }

  const handleStartSuggestionClick = (suggestion: string) => {
    setStartPoint(suggestion)
    setShowStartSuggestions(false)
  }

  const handleEndSuggestionClick = (suggestion: string) => {
    setEndPoint(suggestion)
    setShowEndSuggestions(false)
  }

  const toggleAlerts = () => {
    setAlertsEnabled(!alertsEnabled)
    if (!alertsEnabled) {
      toast({
        title: "Alerts Enabled",
        description: "You will now receive alerts when near hazards",
      })
    } else {
      toast({
        title: "Alerts Disabled",
        description: "You will no longer receive alerts",
      })
      setNearbyHazards([])
    }
  }

  // Get filtered suggestions using Fuse.js
  const getFilteredSuggestions = (input: string, suggestions: string[]) => {
    if (!input || input.length < 2) return suggestions

    if (input.toLowerCase() === "my") return ["My Location"]

    if (fuseRef.current) {
      const results = fuseRef.current.search(input)
      return results.map((result) => result.item)
    }

    return suggestions.filter((s) => s.toLowerCase().includes(input.toLowerCase()))
  }

  return (
    <div className="space-y-4">
      {nearbyHazards.length > 0 && (
        <Alert variant="destructive" className="animate-pulse">
          <AlertTitle className="flex items-center">
            <Bell className="h-4 w-4 mr-2" /> Hazard Alert!
          </AlertTitle>
          <AlertDescription>
            You are within 50 meters of {nearbyHazards.length > 1 ? `${nearbyHazards.length} hazards` : "a hazard"}:
            <ul className="mt-2 list-disc pl-5">
              {nearbyHazards.map((hazard) => (
                <li key={hazard.id}>
                  {hazard.location} - {hazard.severity || "Unknown"} severity
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {showNavigation && (
        <div className="space-y-4 p-4 bg-white rounded-md shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Navigation</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAlerts}
              className={alertsEnabled ? "text-green-600" : "text-gray-400"}
            >
              {alertsEnabled ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
              {alertsEnabled ? "Alerts On" : "Alerts Off"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="start-point">Start Point</Label>
              <div className="flex gap-2">
                <div className="relative w-full">
                  <Input
                    id="start-point"
                    placeholder="Location name or coordinates"
                    value={startPoint}
                    onChange={handleStartInputChange}
                    onFocus={() => setShowStartSuggestions(startPoint.length > 0)}
                    onBlur={() => setTimeout(() => setShowStartSuggestions(false), 200)}
                  />
                  {showStartSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {getFilteredSuggestions(startPoint, startSuggestions).map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleStartSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {userLocation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setStartPoint("My Location")}
                    title="Use my location"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="end-point">End Point</Label>
              <div className="relative w-full">
                <Input
                  id="end-point"
                  placeholder="Location name or coordinates"
                  value={endPoint}
                  onChange={handleEndInputChange}
                  onFocus={() => setShowEndSuggestions(endPoint.length > 0)}
                  onBlur={() => setTimeout(() => setShowEndSuggestions(false), 200)}
                />
                {showEndSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {getFilteredSuggestions(endPoint, endSuggestions).map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleEndSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button onClick={calculateRoute} className="w-full md:w-auto" disabled={isCalculatingRoute}>
            <Navigation className="mr-2 h-4 w-4" />
            {isCalculatingRoute ? "Calculating Route..." : "Calculate Route"}
          </Button>
        </div>
      )}
      <div ref={mapRef} style={{ height, width: "100%" }} className="rounded-md overflow-hidden" />
    </div>
  )
}
