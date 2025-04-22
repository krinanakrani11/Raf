"use client"

import { useEffect, useState, useRef } from "react"
import type { SpeedBreaker } from "@/lib/data-service"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { MapPin, Navigation, Bell } from "lucide-react"

interface SimplifiedMapProps {
  speedBreakers: SpeedBreaker[]
  height?: string
  showNavigation?: boolean
}

export default function SimplifiedMap({ speedBreakers, height = "500px", showNavigation = false }: SimplifiedMapProps) {
  const [message, setMessage] = useState("Loading map view...")
  const [startPoint, setStartPoint] = useState("")
  const [endPoint, setEndPoint] = useState("")
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(0)
  const [nearbyAlert, setNearbyAlert] = useState<SpeedBreaker | null>(null)
  const [routePoints, setRoutePoints] = useState<string[]>([])
  const navigationInterval = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Set a timeout to simulate map loading
    const timer = setTimeout(() => {
      if (speedBreakers.length > 0) {
        setMessage(`${speedBreakers.length} speed breakers loaded. Map view is simplified.`)
      } else {
        setMessage("No speed breakers found. Map view is simplified.")
      }
    }, 1000)

    // Create audio element for alerts
    audioRef.current = new Audio("/alert.mp3")

    return () => {
      clearTimeout(timer)
      if (navigationInterval.current) {
        clearInterval(navigationInterval.current)
      }
    }
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
    if (navigationInterval.current) {
      clearInterval(navigationInterval.current)
    }

    navigationInterval.current = setInterval(() => {
      setCurrentPosition((prev) => {
        const newPosition = prev + 1

        // Check if we're approaching a speed breaker (within 100m)
        const nearbyBreaker = checkForNearbyBreakers(newPosition, simulatedRoute)
        setNearbyAlert(nearbyBreaker)

        if (nearbyBreaker && audioRef.current) {
          audioRef.current.play().catch((e) => console.error("Could not play alert sound:", e))
        }

        // End navigation when we reach the end
        if (newPosition >= simulatedRoute.length - 1) {
          if (navigationInterval.current) {
            clearInterval(navigationInterval.current)
          }
          setTimeout(() => {
            setIsNavigating(false)
            setNearbyAlert(null)
          }, 2000)
        }

        return newPosition < simulatedRoute.length ? newPosition : 0
      })
    }, 1000) // Move every second
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
    if (navigationInterval.current) {
      clearInterval(navigationInterval.current)
    }
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
            You are approaching a speed breaker in 100 meters: {nearbyAlert.location}(
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

      <Card className="relative overflow-hidden" style={{ height }}>
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium">Simplified Map View</h3>
            <p className="text-gray-500">{message}</p>

            {isNavigating && (
              <div className="mt-4 max-w-md mx-auto">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    {nearbyAlert && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {speedBreakers.length > 0 && !isNavigating && (
              <div className="mt-4 max-w-md mx-auto">
                <div className="grid grid-cols-3 gap-2">
                  {speedBreakers.slice(0, 9).map((breaker) => {
                    const bgColor =
                      breaker.severity === "low"
                        ? "bg-green-100 border-green-500"
                        : breaker.severity === "medium"
                          ? "bg-yellow-100 border-yellow-500"
                          : breaker.severity === "high"
                            ? "bg-red-100 border-red-500"
                            : "bg-blue-100 border-blue-500"

                    return (
                      <div
                        key={breaker.id}
                        className={`p-2 rounded border ${bgColor} text-xs`}
                        title={`${breaker.location}: ${breaker.description}`}
                      >
                        {breaker.location.substring(0, 15)}
                        {breaker.location.length > 15 ? "..." : ""}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
