"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import { getApprovedSpeedBreakers, updateSpeedBreaker, deleteSpeedBreaker, type SpeedBreaker } from "@/lib/data-service"
import { ArrowLeft, Pencil, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import LeafletMap from "@/components/leaflet-map"

export default function ManageSpeedBreakers() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [speedBreakers, setSpeedBreakers] = useState<SpeedBreaker[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBreaker, setSelectedBreaker] = useState<SpeedBreaker | null>(null)
  const [editForm, setEditForm] = useState({
    location: "",
    latitude: "",
    longitude: "",
    description: "",
    severity: "medium",
  })

  // Add this state to track the selected location for editing
  const [editMapLocation, setEditMapLocation] = useState<[number, number] | null>(null)

  useEffect(() => {
    loadSpeedBreakers()
  }, [])

  const loadSpeedBreakers = () => {
    setSpeedBreakers(getApprovedSpeedBreakers())
  }

  const handleEdit = (breaker: SpeedBreaker) => {
    setSelectedBreaker(breaker)
    setEditForm({
      location: breaker.location,
      latitude: breaker.latitude.toString(),
      longitude: breaker.longitude.toString(),
      description: breaker.description,
      severity: breaker.severity || "medium",
    })
    setEditMapLocation([breaker.latitude, breaker.longitude])
    setEditDialogOpen(true)
  }

  const handleDelete = (breaker: SpeedBreaker) => {
    setSelectedBreaker(breaker)
    setDeleteDialogOpen(true)
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))

    // If latitude or longitude is changed manually, update the selected location
    if (name === "latitude" || name === "longitude") {
      const lat = name === "latitude" ? Number.parseFloat(value) : Number.parseFloat(editForm.latitude)
      const lng = name === "longitude" ? Number.parseFloat(value) : Number.parseFloat(editForm.longitude)

      if (!isNaN(lat) && !isNaN(lng)) {
        setEditMapLocation([lat, lng])
      }
    }
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    setEditForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }))
    setEditMapLocation([lat, lng])
  }

  const handleSeverityChange = (value: string) => {
    setEditForm((prev) => ({ ...prev, severity: value }))
  }

  const handleEditSubmit = () => {
    if (!selectedBreaker) return

    setIsLoading(true)

    try {
      const updatedBreaker: SpeedBreaker = {
        ...selectedBreaker,
        location: editForm.location,
        latitude: Number.parseFloat(editForm.latitude),
        longitude: Number.parseFloat(editForm.longitude),
        description: editForm.description,
        severity: editForm.severity as "low" | "medium" | "high",
      }

      updateSpeedBreaker(updatedBreaker)
      loadSpeedBreakers()
      setEditDialogOpen(false)

      toast({
        title: "Speed Breaker Updated",
        description: "The speed breaker information has been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating the speed breaker",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConfirm = () => {
    if (!selectedBreaker) return

    setIsLoading(true)

    try {
      deleteSpeedBreaker(selectedBreaker.id)
      loadSpeedBreakers()
      setDeleteDialogOpen(false)

      toast({
        title: "Speed Breaker Deleted",
        description: "The speed breaker has been deleted",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error deleting the speed breaker",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get the appropriate background color for each severity level
  const getSeverityBgColor = (severity: string) => {
    if (editForm.severity === severity) {
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

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Manage Speed Breakers</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Speed Breaker Map</CardTitle>
              <CardDescription>Map showing all speed breaker locations</CardDescription>
            </CardHeader>
            <CardContent>
              <LeafletMap speedBreakers={speedBreakers} height="400px" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Speed Breaker Locations</CardTitle>
              <CardDescription>Edit or remove existing speed breaker data</CardDescription>
            </CardHeader>
            <CardContent>
              {speedBreakers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No speed breakers found</div>
              ) : (
                <div className="space-y-4">
                  {speedBreakers.map((breaker) => (
                    <Card key={breaker.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{breaker.location}</h3>
                            <p className="text-sm text-muted-foreground">
                              Reported on {new Date(breaker.reportedAt).toLocaleDateString()}
                            </p>
                            <p className="mt-2">{breaker.description}</p>
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">Coordinates: </span>
                              {breaker.latitude}, {breaker.longitude}
                            </div>
                            {breaker.severity && (
                              <div className="mt-1">
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded-full text-white ${
                                    breaker.severity === "low"
                                      ? "bg-green-500"
                                      : breaker.severity === "medium"
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                >
                                  {breaker.severity.charAt(0).toUpperCase() + breaker.severity.slice(1)} Severity
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(breaker)}
                              disabled={isLoading}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(breaker)}
                              disabled={isLoading}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Speed Breaker</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="h-[300px] mb-4">
                <LeafletMap
                  speedBreakers={[]}
                  height="300px"
                  clickable={true}
                  onLocationSelect={handleLocationSelect}
                  selectedLocation={editMapLocation}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location Name</Label>
                <Input
                  id="location"
                  name="location"
                  value={editForm.location}
                  onChange={handleEditFormChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="0.0001"
                    value={editForm.latitude}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="0.0001"
                    value={editForm.longitude}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Severity Level</Label>
                <RadioGroup
                  value={editForm.severity}
                  onValueChange={handleSeverityChange}
                  className="flex justify-between"
                >
                  <div
                    className={`flex items-center space-x-2 rounded-md px-4 py-2 border transition-colors ${getSeverityBgColor("low")}`}
                  >
                    <RadioGroupItem value="low" id="edit-low" />
                    <Label htmlFor="edit-low" className={editForm.severity === "low" ? "text-white" : "text-gray-700"}>
                      Low
                    </Label>
                  </div>
                  <div
                    className={`flex items-center space-x-2 rounded-md px-4 py-2 border transition-colors ${getSeverityBgColor("medium")}`}
                  >
                    <RadioGroupItem value="medium" id="edit-medium" />
                    <Label
                      htmlFor="edit-medium"
                      className={editForm.severity === "medium" ? "text-white" : "text-gray-700"}
                    >
                      Medium
                    </Label>
                  </div>
                  <div
                    className={`flex items-center space-x-2 rounded-md px-4 py-2 border transition-colors ${getSeverityBgColor("high")}`}
                  >
                    <RadioGroupItem value="high" id="edit-high" />
                    <Label
                      htmlFor="edit-high"
                      className={editForm.severity === "high" ? "text-white" : "text-gray-700"}
                    >
                      High
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSubmit} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to delete this speed breaker?</p>
              <p className="font-medium mt-2">{selectedBreaker?.location}</p>
              <p className="text-sm text-muted-foreground mt-1">{selectedBreaker?.description}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isLoading}>
                {isLoading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
