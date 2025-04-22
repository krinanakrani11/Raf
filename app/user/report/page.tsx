"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import { reportSpeedBreaker, getApprovedSpeedBreakers, type SpeedBreaker } from "@/lib/data-service"
import { ArrowLeft, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import LeafletMap from "@/components/leaflet-map"

export default function ReportSpeedBreaker() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [existingBreakers, setExistingBreakers] = useState<SpeedBreaker[]>([])
  const [formData, setFormData] = useState({
    location: "",
    latitude: "",
    longitude: "",
    description: "",
    severity: "medium", // Default to medium severity
  })

  // Add this state to track the selected location marker
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null)

  useEffect(() => {
    // Load existing speed breakers for the map
    setExistingBreakers(getApprovedSpeedBreakers())

    // Set selected location from form data if available
    const lat = Number.parseFloat(formData.latitude)
    const lng = Number.parseFloat(formData.longitude)

    if (!isNaN(lat) && !isNaN(lng)) {
      setSelectedLocation([lat, lng])
    }
  }, [])

  // Update the handleChange function to also update the selected location
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // If latitude or longitude is changed manually, update the selected location
    if (name === "latitude" || name === "longitude") {
      const lat = name === "latitude" ? Number.parseFloat(value) : Number.parseFloat(formData.latitude)
      const lng = name === "longitude" ? Number.parseFloat(value) : Number.parseFloat(formData.longitude)

      if (!isNaN(lat) && !isNaN(lng)) {
        setSelectedLocation([lat, lng])
      }
    }
  }

  // Handle map click to set location
  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }))
    setSelectedLocation([lat, lng])
  }

  // Replace the getCurrentLocation function with this improved version
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      })
      return
    }

    setIsGettingLocation(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        setFormData((prev) => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }))

        // Set the selected location for the map marker
        setSelectedLocation([lat, lng])

        setIsGettingLocation(false)

        toast({
          title: "Location Retrieved",
          description: "Your current location has been added to the form",
        })
      },
      (error) => {
        setIsGettingLocation(false)

        let errorMessage = "Failed to get your location"
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location services."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable."
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out."
            break
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!user) return

      reportSpeedBreaker({
        location: formData.location,
        latitude: Number.parseFloat(formData.latitude),
        longitude: Number.parseFloat(formData.longitude),
        description: formData.description,
        reportedBy: user.id,
        severity: formData.severity,
      })

      toast({
        title: "Report Submitted",
        description: "Your speed breaker report has been submitted for review",
      })

      router.push("/user/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error submitting your report",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get the appropriate background color for each severity level
  const getSeverityBgColor = (severity: string) => {
    if (formData.severity === severity) {
      switch (severity) {
        case "low":
          return "bg-green-500 text-white border-green-500"
        case "medium":
          return "bg-yellow-500 text-white border-yellow-500"
        case "high":
          return "bg-red-500 text-white border-red-500"
      }
    }
    return "bg-white text-gray-700 border-gray-300"
  }

  // Create a temporary speed breaker object for the map preview
  const previewBreaker: SpeedBreaker = {
    id: "preview",
    location: formData.location || "New Speed Breaker",
    latitude: Number.parseFloat(formData.latitude) || 0,
    longitude: Number.parseFloat(formData.longitude) || 0,
    description: formData.description || "Preview",
    reportedBy: user?.id || "",
    reportedAt: new Date().toISOString(),
    status: "pending",
    severity: formData.severity as "low" | "medium" | "high",
  }

  // Only show the preview if we have valid coordinates
  const mapBreakers = [
    ...existingBreakers,
    ...(formData.latitude &&
    formData.longitude &&
    !isNaN(Number.parseFloat(formData.latitude)) &&
    !isNaN(Number.parseFloat(formData.longitude))
      ? [previewBreaker]
      : []),
  ]

  const handleSeverityChange = (value: string) => {
    setFormData((prev) => ({ ...prev, severity: value }))
  }

  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-orange-50">
        <header className="bg-orange-500 text-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-2">
            <Link href="/user/dashboard">
              <Button variant="ghost" size="icon" className="text-white hover:bg-orange-600">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Report Speed Breaker</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white p-4 rounded-md shadow-sm">
              <h3 className="font-medium mb-2">Location Map</h3>
              <p className="text-sm text-gray-500 mb-4">
                Existing speed breakers are shown on the map. Click on the map to set the location or use the GPS
                button.
              </p>
              <div className="h-[300px] mb-4">
                <LeafletMap
                  speedBreakers={mapBreakers}
                  height="300px"
                  clickable={true}
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={selectedLocation}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-gray-700">
                  Latitude *
                </Label>
                <Input
                  id="latitude"
                  name="latitude"
                  placeholder="Enter latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-gray-700">
                  Longitude *
                </Label>
                <Input
                  id="longitude"
                  name="longitude"
                  placeholder="Enter longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  required
                  className="bg-white"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2 py-3"
            >
              <MapPin className="h-5 w-5" />
              {isGettingLocation ? (
                <>
                  <span className="animate-pulse">Accessing GPS...</span>
                </>
              ) : (
                <>Get Current Location Using GPS</>
              )}
            </Button>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-gray-700">
                Location Description *
              </Label>
              <Input
                id="location"
                name="location"
                placeholder="Enter location details (e.g., Near XYZ Mall)"
                value={formData.location}
                onChange={handleChange}
                required
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700">
                Description *
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the speed breaker"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Severity Level</Label>
              <RadioGroup
                value={formData.severity}
                onValueChange={handleSeverityChange}
                className="flex justify-between"
              >
                <div
                  className={cn(
                    "flex items-center space-x-2 rounded-md px-4 py-2 border transition-colors",
                    getSeverityBgColor("low"),
                  )}
                >
                  <RadioGroupItem value="low" id="low" className="text-white" />
                  <Label htmlFor="low" className={formData.severity === "low" ? "text-white" : "text-gray-700"}>
                    Low
                  </Label>
                </div>
                <div
                  className={cn(
                    "flex items-center space-x-2 rounded-md px-4 py-2 border transition-colors",
                    getSeverityBgColor("medium"),
                  )}
                >
                  <RadioGroupItem value="medium" id="medium" className="text-white" />
                  <Label htmlFor="medium" className={formData.severity === "medium" ? "text-white" : "text-gray-700"}>
                    Medium
                  </Label>
                </div>
                <div
                  className={cn(
                    "flex items-center space-x-2 rounded-md px-4 py-2 border transition-colors",
                    getSeverityBgColor("high"),
                  )}
                >
                  <RadioGroupItem value="high" id="high" className="text-white" />
                  <Label htmlFor="high" className={formData.severity === "high" ? "text-white" : "text-gray-700"}>
                    High
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <span className="mr-2">→</span>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  )
}
