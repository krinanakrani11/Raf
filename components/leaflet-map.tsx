"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import type { SpeedBreaker } from "@/lib/data-service"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Navigation, Bell, BellOff, Search, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Script from "next/script"

interface LeafletMapProps {
  speedBreakers: SpeedBreaker[]
  height?: string
  showNavigation?: boolean
  onLocationSelect?: (lat: number, lng: number) => void
  selectedLocation?: [number, number] | null
  clickable?: boolean
}

// Navsari Abrama coordinates
const NAVSARI_ABRAMA_LAT = 20.9467
const NAVSARI_ABRAMA_LNG = 72.952

// Central India coordinates (for default view)
const INDIA_CENTER_LAT = 22.2587
const INDIA_CENTER_LNG = 78.6719
const INDIA_DEFAULT_ZOOM = 5

export default function LeafletMap({
  speedBreakers,
  height = "500px",
  showNavigation = false,
  onLocationSelect,
  selectedLocation,
  clickable = false,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [geocoderLoaded, setGeocoderLoaded] = useState(false)
  const [startPoint, setStartPoint] = useState("")
  const [endPoint, setEndPoint] = useState("")
  const [startSuggestions, setStartSuggestions] = useState<string[]>([])
  const [endSuggestions, setEndSuggestions] = useState<string[]>([])
  const [showStartSuggestions, setShowStartSuggestions] = useState(false)
  const [showEndSuggestions, setShowEndSuggestions] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(0)
  const [nearbyAlert, setNearbyAlert] = useState<SpeedBreaker | null>(null)
  const [routePoints, setRoutePoints] = useState<string[]>([])
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const { toast } = useToast()
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const routeLayerRef = useRef<any[]>([])
  const navigationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [settingLocation, setSettingLocation] = useState<"start" | "end" | null>(null)
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][]>([])
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const geocoderControlRef = useRef<any>(null)
  const startSearchTimeout = useRef<NodeJS.Timeout | null>(null)
  const endSearchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Mock place suggestions for demo
  const placeSuggestions = [
    "Navsari Railway Station",
    "Navsari Bus Station",
    "Abrama Road, Navsari",
    "Dudhia Talav, Navsari",
    "Navsari Agricultural University",
    "Sayaji Library, Navsari",
    "Navsari College",
    "Lunsikui Road, Navsari",
    "Navsari Market",
    "Abrama Village, Navsari",
    "Jalalpore, Navsari",
    "Mahuva Road, Navsari",
    "Eru Char Rasta, Navsari",
    "Vijalpore, Navsari",
    "Gandevi Road, Navsari",
  ]

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

        // Create map centered on India instead of just Navsari
        const map = L.map(mapRef.current).setView([INDIA_CENTER_LAT, INDIA_CENTER_LNG], INDIA_DEFAULT_ZOOM)
        mapInstanceRef.current = map

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        // Try to get user's location
        map.locate({ setView: true, maxZoom: 13 })
        map.on("locationfound", (e) => {
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

          userMarkerRef.current = userMarker
          
          // Try to get location name for the user's current position
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=18&addressdetails=1`)
            .then(response => response.json())
            .then(data => {
              if (data && data.display_name) {
                userMarker.bindPopup(`Your location: ${data.display_name}`).openPopup();
              }
            })
            .catch(error => console.error("Error getting location name:", error));
        })
        
        map.on("locationerror", (e) => {
          console.error("Location error:", e.message);
          toast({
            title: "Location Error",
            description: "Could not determine your location. Using default view of India.",
            variant: "default",
          });
        });

        // Enable clicking on the map to set location
        if (clickable && onLocationSelect) {
          map.on("click", (e) => {
            onLocationSelect(e.latlng.lat, e.latlng.lng)
          })
        }

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
  }, [leafletLoaded, clickable, onLocationSelect, toast])

  // Add Geocoder control when both Leaflet and Geocoder are loaded
  useEffect(() => {
    if (!mapLoaded || !geocoderLoaded || !mapInstanceRef.current || geocoderControlRef.current) return

    const initGeocoder = async () => {
      try {
        // @ts-ignore - Leaflet Control Geocoder should be available globally
        const geocoder = window.L.Control.Geocoder.nominatim({
          geocodingQueryParams: {
            countrycodes: "in", // Limit to India
            viewbox: "68.1,8.0,97.4,37.6", // Bounding box for India
            bounded: 1,
          },
        })

        // @ts-ignore
        const control = window.L.Control.geocoder({
          geocoder: geocoder,
          defaultMarkGeocode: false,
          placeholder: "Search for places...",
          errorMessage: "Nothing found.",
          suggestMinLength: 3,
          suggestTimeout: 250,
          queryMinLength: 1,
        }).addTo(mapInstanceRef.current)

        control.on("markgeocode", (e) => {
          const { center, name } = e.geocode

          // Create a marker at the found location
          const marker = window.L.marker(center, {
            icon: window.L.divIcon({
              className: "custom-div-icon",
              html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          }).addTo(mapInstanceRef.current)

          marker.bindPopup(name).openPopup()

          // Zoom to the location
          mapInstanceRef.current.setView(center, 15)

          // If we're in location selection mode, call the handler
          if (clickable && onLocationSelect) {
            onLocationSelect(center.lat, center.lng)
          }
        })

        geocoderControlRef.current = control
      } catch (error) {
        console.error("Error initializing geocoder:", error)
        toast({
          title: "Geocoder Error",
          description: "Could not initialize the address search. Please try again later.",
          variant: "destructive",
        })
      }
    }

    initGeocoder()
  }, [mapLoaded, geocoderLoaded, clickable, onLocationSelect, toast])

  // Add markers for speed breakers
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !speedBreakers.length) return

    const addMarkers = async () => {
      try {
        const L = await import("leaflet")

        // Clear existing markers
        markersRef.current.forEach((marker) => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(marker)
          }
        })
        markersRef.current = []

        // Add markers for speed breakers
        speedBreakers.forEach((breaker) => {
          // Skip if coordinates are invalid
          if (isNaN(breaker.latitude) || isNaN(breaker.longitude)) return

          // Determine marker color based on severity
          let color = "#3388ff" // default blue
          if (breaker.severity === "low")
            color = "#4ade80" // green
          else if (breaker.severity === "medium")
            color = "#facc15" // yellow
          else if (breaker.severity === "high") color = "#ef4444" // red

          const marker = L.marker([breaker.latitude, breaker.longitude], {
            icon: L.divIcon({
              className: "custom-div-icon",
              html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          }).addTo(mapInstanceRef.current)

          marker.bindPopup(`
            <strong>${breaker.location}</strong><br>
            ${breaker.description}<br>
            <small>Severity: ${breaker.severity || "Not specified"}</small>
          `)

          markersRef.current.push(marker)
        })

        // If we have speed breakers, fit the map to show all of them
        if (speedBreakers.length > 0) {
          const bounds = L.latLngBounds(
            speedBreakers
              .filter((b) => !isNaN(b.latitude) && !isNaN(b.longitude))
              .map((b) => [b.latitude, b.longitude]),
          )
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
          }
        }
      } catch (error) {
        console.error("Error adding markers:", error)
      }
    }

    addMarkers()
  }, [mapLoaded, speedBreakers])

  // Add marker for the selected location
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !selectedLocation) return

    const updateSelectedLocation = async () => {
      try {
        const L = await import("leaflet")

        // Remove previous selected location marker if exists
        if (userMarkerRef.current) {
          mapInstanceRef.current.removeLayer(userMarkerRef.current)
          userMarkerRef.current = null
        }

        // Add a new marker for the selected location
        const marker = L.marker(selectedLocation, {
          icon: L.divIcon({
            className: "selected-location-marker",
            html: `<div style="background-color: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(mapInstanceRef.current)

        marker.bindPopup("Selected Location").openPopup()
        userMarkerRef.current = marker

        // Center the map on the selected location
        mapInstanceRef.current.setView(selectedLocation, 16)
      } catch (error) {
        console.error("Error updating selected location:", error)
      }
    }

    updateSelectedLocation()
  }, [mapLoaded, selectedLocation])

  // Function to play alert sound
  const playAlertSound = useCallback(() => {
    try {
      // Create a new Audio element each time
      const audio = new Audio()
      audio.src = "/alert.mp3"

      // Play the sound
      const playPromise = audio.play()

      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.error("Could not play alert sound:", e)
        })
      }
    } catch (error) {
      console.error("Error playing alert sound:", error)
    }
  }, [])

  // Filter suggestions based on input using Nominatim geocoding service
  const filterSuggestions = async (input: string) => {
    if (!input || input.length < 3) return []

    try {
      // Use Nominatim API to get location suggestions for all of India
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          input
        )}&countrycodes=in&limit=5`
      )
      
      if (!response.ok) {
        throw new Error('Geocoding request failed')
      }
      
      const data = await response.json()
      
      // Extract place names from response
      return data.map((item: any) => item.display_name)
    } catch (error) {
      console.error("Error fetching location suggestions:", error)
      return []
    }
  }

  // Handle input changes with debounce for API calls
  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setStartPoint(value)

    // Debounce API calls to avoid too many requests
    if (startSearchTimeout.current) {
      clearTimeout(startSearchTimeout.current)
    }
    startSearchTimeout.current = setTimeout(async () => {
      // Update suggestions
      const filtered = await filterSuggestions(value)
      setStartSuggestions(filtered)
      setShowStartSuggestions(filtered.length > 0)
    }, 300)
  }

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEndPoint(value)

    // Debounce API calls to avoid too many requests
    if (endSearchTimeout.current) {
      clearTimeout(endSearchTimeout.current)
    }
    endSearchTimeout.current = setTimeout(async () => {
      // Update suggestions
      const filtered = await filterSuggestions(value)
      setEndSuggestions(filtered)
      setShowEndSuggestions(filtered.length > 0)
    }, 300)
  }

  // Handle suggestion selection
  const handleSelectStartSuggestion = (suggestion: string) => {
    setStartPoint(suggestion)
    setShowStartSuggestions(false)
  }

  const handleSelectEndSuggestion = (suggestion: string) => {
    setEndPoint(suggestion)
    setShowEndSuggestions(false)
  }

  // Generate waypoints for a more realistic route
  const generateWaypoints = (start: [number, number], end: [number, number], numPoints = 8): [number, number][] => {
    const waypoints: [number, number][] = [start]

    // Calculate the direct distance and angle between start and end
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    // Generate intermediate points with some randomness
    for (let i = 1; i <= numPoints; i++) {
      const ratio = i / (numPoints + 1)

      // Add some randomness to make the route look more natural
      const perpDistance = (Math.random() - 0.5) * 0.005 * distance
      const alongDistance = ratio * distance

      const newLat = start[0] + alongDistance * Math.cos(angle) + perpDistance * Math.sin(angle)
      const newLng = start[1] + alongDistance * Math.sin(angle) - perpDistance * Math.cos(angle)

      waypoints.push([newLat, newLng])
    }

    waypoints.push(end)
    return waypoints
  }

  // Calculate route between two points
  const calculateRoute = async () => {
    if (!mapLoaded || !mapInstanceRef.current) return

    if (!startPoint || !endPoint) {
      toast({
        title: "Missing Information",
        description: "Please enter both start and end points",
        variant: "destructive",
      })
      return
    }

    setIsCalculatingRoute(true)

    try {
      const L = await import("leaflet")

      // Clear existing route
      routeLayerRef.current.forEach((layer) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(layer)
        }
      })
      routeLayerRef.current = []

      // Geocode start and end locations using Nominatim
      const geocodeLocation = async (query: string): Promise<[number, number] | null> => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}&countrycodes=in&limit=1`
          )
          
          if (!response.ok) {
            throw new Error('Geocoding request failed')
          }
          
          const data = await response.json()
          
          if (data.length === 0) {
            return null
          }
          
          return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
        } catch (error) {
          console.error(`Error geocoding ${query}:`, error)
          return null
        }
      }
      
      // Get coordinates for start and end points
      const startCoords = await geocodeLocation(startPoint)
      const endCoords = await geocodeLocation(endPoint)
      
      if (!startCoords || !endCoords) {
        toast({
          title: "Geocoding Error",
          description: "Could not find coordinates for one or both locations",
          variant: "destructive",
        })
        setIsCalculatingRoute(false)
        return
      }

      // Generate waypoints for a more realistic route
      const waypoints = generateWaypoints(startCoords, endCoords, 12); // Use more waypoints for better resolution
      setRouteWaypoints(waypoints);

      // Find speed breakers near our route
      const nearbyBreakers = findSpeedBreakersNearRoute(waypoints);
      
      // Generate simulated route points for the UI including breaker warnings
      const simulatedRoute = generateSimulatedRouteWithBreakers(waypoints, nearbyBreakers);
      setRoutePoints(simulatedRoute);

      // Add start marker
      const startMarker = L.marker(startCoords, {
        icon: L.divIcon({
          className: "start-marker",
          html: `<div style="background-color: #22c55e; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(mapInstanceRef.current)

      startMarker.bindPopup(`<strong>Start: ${startPoint}</strong>`).openPopup()
      routeLayerRef.current.push(startMarker)

      // Add end marker
      const endMarker = L.marker(endCoords, {
        icon: L.divIcon({
          className: "end-marker",
          html: `<div style="background-color: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(mapInstanceRef.current)

      endMarker.bindPopup(`<strong>Destination: ${endPoint}</strong>`)
      routeLayerRef.current.push(endMarker)

      // Highlight speed breakers along the route with special markers
      nearbyBreakers.forEach(breaker => {
        const breakerMarker = L.marker([breaker.latitude, breaker.longitude], {
          icon: L.divIcon({
            className: "speed-breaker-marker",
            html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2px solid yellow; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        }).addTo(mapInstanceRef.current);

        breakerMarker.bindPopup(`<strong>Speed Breaker Alert!</strong><br>${breaker.location}<br>Severity: ${breaker.severity || "Not specified"}`);
        routeLayerRef.current.push(breakerMarker);
      });

      // Add waypoint markers (smaller)
      waypoints.slice(1, -1).forEach((waypoint, index) => {
        if (index % 2 === 0) {
          // Only add markers for some waypoints
          const waypointMarker = L.marker(waypoint, {
            icon: L.divIcon({
              className: "waypoint-marker",
              html: `<div style="background-color: #3b82f6; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>`,
              iconSize: [8, 8],
              iconAnchor: [4, 4],
            }),
          }).addTo(mapInstanceRef.current)

          routeLayerRef.current.push(waypointMarker)
        }
      })

      // Create a polyline for the main route (thicker, blue)
      const mainRoute = L.polyline(waypoints, {
        color: "#3b82f6", // Blue
        weight: 6,
        opacity: 0.8,
        lineJoin: "round",
      }).addTo(mapInstanceRef.current)

      routeLayerRef.current.push(mainRoute)

      // Create a second polyline for the route border (white outline)
      const routeBorder = L.polyline(waypoints, {
        color: "white",
        weight: 10,
        opacity: 0.5,
        lineJoin: "round",
        dashArray: "0, 10, 10, 0",
      }).addTo(mapInstanceRef.current)

      // Add the border below the main route
      routeBorder.bringToBack()
      routeLayerRef.current.push(routeBorder)

      // Fit the map to show the route
      const bounds = L.latLngBounds(waypoints)
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })

      // Start navigation simulation
      setCurrentPosition(0)
      setIsNavigating(true)

      // Start moving along the route
      if (navigationIntervalRef.current) {
        clearInterval(navigationIntervalRef.current)
      }

      navigationIntervalRef.current = setInterval(() => {
        setCurrentPosition((prev) => {
          const newPosition = prev + 1

          // Check if we're approaching a speed breaker (within 100m)
          const nearbyBreaker = checkForNearbyBreakers(newPosition, simulatedRoute)
          setNearbyAlert(nearbyBreaker)

          if (nearbyBreaker && alertsEnabled) {
            playAlertSound()
          }

          // End navigation when we reach the end
          if (newPosition >= simulatedRoute.length - 1) {
            if (navigationIntervalRef.current) {
              clearInterval(navigationIntervalRef.current)
            }
            setTimeout(() => {
              setIsNavigating(false)
              setNearbyAlert(null)
            }, 2000)
          }

          return newPosition < simulatedRoute.length ? newPosition : 0
        })
      }, 1000) // Move every second

      toast({
        title: "Route Calculated",
        description: "Navigation started. You will receive alerts for nearby speed breakers.",
      })
    } catch (error) {
      console.error("Error calculating route:", error)
      toast({
        title: "Routing Error",
        description: "Could not calculate a route. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCalculatingRoute(false)
    }
  }

  // Find speed breakers that are near the route
  const findSpeedBreakersNearRoute = (waypoints: [number, number][]): SpeedBreaker[] => {
    if (!waypoints.length || !speedBreakers.length) return [];
    
    const routeBreakers: SpeedBreaker[] = [];
    const maxDistance = 0.2; // 200 meters in km
    
    // Check each speed breaker against each segment of the route
    for (const breaker of speedBreakers) {
      // Skip invalid coordinates
      if (isNaN(breaker.latitude) || isNaN(breaker.longitude)) continue;
      
      // Check each segment of the route
      for (let i = 0; i < waypoints.length - 1; i++) {
        const startPoint = waypoints[i];
        const endPoint = waypoints[i + 1];
        
        const distance = distanceFromPointToSegment(
          [breaker.latitude, breaker.longitude],
          startPoint,
          endPoint
        );
        
        // If it's close enough to the route, add it to our list
        if (distance < maxDistance) {
          routeBreakers.push(breaker);
          break; // Don't add the same breaker multiple times
        }
      }
    }
    
    return routeBreakers;
  }

  // Generate simulated route with breaker warnings
  const generateSimulatedRouteWithBreakers = (
    waypoints: [number, number][],
    nearbyBreakers: SpeedBreaker[]
  ): string[] => {
    if (!waypoints.length) return Array(20).fill("");
    
    // Create a route with 20 points
    const totalPoints = 20;
    const result: string[] = [];
    
    // Add starting point
    result.push(`Starting at ${startPoint}`);
    
    // For each intermediate point
    for (let i = 1; i < totalPoints - 1; i++) {
      const percentage = i / (totalPoints - 1);
      const waypointIndex = Math.floor(percentage * (waypoints.length - 1));
      const waypoint = waypoints[waypointIndex];
      
      // Check if there's a speed breaker near this waypoint
      let nearestBreakerDistance = Number.MAX_VALUE;
      let nearestBreaker: SpeedBreaker | null = null;
      
      for (const breaker of nearbyBreakers) {
        const distance = haversineDistance(
          [breaker.latitude, breaker.longitude],
          waypoint
        );
        
        if (distance < nearestBreakerDistance) {
          nearestBreakerDistance = distance;
          nearestBreaker = breaker;
        }
      }
      
      // If there's a speed breaker within 200m, mention it
      if (nearestBreaker && nearestBreakerDistance < 0.2) {
        result.push(`Speed breaker ahead: ${nearestBreaker.location}`);
      } else {
        // Otherwise, use a landmark
        const nearestLandmark = findNearestLandmarkToWaypoint(waypoint);
        result.push(`Passing ${nearestLandmark}`);
      }
    }
    
    // Add ending point
    result.push(`Arriving at ${endPoint}`);
    
    return result;
  }

  // Helper function to find nearest landmark to a waypoint
  const findNearestLandmarkToWaypoint = (waypoint: [number, number]): string => {
    // For demo purposes, we'll create a more varied set of landmarks across India
    const landmarks = [
      "Main Highway",
      "City Center",
      "Commercial District", 
      "Residential Area",
      "University Road",
      "Central Park",
      "Hospital Junction",
      "Metro Station",
      "Ring Road",
      "Industrial Zone",
      "Tech Park",
      "Business District",
    ];
    
    // Pick a landmark based on waypoint coordinates to ensure consistency
    const waypointHash = (waypoint[0] * 1000 + waypoint[1] * 1000) % landmarks.length;
    return landmarks[Math.abs(Math.floor(waypointHash))];
  }

  // Check if we're approaching a speed breaker based on route coordinates
  const checkForNearbyBreakers = (position: number, route: string[]): SpeedBreaker | null => {
    if (!routeWaypoints.length || !speedBreakers.length) return null;
    
    // Calculate position along the route based on percentage
    const totalPoints = route.length;
    const percentage = position / (totalPoints - 1);
    const waypointIndex = Math.floor(percentage * (routeWaypoints.length - 1));
    
    // Get current waypoint and next waypoint (our current segment)
    const currentWaypoint = routeWaypoints[waypointIndex];
    const nextWaypointIndex = Math.min(waypointIndex + 1, routeWaypoints.length - 1);
    const nextWaypoint = routeWaypoints[nextWaypointIndex];
    
    // Check if any speed breaker is near this segment of the route
    for (const breaker of speedBreakers) {
      // Skip if coordinates are invalid
      if (isNaN(breaker.latitude) || isNaN(breaker.longitude)) continue;
      
      // Calculate distance from speed breaker to current route segment
      const distance = distanceFromPointToSegment(
        [breaker.latitude, breaker.longitude],
        currentWaypoint,
        nextWaypoint
      );
      
      // If the speed breaker is within 100 meters of our route segment, alert it
      if (distance < 0.1) { // 0.1 km = 100 meters
        return breaker;
      }
    }

    return null;
  }
  
  // Calculate distance from a point to a line segment (in km)
  const distanceFromPointToSegment = (
    point: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number]
  ): number => {
    const distToStart = haversineDistance(point, lineStart);
    const distToEnd = haversineDistance(point, lineEnd);
    
    // If the segment is very short, just use the closer of the two endpoints
    const segmentLength = haversineDistance(lineStart, lineEnd);
    if (segmentLength < 0.001) return Math.min(distToStart, distToEnd);
    
    // Project the point onto the line segment
    const dotProduct = (
      (point[0] - lineStart[0]) * (lineEnd[0] - lineStart[0]) +
      (point[1] - lineStart[1]) * (lineEnd[1] - lineStart[1])
    ) / Math.pow(segmentLength, 2);
    
    // If projection is outside the segment, return distance to closest endpoint
    if (dotProduct < 0) return distToStart;
    if (dotProduct > 1) return distToEnd;
    
    // Calculate the projected point
    const proj: [number, number] = [
      lineStart[0] + dotProduct * (lineEnd[0] - lineStart[0]),
      lineStart[1] + dotProduct * (lineEnd[1] - lineStart[1])
    ];
    
    // Return distance from point to projection
    return haversineDistance(point, proj);
  }
  
  // Calculate distance between two points using the Haversine formula (in km)
  const haversineDistance = (point1: [number, number], point2: [number, number]): number => {
    const toRad = (value: number) => value * Math.PI / 180;
    const R = 6371; // Earth's radius in km
    
    const dLat = toRad(point2[0] - point1[0]);
    const dLon = toRad(point2[1] - point1[1]);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(point1[0])) * Math.cos(toRad(point2[0])) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Stop navigation
  const stopNavigation = () => {
    if (navigationIntervalRef.current) {
      clearInterval(navigationIntervalRef.current)
    }
    setIsNavigating(false)
    setNearbyAlert(null)
  }

  // Toggle alerts
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
      setNearbyAlert(null)
    }
  }

  // Get user's current location for navigation
  const handleUseCurrentLocation = useCallback(
    (type: "start" | "end") => {
      setSettingLocation(type)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            
            // Reverse geocode to get the readable address instead of just "My Current Location"
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`)
              .then(response => response.json())
              .then(data => {
                const locationName = data && data.display_name 
                  ? data.display_name 
                  : "My Current Location";
                
                if (type === "start") {
                  setStartPoint(locationName)
                } else {
                  setEndPoint(locationName)
                }
                
                toast({
                  title: "Location Set",
                  description: `${type === "start" ? "Starting" : "Destination"} point set to your current location`,
                })
                setSettingLocation(null)
              })
              .catch(error => {
                console.error("Error getting location name:", error);
                // Fallback to default name if geocoding fails
                const locationName = "My Current Location";
                if (type === "start") {
                  setStartPoint(locationName)
                } else {
                  setEndPoint(locationName)
                }
                
                toast({
                  title: "Location Set",
                  description: `${type === "start" ? "Starting" : "Destination"} point set to your current location`,
                })
                setSettingLocation(null)
              });
          },
          (error) => {
            toast({
              title: "Location Error",
              description: "Could not get your current location. Please check your device settings.",
              variant: "destructive",
            })
            setSettingLocation(null)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
      } else {
        toast({
          title: "Not Supported",
          description: "Geolocation is not supported by your browser",
          variant: "destructive",
        })
        setSettingLocation(null)
      }
    },
    [setStartPoint, setEndPoint, toast],
  )

  return (
    <div className="space-y-4">
      {/* Load Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Load Leaflet Control Geocoder CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css"
        crossOrigin=""
      />

      {/* Load Leaflet JS */}
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin=""
        onLoad={() => setLeafletLoaded(true)}
      />

      {/* Load Leaflet Control Geocoder */}
      <Script
        src="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js"
        onLoad={() => setGeocoderLoaded(true)}
      />

      {/* Hidden audio element for alert sound */}
      <audio id="alert-sound" src="/alert.mp3" preload="auto" style={{ display: "none" }} />

      {nearbyAlert && (
        <Alert variant="destructive" className="animate-pulse">
          <AlertTitle className="flex items-center">
            <Bell className="h-4 w-4 mr-2" /> Speed Breaker Alert!
          </AlertTitle>
          <AlertDescription>
            You are approaching a speed breaker in 100 meters: {nearbyAlert.location} (
            {nearbyAlert.severity || "unknown"} severity)
          </AlertDescription>
        </Alert>
      )}

      {showNavigation && (
        <Card className="p-4">
          <div className="space-y-4">
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

            {isNavigating ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="font-medium">Currently navigating</p>
                  <p className="text-sm text-gray-600">From: {startPoint}</p>
                  <p className="text-sm text-gray-600">To: {endPoint}</p>
                  <p className="mt-2 font-medium">{routePoints[currentPosition]}</p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${(currentPosition / (routePoints.length - 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <Button variant="destructive" onClick={stopNavigation}>
                  Stop Navigation
                </Button>
              </div>
            ) : (
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
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="ml-2"
                        onClick={() => handleUseCurrentLocation("start")}
                        disabled={settingLocation === "start"}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
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
                            {suggestion}
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
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="ml-2"
                        onClick={() => handleUseCurrentLocation("end")}
                        disabled={settingLocation === "end"}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
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
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button className="md:col-span-2" onClick={calculateRoute} disabled={isCalculatingRoute}>
                  <Navigation className="mr-2 h-4 w-4" />
                  {isCalculatingRoute ? "Calculating Route..." : "Start Navigation"}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="relative overflow-hidden" style={{ height }}>
        <div ref={mapRef} className="h-full w-full" />
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p>Loading map...</p>
          </div>
        )}
      </Card>

      <div className="text-xs text-gray-500 text-center">
        Map Legend:
        <span className="inline-flex items-center ml-2 mr-2">
          <span className="w-3 h-3 rounded-full bg-green-500 mr-1"></span> Low Severity
        </span>
        <span className="inline-flex items-center mr-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></span> Medium Severity
        </span>
        <span className="inline-flex items-center">
          <span className="w-3 h-3 rounded-full bg-red-500 mr-1"></span> High Severity
        </span>
      </div>
    </div>
  )
}
