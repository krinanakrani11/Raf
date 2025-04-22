"use client"

import { useState, useEffect } from "react"
import type { SpeedBreaker } from "@/lib/data-service"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { MapPin, Navigation, Bell } from "lucide-react"

interface StaticMapProps {
  speedBreakers: SpeedBreaker[]
  height?: string
  width?: string
  showNavigation?: boolean
}

export default function StaticMap({
  speedBreakers,
  height = "500px",
  width = "100%",
  showNavigation = false,
}: StaticMapProps) {
  const [startPoint, setStartPoint] = useState("")
  const [endPoint, setEndPoint] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(0)
  const [nearbyAlert, setNearbyAlert] = useState<SpeedBreaker | null>(null)
  const [routePoints, setRoutePoints] = useState<string[]>([])
  const [mapUrl, setMapUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Generate map URL
  useEffect(() => {
    if (speedBreakers.length === 0) {
      setMapUrl("https://maps.googleapis.com/maps/api/staticmap?center=New+York&zoom=13&size=600x400&maptype=roadmap")
      setIsLoading(false)
      return
    }

    // Calculate center of all speed breakers
    const latSum = speedBreakers.reduce((sum, breaker) => sum + breaker.latitude, 0)
    const lngSum = speedBreakers.reduce((sum, breaker) => sum + breaker.longitude, 0)
    const centerLat = latSum / speedBreakers.length
    const centerLng = lngSum / speedBreakers.length

    // Create marker parameters for each speed breaker
    const markers = speedBreakers
      .map((breaker) => {
        const color =
          breaker.severity === "low"
            ? "green"
            : breaker.severity === "medium"
              ? "yellow"
              : breaker.severity === "high"
                ? "red"
                : "blue"

        return `markers=color:${color}|label:S|${breaker.latitude},${breaker.longitude}`
      })
      .join("&")

    // Construct the URL
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=13&size=600x400&maptype=roadmap&${markers}`

    setMapUrl(url)
    setIsLoading(false)
  }, [speedBreakers])

  // Simulate navigation
  const startNavigation = () => {
    if (!startPoint || !endPoint) {
      alert("Please enter both start and end points")
      return
    }

    // Generate simulated route points
    const simulatedRoute = generateSimulatedRoute()
    setRoutePoints(simulatedRoute)
    setCurrentPosition(0)
    setIsNavigating(true)

    // Start moving along the route
    const interval = setInterval(() => {
      setCurrentPosition((prev) => {
        const newPosition = prev + 1

        // Check if we're approaching a speed breaker (within 100m)
        const nearbyBreaker = checkForNearbyBreakers(newPosition, simulatedRoute)
        setNearbyAlert(nearbyBreaker)

        // End navigation when we reach the end
        if (newPosition >= simulatedRoute.length - 1) {
          clearInterval(interval)
          setTimeout(() => {
            setIsNavigating(false)
            setNearbyAlert(null)
          }, 2000)
        }

        return newPosition < simulatedRoute.length ? newPosition : 0
      })
    }, 1000) // Move every second

    return () => clearInterval(interval)
  }

  // Generate simulated route points
  const generateSimulatedRoute = () => {
    // Create a route with 20 points
    return Array.from({ length: 20 }, (_, i) => {
      if (i === 0) return `Starting at ${startPoint}`
      if (i === 19) return `Arriving at ${endPoint}`

      // Add some landmarks along the way
      const landmarks = [
        "Main Street",
        "Park Avenue",
        "Broadway",
        "5th Avenue",
        "Central Park",
        "Downtown",
        "Uptown",
        "River Road",
        "Highway 101",
      ]

      return `Passing ${landmarks[i % landmarks.length]}`
    })
  }

  // Check if we're approaching a speed breaker
  const checkForNearbyBreakers = (position: number, route: string[]): SpeedBreaker | null => {
    // Simulate approaching speed breakers at specific points in the route
    // For demo purposes, we'll place speed breakers at positions 5, 10, and 15
    const breakerPositions = [5, 10, 15]

    // Check if we're 1 position away from a breaker (simulating 100m)
    for (const breakerPos of breakerPositions) {
      if (position === breakerPos - 1 && speedBreakers.length > 0) {
        // Return a random speed breaker from our list
        const randomIndex = Math.floor(Math.random() * speedBreakers.length)
        return speedBreakers[randomIndex]
      }
    }

    return null
  }

  // Stop navigation
  const stopNavigation = () => {
    setIsNavigating(false)
    setNearbyAlert(null)
  }

  return (
    <div className="space-y-4">
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
            <h3 className="font-medium">Navigation</h3>

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
                  <Input
                    id="start-point"
                    placeholder="Enter starting location"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-point">End Point</Label>
                  <Input
                    id="end-point"
                    placeholder="Enter destination"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                  />
                </div>
                <Button className="md:col-span-2" onClick={startNavigation}>
                  <Navigation className="mr-2 h-4 w-4" />
                  Start Navigation
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="relative overflow-hidden" style={{ height, width }}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p>Loading map...</p>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <img
              src={mapUrl || "/placeholder.svg"}
              alt="Map with speed breakers"
              className="w-full h-full object-cover"
              onError={() => {
                // Fallback if the image fails to load
                setMapUrl("/map-fallback.jpg")
              }}
            />
            {isNavigating && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  {nearbyAlert && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                  )}
                </div>
              </div>
            )}
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
